import {
  ClaimStatus,
  type DirectWithdrawalQueuedEventLog,
  type DirectWithdrawalSuccessedEventLog,
  type WithdrawalEventLog,
  claimSchema,
  logger,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { TransactionType, WatcherEventType } from "../types";

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

  const transactions = updateOperations.flatMap((params) => createUpdateTransactions(params));

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

const createUpdateTransactions = ({
  events,
  previousStatus,
  nextStatus,
  eventType,
}: UpdateClaimStatusParams) => {
  // NOTE: DirectWithdrawalSuccess is applied to the data that was stored in the claim table.
  logger.info(`Batch update claim status: ${nextStatus} for ${events.length} ${eventType} claims`);

  const baseData = { status: nextStatus };

  if (eventType === "ClaimWatcherDirectWithdrawalQueued") {
    return events.map((event) => {
      const whereClause = getWhereClause(event, previousStatus);
      const updateData = getUpdateData(event, baseData, eventType);

      return async (tx: TransactionType) => {
        await tx.update(claimSchema).set(updateData).where(whereClause).execute();
      };
    });
  }

  return async (tx: TransactionType) => {
    await tx
      .update(claimSchema)
      .set(baseData)
      .where(
        and(
          inArray(
            claimSchema.withdrawalHash,
            events.map((event) => event.withdrawalHash.toLowerCase()),
          ),
          eq(claimSchema.status, previousStatus),
        ),
      );
  };
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

const getWhereClause = (
  event: DirectWithdrawalQueuedEventLog | DirectWithdrawalSuccessedEventLog,
  previousStatus: ClaimStatus,
) => {
  if (isDirectWithdrawalQueuedEventLog(event)) {
    return and(
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
