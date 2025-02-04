import {
  ClaimStatus,
  type WithdrawalEventLog,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import type { WithdrawalEventType } from "../types";

export const batchUpdateWithdrawalStatusTransactions = async (
  claimDirectWithdrawals: WithdrawalEventLog[],
) => {
  const transactions = [];

  if (claimDirectWithdrawals.length > 0) {
    transactions.push(
      batchUpdateWithdrawalStatus(
        claimDirectWithdrawals,
        ClaimStatus.relayed,
        ClaimStatus.success,
        "ClaimDirectWithdrawalSuccessed",
      ),
    );
  }

  if (transactions.length === 0) {
    logger.info("No withdrawal status to update");
  }

  if (transactions.length > 0) {
    await withdrawalPrisma.$transaction(transactions);
  }
};

const batchUpdateWithdrawalStatus = (
  withdrawalEventLogs: WithdrawalEventLog[],
  previousStatus: ClaimStatus,
  nextStatus: ClaimStatus,
  type: WithdrawalEventType,
) => {
  logger.info(
    `Batch update withdrawal status: ${nextStatus} for ${withdrawalEventLogs.length} ${type} withdrawals`,
  );
  const data = {
    status: nextStatus,
    ...(type === "ClaimDirectWithdrawalSuccessed" && {
      singleWithdrawalProof: null,
    }),
  };

  return withdrawalPrisma.claim.updateMany({
    where: {
      withdrawalHash: {
        in: withdrawalEventLogs.map(({ withdrawalHash }) => withdrawalHash),
      },
      // contractWithdrawal
      status: previousStatus,
    },
    data,
  });
};
