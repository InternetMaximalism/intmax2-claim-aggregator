import {
  BLOCK_RANGE_MINIMUM,
  CLAIM_CONTRACT_ADDRESS,
  CLAIM_CONTRACT_DEPLOYED_BLOCK_NUMBER,
  ClaimAbi,
  type ContributionRecordedEvent,
  claimSchema,
  contributionRecordedEvent,
  fetchEvents,
  logger,
  SubmitContractClaim,
  sleep,
  validateBlockRange,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { eq } from "drizzle-orm";
import { decodeFunctionData, type PublicClient } from "viem";
import { BATCH_SIZE, BATCH_SLEEP_TIME } from "../constants";
import { getLastProcessedBlockNumberByEventName } from "../lib/event";
import type { ClaimTransactions, NetworkState } from "../types";

export const processClaimPeriodUpdates = async (
  { l2Client, scrollCurrentBlockNumber }: NetworkState,
  events: { name: string; lastBlockNumber: bigint }[],
) => {
  const startBlockNumber = getLastProcessedBlockNumberByEventName(
    events,
    "ClaimWatcherDirectWithdrawalQueued",
    CLAIM_CONTRACT_DEPLOYED_BLOCK_NUMBER,
  );

  const contributionEvents = await getContributionRecordedEvents(
    l2Client,
    startBlockNumber,
    scrollCurrentBlockNumber,
  );
  const uniqueTransactionHashes = Array.from(
    new Set<string>(contributionEvents.map(({ transactionHash }) => transactionHash)),
  );
  const processedClaimTransactions = await parseClaimTransactions(
    l2Client,
    uniqueTransactionHashes,
  );

  const transactionsWithPeriod = processedClaimTransactions.map((transaction) => {
    const matchingEvent = contributionEvents.find(
      (event) => event.transactionHash === transaction.txHash,
    );

    if (!matchingEvent) {
      throw new Error(
        `No corresponding contribution event found for transaction: ${transaction.txHash}`,
      );
    }

    return {
      ...transaction,
      period: matchingEvent.args.period,
    };
  });

  const allNullifiersWithPeriod = transactionsWithPeriod.flatMap(({ txArgs, period }) =>
    txArgs.map(({ nullifier }) => ({ nullifier, period })),
  );

  await withdrawalDB.transaction(async (tx) => {
    for (const { nullifier, period } of allNullifiersWithPeriod) {
      await tx
        .update(claimSchema)
        .set({
          period: Number(period),
        })
        .where(eq(claimSchema.nullifier, nullifier))
        .execute();
    }
  });
};

const getContributionRecordedEvents = async (
  scrollClient: PublicClient,
  startBlockNumber: bigint,
  endBlockNumber: bigint,
) => {
  try {
    validateBlockRange("contributionRecordedEvent", startBlockNumber, endBlockNumber);

    const contributionRecordedEvents = await fetchEvents<ContributionRecordedEvent>(scrollClient, {
      startBlockNumber,
      endBlockNumber,
      blockRange: BLOCK_RANGE_MINIMUM,
      contractAddress: CLAIM_CONTRACT_ADDRESS,
      eventInterface: contributionRecordedEvent,
    });

    return contributionRecordedEvents;
  } catch (error) {
    logger.error(
      `Error fetching contributionRecordedEvent: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};

const parseClaimTransactions = async (scrollClient: PublicClient, txHashes: string[]) => {
  const processedClaimTransactions: ClaimTransactions[] = [];

  for (let i = 0; i < txHashes.length; i += BATCH_SIZE) {
    const batch = txHashes.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await Promise.all(
        batch.map(async (hash) => {
          const { input: transactionInput } = await scrollClient.getTransaction({
            hash: hash as `0x${string}`,
          });

          const { functionName, args } = decodeFunctionData({
            abi: ClaimAbi,
            data: transactionInput,
          });

          if (functionName === "migrateContributions") {
            return null;
          }

          return {
            txHash: hash,
            txArgs: args![0] as SubmitContractClaim[],
          };
        }),
      );

      const filteredResults = batchResults.filter(
        (result): result is ClaimTransactions => result !== null,
      );

      processedClaimTransactions.push(...filteredResults);

      if (i + BATCH_SIZE < txHashes.length) {
        await sleep(BATCH_SLEEP_TIME);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(message);
      throw error;
    }
  }

  return processedClaimTransactions;
};
