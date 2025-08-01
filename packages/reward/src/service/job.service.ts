import {
  createNetworkClient,
  eventDB,
  logger,
  rewardPeriodSchema,
} from "@intmax2-claim-aggregator/shared";
import { desc } from "drizzle-orm";
import { parseEther } from "ethers";
import { BlockBuilderRewardContract } from "../lib/blockBuilderRewardContract";
import type { PeriodInfo } from "../types";
import { fetchPendingPeriods } from "./period.service";
import { setReward } from "./reward.service";

export const performJob = async () => {
  const scrollClient = createNetworkClient("scroll");
  const lastProcessedPeriod = await eventDB
    .select({
      period: rewardPeriodSchema.period,
    })
    .from(rewardPeriodSchema)
    .orderBy(desc(rewardPeriodSchema.period))
    .limit(1);

  const pendingPeriodInfos = await fetchPendingPeriods(lastProcessedPeriod[0] ?? null);

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
  const [rewardAlreadySet] = await rewardContract.getReward(periodData.period);

  if (!rewardAlreadySet) {
    await setReward(scrollClient, {
      periodNumber: periodData.period,
      amount: parseEther(String(periodData.totalReward)),
    });
  }
};

const saveRewardPeriod = async ({ period, totalReward }: PeriodInfo) => {
  return eventDB.insert(rewardPeriodSchema).values({
    period,
    totalReward,
  });
};
