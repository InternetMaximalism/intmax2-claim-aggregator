import {
  ClaimStatus,
  type DirectWithdrawalQueuedEventLog,
  type DirectWithdrawalSuccessedEventLog,
  type WithdrawalEventLog,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import type { WatcherEventType } from "../types";

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
      previousStatus: ClaimStatus.verified,
      nextStatus: ClaimStatus.relayed,
      eventType: "DirectWithdrawalQueued" as const,
    },
    {
      events: directWithdrawalSuccesses,
      previousStatus: ClaimStatus.relayed,
      nextStatus: ClaimStatus.success,
      eventType: "DirectWithdrawalSuccessed" as const,
    },
  ].filter(({ events }) => events.length > 0);

  const transactions = updateOperations.flatMap((params) => createUpdateTransactions(params));

  if (transactions.length === 0) {
    logger.info("No claim status to update");
    return;
  }

  await withdrawalPrisma.$transaction(transactions);
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

  if (eventType === "DirectWithdrawalQueued") {
    return events.map((event) => {
      const whereClause = getWhereClause(event, previousStatus);
      const updateData = getUpdateData(event, baseData, eventType);

      return withdrawalPrisma.claim.updateMany({
        where: whereClause,
        data: updateData,
      });
    });
  }

  return withdrawalPrisma.claim.updateMany({
    where: {
      withdrawalHash: {
        in: events.map((event) => event.withdrawalHash.toLowerCase()),
      },
      status: previousStatus,
    },
    data: baseData,
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
  return "withdrawalHash" in event && "recipient" in event;
};

const getWhereClause = (
  event: DirectWithdrawalQueuedEventLog | DirectWithdrawalSuccessedEventLog,
  previousStatus: ClaimStatus,
) => {
  if (isDirectWithdrawalQueuedEventLog(event)) {
    return {
      recipient: event.recipient.toLowerCase(),
      status: previousStatus,
    };
  }

  if (isDirectWithdrawalSuccessedEventLog(event)) {
    return {
      withdrawalHash: event.withdrawalHash.toLocaleLowerCase(),
      status: previousStatus,
    };
  }

  throw new Error(`Unsupported event type: ${JSON.stringify(event)}`);
};

const getUpdateData = (
  event: DirectWithdrawalQueuedEventLog | DirectWithdrawalSuccessedEventLog,
  baseData: { status: ClaimStatus },
  eventType: WatcherEventType,
) => {
  if (eventType === "DirectWithdrawalQueued" && "withdrawal" in event) {
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
