import {
  BLOCK_RANGE_MINIMUM,
  type ContributionRecordedEvent,
  type Event,
  contributionRecordedEvent,
  fetchEvents,
  getStartBlockNumber,
  logger,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import type { PublicClient } from "viem";
import { CLAIM_CONTRACT_ADDRESS, CLAIM_CONTRACT_DEPLOYED_BLOCK } from "../constants";

export const getContributionRecordedEvents = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  lastProcessedEvent: Event | null,
) => {
  try {
    const startBlockNumber = getStartBlockNumber(lastProcessedEvent, CLAIM_CONTRACT_DEPLOYED_BLOCK);
    validateBlockRange("contributionRecordedEvent", startBlockNumber, currentBlockNumber);

    const contributionRecordedEvents = await fetchEvents<ContributionRecordedEvent>(
      ethereumClient,
      {
        startBlockNumber,
        endBlockNumber: currentBlockNumber,
        blockRange: BLOCK_RANGE_MINIMUM,
        contractAddress: CLAIM_CONTRACT_ADDRESS,
        eventInterface: contributionRecordedEvent,
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

  return {
    period: Array.from(periodSet)[0],
    users: Array.from(recipientSet),
  };
};
