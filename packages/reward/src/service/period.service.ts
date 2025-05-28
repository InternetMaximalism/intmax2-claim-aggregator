import { config, logger } from "@intmax2-claim-aggregator/shared";
import { PERIOD_INTERVAL } from "../constant";
import { ContributionContract } from "../lib/contributionContract";
import { calculateReward } from "../lib/reward";
import type { ContractData } from "../types";

export const fetchPendingPeriods = async (lastRewardPeriod: { period: bigint } | null) => {
  const contractData = await ContributionContract.getInstance().fetchContractPeriodData();
  if (shouldSkipProcessing(contractData.currentPeriod, lastRewardPeriod)) {
    return [];
  }

  const pendingPeriods = getPendingPeriods(contractData.currentPeriod, lastRewardPeriod);
  const pendingPeriodInfos = calculatePeriodInfos(pendingPeriods, contractData);
  return pendingPeriodInfos;
};

const shouldSkipProcessing = (
  currentPeriod: bigint,
  lastRewardPeriod: { period: bigint } | null,
) => {
  if (lastRewardPeriod?.period === currentPeriod) {
    logger.info("Current period is already processed.");
    return true;
  }

  if (lastRewardPeriod?.period && lastRewardPeriod.period > currentPeriod) {
    throw new Error(
      `Last reward period is greater than current period. Last reward period: ${lastRewardPeriod.period}, current period: ${currentPeriod}`,
    );
  }

  return false;
};

const getPendingPeriods = (
  currentPeriod: bigint,
  lastRewardPeriod: { period: bigint } | null,
): bigint[] => {
  const startPeriod =
    lastRewardPeriod?.period !== undefined ? Number(lastRewardPeriod.period) + 1 : 0;

  return Array.from({ length: Number(currentPeriod) - startPeriod }, (_, i) =>
    BigInt(i + startPeriod),
  );
};

const calculatePeriodInfos = (periods: bigint[], contractData: ContractData) => {
  return periods.map((period) => {
    const dates = calculatePeriodDates(period, contractData);
    const totalReward = calculateTotalPeriodReward(dates);
    return {
      period,
      dates,
      totalReward,
    };
  });
};

const calculatePeriodDates = (currentPeriod: bigint, contractData: ContractData) => {
  const periodsToProcess = PERIOD_INTERVAL[config.BLOCK_BUILDER_REWARD_TYPE];
  const dates = [];

  const periodStartTimestamp =
    Number(contractData.startTimestamp) +
    Number(currentPeriod) * Number(contractData.periodInterval);
  const periodInterval = Number(contractData.periodInterval) / periodsToProcess;

  for (let i = 0; i < periodsToProcess; i++) {
    const startTimeSeconds = periodStartTimestamp + i * periodInterval;
    const startDate = new Date(startTimeSeconds * 1000);

    dates.push(startDate);
  }

  return dates;
};

const calculateTotalPeriodReward = (dates: Date[]) => {
  const totalReward = dates.reduce((acc, date) => acc + calculateReward(date), 0);
  return totalReward;
};
