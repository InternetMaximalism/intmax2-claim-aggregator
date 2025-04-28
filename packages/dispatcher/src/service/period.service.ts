import {
  CLAIM_CONTRACT_ADDRESS,
  ClaimAbi,
  createNetworkClient,
  getBlockNumberByTimestamp,
  logger,
  sleep,
} from "@intmax2-claim-aggregator/shared";
import { getContract } from "viem";
import { PERIOD_BATCH_DELAY, PERIOD_BATCH_SIZE } from "../constants";
import type { AllocationConstants, PeriodBlockInterval, PeriodInfo } from "../types";

export const getPeriodBlockIntervals = async (
  ethereumClient: ReturnType<typeof createNetworkClient>,
  lastClaimPeriod: { period: bigint } | null,
) => {
  const { currentPeriod, allocationConstants } = await fetchContractData(ethereumClient);

  if (shouldSkipProcessing(currentPeriod, lastClaimPeriod)) {
    return [];
  }

  const unprocessedPeriods = getUnprocessedPeriods(currentPeriod, lastClaimPeriod);
  const periodInfos = calculatePeriodInfos(unprocessedPeriods, allocationConstants);

  return await processPeriodsInBatches(periodInfos);
};

const fetchContractData = async (ethereumClient: ReturnType<typeof createNetworkClient>) => {
  const contract = getContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: ClaimAbi,
    client: ethereumClient,
  });

  const [currentPeriod, allocationConstants] = (await Promise.all([
    contract.read.getCurrentPeriod(),
    contract.read.getAllocationConstants(),
  ])) as [bigint, AllocationConstants];

  logger.debug(
    `currentPeriod: ${currentPeriod} periodInterval: ${allocationConstants.periodInterval} startTimestamp: ${allocationConstants.startTimestamp}`,
  );

  return { currentPeriod, allocationConstants };
};

const shouldSkipProcessing = (
  currentPeriod: bigint,
  lastClaimPeriod: { period: bigint } | null,
) => {
  if (lastClaimPeriod?.period === currentPeriod) {
    logger.info("Current period is already processed.");
    return true;
  }

  if (lastClaimPeriod?.period && lastClaimPeriod.period > currentPeriod) {
    throw new Error(
      `Last claim period is greater than current period. Last claim period: ${lastClaimPeriod.period}, current period: ${currentPeriod}`,
    );
  }

  return false;
};

const getUnprocessedPeriods = (
  currentPeriod: bigint,
  lastClaimPeriod: { period: bigint } | null,
): bigint[] => {
  const startPeriod = lastClaimPeriod?.period ? Number(lastClaimPeriod.period) + 1 : 0;

  return Array.from({ length: Number(currentPeriod) - startPeriod }, (_, i) =>
    BigInt(i + startPeriod),
  );
};

const calculatePeriodInfos = (periods: bigint[], allocationConstants: AllocationConstants) => {
  return periods.map((period) => {
    const startTime =
      allocationConstants.startTimestamp + period * allocationConstants.periodInterval;
    const endTime = startTime + allocationConstants.periodInterval - 1n;

    return { period, startTime, endTime };
  });
};

const getBlockNumberRange = async (periodInfo: PeriodInfo) => {
  const [startBlockNumber, endBlockNumber] = await Promise.all([
    getBlockNumberByTimestamp("scroll", Number(periodInfo.startTime), "after"),
    getBlockNumberByTimestamp("scroll", Number(periodInfo.endTime), "before"),
  ]);
  return {
    periodInfo,
    startBlockNumber,
    endBlockNumber,
  };
};

const processPeriodsInBatches = async (periods: PeriodInfo[]) => {
  const results: PeriodBlockInterval[] = [];

  for (let i = 0; i < periods.length; i += PERIOD_BATCH_SIZE) {
    const batch = periods.slice(i, i + PERIOD_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((period) => getBlockNumberRange(period)));
    results.push(...batchResults);

    if (i + PERIOD_BATCH_SIZE < periods.length) {
      await sleep(PERIOD_BATCH_DELAY);
    }
  }

  return results;
};
