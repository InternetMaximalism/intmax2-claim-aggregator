import { createNetworkClient, eventPrisma, logger } from "@intmax2-claim-aggregator/shared";
import { BlockBuilderRewardContract } from "../lib/blockBuilderRewardContract";
import type { PeriodInfo } from "../types";
import { allowClaim } from "./allow.service";
import { fetchPendingPeriods } from "./period.service";
import { setReward } from "./reward.service";

export const performJob = async () => {
  const scrollClient = createNetworkClient("scroll");
  const lastProcessedPeriod = await eventPrisma.rewardPeriod.findFirst({
    orderBy: {
      period: "desc",
    },
  });
  const pendingPeriodInfos = await fetchPendingPeriods(lastProcessedPeriod);

  for (const periodData of pendingPeriodInfos) {
    await processReward(scrollClient, periodData);
    await saveRewardPeriod(periodData);

    logger.info(
      `Processed period ${periodData.period} totalReward: ${periodData.totalReward} successfully.`,
    );
  }
};

const processReward = async (
  scrollClient: ReturnType<typeof createNetworkClient>,
  periodData: PeriodInfo,
) => {
  const rewardContract = BlockBuilderRewardContract.getInstance();
  const rewardAlreadySet = await rewardContract.isAlreadySetReward(periodData.period);

  if (!rewardAlreadySet) {
    await setReward(scrollClient, {
      periodNumber: periodData.period,
      amount: BigInt(periodData.totalReward),
    });
  }

  await allowClaim(scrollClient, {
    periodNumber: periodData.period,
  });
};

const saveRewardPeriod = async ({ period, totalReward }: PeriodInfo) => {
  return eventPrisma.rewardPeriod.create({
    data: {
      period,
      totalReward,
    },
  });
};
