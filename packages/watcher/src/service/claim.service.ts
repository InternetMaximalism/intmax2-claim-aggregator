import {
  ClaimStatus,
  type DirectWithdrawalQueuedEventLog,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import type { WatcherEventType } from "../types";

export const batchUpdateClaimStatusTransactions = async (
  directWithdrawalQueues: DirectWithdrawalQueuedEventLog[],
) => {
  const transactions = [];

  if (directWithdrawalQueues.length > 0) {
    transactions.push(
      ...batchUpdateClaimStatus(
        directWithdrawalQueues,
        ClaimStatus.verified,
        ClaimStatus.relayed,
        "DirectWithdrawalQueued",
      ),
    );
  }

  if (transactions.length === 0) {
    logger.info("No claim status to update");
  }

  if (transactions.length > 0) {
    await withdrawalPrisma.$transaction(transactions);
  }
};

const batchUpdateClaimStatus = (
  directWithdrawalQueues: DirectWithdrawalQueuedEventLog[],
  previousStatus: ClaimStatus,
  nextStatus: ClaimStatus,
  type: WatcherEventType,
) => {
  logger.info(
    `Batch update claim status: ${nextStatus} for ${directWithdrawalQueues.length} ${type} claims`,
  );
  const data = {
    status: nextStatus,
    ...(type === "DirectWithdrawalQueued" && {
      singleClaimProof: null,
    }),
  };

  return directWithdrawalQueues.map(({ recipient, withdrawalHash, withdrawal }) => {
    return withdrawalPrisma.claim.updateMany({
      where: {
        recipient: recipient.toLowerCase(),
        status: previousStatus,
      },
      data: {
        ...data,
        withdrawalHash,
        contractWithdrawal: formatWithdrawal(withdrawal),
      },
    });
  });
};

const formatWithdrawal = (withdrawal: DirectWithdrawalQueuedEventLog["withdrawal"]) => {
  return {
    recipient: withdrawal.recipient.toLowerCase(),
    tokenIndex: withdrawal.tokenIndex,
    amount: withdrawal.amount.toString(),
    nullifier: withdrawal.nullifier,
  };
};
