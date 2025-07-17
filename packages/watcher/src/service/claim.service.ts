import {
  ClaimAbi,
  ClaimStatus,
  claimSchema,
  createNetworkClient,
  type DirectWithdrawalQueuedEventLog,
  type DirectWithdrawalSuccessedEventLog,
  logger,
  sleep,
  type WithdrawalEventLog,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { and, eq } from "drizzle-orm";
import { decodeFunctionData } from "viem";
import { BATCH_SIZE, BATCH_SLEEP_TIME } from "../constants";
import type { RelayClaimTransaction, TransactionType, WatcherEventType } from "../types";

interface UpdateClaimStatusParams {
  events: DirectWithdrawalQueuedEventLog[] | DirectWithdrawalSuccessedEventLog[];
  previousStatus: ClaimStatus;
  nextStatus: ClaimStatus;
  eventType: WatcherEventType;
}

export const batchUpdateClaimStatusTransactions = async (
  directWithdrawalQueues: DirectWithdrawalQueuedEventLog[],
  directWithdrawalSuccesses: DirectWithdrawalSuccessedEventLog[],
) => {
  const updateOperations = [
    {
      events: directWithdrawalQueues,
      previousStatus: "verified" as const,
      nextStatus: "relayed" as const,
      eventType: "ClaimWatcherDirectWithdrawalQueued" as const,
    },
    {
      events: directWithdrawalSuccesses,
      previousStatus: "relayed" as const,
      nextStatus: "success" as const,
      eventType: "ClaimWatcherDirectWithdrawalSuccessed" as const,
    },
  ].filter(({ events }) => events.length > 0);

  const transactionArrays = await Promise.all(
    updateOperations.map((params) => createUpdateTransactions(params)),
  );

  const transactions = transactionArrays.flat();

  if (transactions.length === 0) {
    logger.info("No claim status to update");
    return;
  }

  await withdrawalDB.transaction(async (tx) => {
    for (const transaction of transactions) {
      await transaction(tx);
    }
  });
};

const createUpdateTransactions = async ({
  events,
  previousStatus,
  nextStatus,
  eventType,
}: UpdateClaimStatusParams) => {
  // NOTE: DirectWithdrawalSuccess is applied to the data that was stored in the claim table.
  logger.info(`Batch update claim status: ${nextStatus} for ${events.length} ${eventType} claims`);

  const uniqueTransactionHashes = Array.from(
    new Set<string>(events.map(({ transactionHash }) => transactionHash)),
  );

  const relayClaimTransactions = await getRelayClaimTransactions(
    eventType,
    uniqueTransactionHashes,
  );

  return events.map((event) => {
    const period = findPeriodForTransaction(event.transactionHash, relayClaimTransactions);
    const baseData = { status: nextStatus, l1TxHash: event.transactionHash };
    const whereClause = getWhereClause(event, previousStatus, period);
    const updateData = getUpdateData(event, baseData, eventType);

    return async (tx: TransactionType) => {
      await tx.update(claimSchema).set(updateData).where(whereClause).execute();
    };
  });
};

const isDirectWithdrawalQueuedEventLog = (
  event: WithdrawalEventLog,
): event is DirectWithdrawalQueuedEventLog => {
  return "recipient" in event && "withdrawal" in event;
};

const isDirectWithdrawalSuccessedEventLog = (
  event: WithdrawalEventLog,
): event is DirectWithdrawalSuccessedEventLog => {
  return "recipient" in event && "withdrawalHash" in event;
};

const findPeriodForTransaction = (
  transactionHash: string,
  relayClaimTransactions: RelayClaimTransaction[],
): bigint | null => {
  const transaction = relayClaimTransactions.find((tx) => tx.txHash === transactionHash);
  return transaction?.period || null;
};

const getWhereClause = (
  event: DirectWithdrawalQueuedEventLog | DirectWithdrawalSuccessedEventLog,
  previousStatus: ClaimStatus,
  relayClaimPeriod: bigint | null = null,
) => {
  if (isDirectWithdrawalQueuedEventLog(event)) {
    if (!relayClaimPeriod) {
      throw new Error(
        `Period is required for DirectWithdrawalQueued event. Transaction: ${event.transactionHash}`,
      );
    }

    return and(
      eq(claimSchema.period, Number(relayClaimPeriod)),
      eq(claimSchema.recipient, event.recipient.toLowerCase()),
      eq(claimSchema.status, previousStatus),
    );
  }

  if (isDirectWithdrawalSuccessedEventLog(event)) {
    return and(
      eq(claimSchema.withdrawalHash, event.withdrawalHash.toLowerCase()),
      eq(claimSchema.status, previousStatus),
    );
  }

  throw new Error(`Unsupported event type: ${JSON.stringify(event)}`);
};

const getUpdateData = (
  event: DirectWithdrawalQueuedEventLog | DirectWithdrawalSuccessedEventLog,
  baseData: { status: ClaimStatus },
  eventType: WatcherEventType,
) => {
  if (eventType === "ClaimWatcherDirectWithdrawalQueued" && "withdrawal" in event) {
    return {
      ...baseData,
      singleClaimProof: null,
      withdrawalHash: event.withdrawalHash,
      contractWithdrawal: formatWithdrawal(event.withdrawal),
    };
  }
  return baseData;
};

const formatWithdrawal = (withdrawal: DirectWithdrawalQueuedEventLog["withdrawal"]) => {
  return {
    recipient: withdrawal.recipient.toLowerCase(),
    tokenIndex: withdrawal.tokenIndex,
    amount: withdrawal.amount.toString(),
    nullifier: withdrawal.nullifier,
  };
};

const getRelayClaimTransactions = async (eventType: WatcherEventType, txHashes: string[]) => {
  if (eventType === "ClaimWatcherDirectWithdrawalSuccessed") {
    return [];
  }

  const result = [];
  const scrollClient = createNetworkClient("scroll");

  for (let i = 0; i < txHashes.length; i += BATCH_SIZE) {
    const batch = txHashes.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await Promise.all(
        batch.map(async (hash) => {
          const { input: transactionInput } = await scrollClient.getTransaction({
            hash: hash as `0x${string}`,
          });

          const { args } = decodeFunctionData({
            abi: ClaimAbi,
            data: transactionInput,
          });

          return {
            txHash: hash,
            period: args![0] as bigint,
          };
        }),
      );

      const filteredResults = batchResults.filter(
        (result): result is RelayClaimTransaction => result !== null,
      );

      result.push(...filteredResults);

      if (i + BATCH_SIZE < txHashes.length) {
        await sleep(BATCH_SLEEP_TIME);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(message);
      throw error;
    }
  }

  return result;
};
