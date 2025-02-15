import {
  CLAIM_CONTRACT_ADDRESS,
  ClaimAbi,
  type ClaimPeriod,
  createNetworkClient,
  getBlockNumberByTimestamp,
  logger,
  sleep,
} from "@intmax2-claim-aggregator/shared";
import { getContract } from "viem";
import type { AllocationConstants, PeriodBlockInterval, PeriodInfo } from "../types";

const BATCH_SIZE = 2;
const BATCH_DELAY = 1000;

export const getPeriodBlockIntervals = async (
  ethereumClient: ReturnType<typeof createNetworkClient>,
  lastClaimPeriod: ClaimPeriod | null,
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

  return { currentPeriod, allocationConstants };
};

const shouldSkipProcessing = (currentPeriod: bigint, lastClaimPeriod: ClaimPeriod | null) => {
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
  lastClaimPeriod: ClaimPeriod | null,
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
  const startBlockNumber = await getBlockNumberByTimestamp(
    "scroll",
    Number(periodInfo.startTime),
    "after",
  );
  const endBlockNumber = await getBlockNumberByTimestamp(
    "scroll",
    Number(periodInfo.endTime),
    "before",
  );
  return {
    periodInfo,
    startBlockNumber,
    endBlockNumber,
  };
};

const processPeriodsInBatches = async (periods: PeriodInfo[]) => {
  const results: PeriodBlockInterval[] = [];

  for (let i = 0; i < periods.length; i += BATCH_SIZE) {
    const batch = periods.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((period) => getBlockNumberRange(period)));
    results.push(...batchResults);

    if (i + BATCH_SIZE < periods.length) {
      await sleep(BATCH_DELAY);
    }
  }

  return results;
};
