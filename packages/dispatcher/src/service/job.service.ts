import { createNetworkClient, eventPrisma, logger } from "@intmax2-claim-aggregator/shared";
import { PeriodBlockInterval } from "../types";
import { getContributionParams, getContributionRecordedEvents } from "./event.service";
import { getPeriodBlockIntervals } from "./period.service";
import { relayClaims } from "./submit.service";

export const performJob = async () => {
  const ethereumClient = createNetworkClient("scroll");
  const lastProcessedPeriod = await eventPrisma.claimPeriod.findFirst({
    orderBy: {
      period: "desc",
    },
  });

  const periodBlockIntervals = await getPeriodBlockIntervals(ethereumClient, lastProcessedPeriod);

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

  for (const batchRecipients of contributionParams.batchRecipients) {
    await relayClaims(ethereumClient, {
      period: contributionParams.period,
      recipients: batchRecipients,
    });
  }

  return contributionParams.batchRecipients
    .map((batchRecipient) => batchRecipient.length)
    .reduce((a, b) => a + b, 0);
};

const saveClaimPeriod = async (
  { periodInfo: { period }, startBlockNumber, endBlockNumber }: PeriodBlockInterval,
  recipientCount: number,
) => {
  return eventPrisma.claimPeriod.create({
    data: {
      period,
      startBlockNumber,
      endBlockNumber,
      recipientCount,
    },
  });
};
