import {
  ClaimStatus,
  type RequestingClaim,
  getWalletClient,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import { formatContractWithdrawal, getLastWithdrawalHashFromWithdrawalProofs } from "../lib/utils";
import type { GnarkProof, WithdrawalProof, WithdrawalWithProof } from "../types";
import {
  generateGnarkProof,
  generateWithdrawalProofs,
  generateWrappedProof,
} from "./proof.service";
import { submitWithdrawalProof } from "./submit.service";

export const processClaimGroup = async (requestingClaims: RequestingClaim[]) => {
  const walletClientData = getWalletClient("withdrawal", "scroll");

  const claims = await fetchWithdrawalsWithProofs(requestingClaims);
  const withdrawalProofs = await generateWithdrawalProofs(claims);
  const wrappedProof = await generateWrappedProof(withdrawalProofs, walletClientData);
  const gnarkProof = await generateGnarkProof(wrappedProof);

  await submitWithdrawalProofToScroll(withdrawalProofs, gnarkProof, walletClientData);
};

const fetchWithdrawalsWithProofs = async (requestingWithdrawals: RequestingClaim[]) => {
  const requestingWithdrawalUUIDs = requestingWithdrawals.map((withdrawal) => withdrawal.uuid);

  const withdrawals = await withdrawalPrisma.withdrawal.findMany({
    select: {
      uuid: true,
      singleWithdrawalProof: true,
      withdrawalHash: true,
    },
    where: {
      uuid: {
        in: requestingWithdrawalUUIDs,
      },
      status: ClaimStatus.requested,
    },
  });

  if (withdrawals.length !== requestingWithdrawalUUIDs.length) {
    logger.warn(
      `Some requested withdrawals were not found or not in REQUESTED status requested: ${requestingWithdrawalUUIDs.length} found: ${withdrawals.length}`,
    );
  }

  return withdrawals as unknown as WithdrawalWithProof[];
};

const submitWithdrawalProofToScroll = async (
  withdrawalProofs: WithdrawalProof[],
  gnarkProof: GnarkProof,
  walletClientData: ReturnType<typeof getWalletClient>,
) => {
  const lastWithdrawalHash = getLastWithdrawalHashFromWithdrawalProofs(withdrawalProofs);
  const withdrawalAggregator = walletClientData.account.address;

  const params = {
    contractWithdrawals: withdrawalProofs.map(formatContractWithdrawal),
    publicInputs: {
      lastWithdrawalHash,
      withdrawalAggregator,
    },
    proof: `0x${gnarkProof.proof}`,
  };

  await submitWithdrawalProof(params, walletClientData);
};
