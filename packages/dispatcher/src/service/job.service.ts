import {
  claimPeriodSchema,
  createNetworkClient,
  eventDB,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { desc } from "drizzle-orm";
import type { PeriodBlockInterval } from "../types";
import { getContributionParams, getContributionRecordedEvents } from "./event.service";
import { getPeriodBlockIntervals } from "./period.service";
import { relayClaims } from "./submit.service";

export const performJob = async () => {
  const ethereumClient = createNetworkClient("scroll");
  const lastProcessedPeriod = await eventDB
    .select({
      period: claimPeriodSchema.period,
    })
    .from(claimPeriodSchema)
    .orderBy(desc(claimPeriodSchema.period))
    .limit(1);

  const periodBlockIntervals = await getPeriodBlockIntervals(
    ethereumClient,
    lastProcessedPeriod[0] ?? null,
  );

  for (const periodBlockInterval of periodBlockIntervals) {
    const recipientCount = await processDispatcher(ethereumClient, periodBlockInterval);
    await saveClaimPeriod(periodBlockInterval, recipientCount);
    logger.info(
      `Processed period ${periodBlockInterval.periodInfo.period} recipientCount: ${recipientCount} successfully.`,
    );
  }
};

const processDispatcher = async (
  ethereumClient: ReturnType<typeof createNetworkClient>,
  periodBlockInterval: PeriodBlockInterval,
) => {
  const contributionRecordedEvents = await getContributionRecordedEvents(
    ethereumClient,
    periodBlockInterval,
  );

  if (contributionRecordedEvents.length === 0) {
    logger.info("No new contribution found.");
    return 0;
  }

  const contributionParams = getContributionParams(contributionRecordedEvents);

  if (contributionParams.period !== periodBlockInterval.periodInfo.period) {
    throw new Error(
      `Period mismatch: ${contributionParams.period} !== ${periodBlockInterval.periodInfo.period}`,
    );
  }

  let totalRecipients = 0;
  for (const batchRecipients of contributionParams.batchRecipients) {
    await relayClaims(ethereumClient, {
      period: contributionParams.period,
      recipients: batchRecipients,
    });
    totalRecipients += batchRecipients.length;
  }

  return totalRecipients;
};

const saveClaimPeriod = async (
  { periodInfo: { period }, startBlockNumber, endBlockNumber }: PeriodBlockInterval,
  recipientCount: number,
) => {
  return eventDB.insert(claimPeriodSchema).values({
    period,
    startBlockNumber,
    endBlockNumber,
    recipientCount,
  });
};
