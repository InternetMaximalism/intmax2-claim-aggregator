import {
  BLOCK_RANGE_MINIMUM,
  CLAIM_CONTRACT_ADDRESS,
  type ContributionRecordedEvent,
  contributionRecordedEvent,
  fetchEvents,
  logger,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import type { PublicClient } from "viem";
import { MAX_RECIPIENT_BATCH_SIZE } from "../constants";
import type { PeriodBlockInterval } from "../types";

export const getContributionRecordedEvents = async (
  ethereumClient: PublicClient,
  periodBlockInterval: PeriodBlockInterval,
) => {
  try {
    const { periodInfo, startBlockNumber, endBlockNumber } = periodBlockInterval;
    validateBlockRange("contributionRecordedEvent", startBlockNumber, endBlockNumber);

    const contributionRecordedEvents = await fetchEvents<ContributionRecordedEvent>(
      ethereumClient,
      {
        startBlockNumber,
        endBlockNumber,
        blockRange: BLOCK_RANGE_MINIMUM,
        contractAddress: CLAIM_CONTRACT_ADDRESS,
        eventInterface: contributionRecordedEvent,
        args: {
          period: [periodInfo.period],
        },
      },
    );

    return contributionRecordedEvents;
  } catch (error) {
    logger.error(
      `Error fetching contributionRecordedEvent: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};

export const getContributionParams = (contributionRecordedEvents: ContributionRecordedEvent[]) => {
  const periodSet = new Set<bigint>();
  const recipientSet = new Set<string>();

  for (const event of contributionRecordedEvents) {
    periodSet.add(event.args.period);
    recipientSet.add(event.args.recipient);
  }

  if (periodSet.size !== 1) {
    throw new Error(
      `Invalid number of periods found: ${periodSet.size}. Expected exactly 1 period.`,
    );
  }

  const recipients = Array.from(recipientSet);
  const batchRecipients = [];
  for (let i = 0; i < recipients.length; i += MAX_RECIPIENT_BATCH_SIZE) {
    batchRecipients.push(recipients.slice(i, i + MAX_RECIPIENT_BATCH_SIZE));
  }

  return {
    period: Array.from(periodSet)[0],
    batchRecipients,
  };
};
