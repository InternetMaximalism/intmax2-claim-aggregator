import {
  ClaimStatus,
  type RequestingClaim,
  getWalletClient,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import { formatContractWithdrawal, getLastClaimHashFromClaimProofs } from "../lib/utils";
import type { ClaimProof, ClaimWithProof, GnarkProof } from "../types";
import { generateClaimProofs, generateGnarkProof, generateWrappedProof } from "./proof.service";
import { submitClaimProof } from "./submit.service";

export const processClaimGroup = async (requestingClaims: RequestingClaim[]) => {
  const walletClientData = getWalletClient("withdrawal", "scroll");

  const claims = await fetchClaimsWithProofs(requestingClaims);
  const claimProofs = await generateClaimProofs(claims);
  const wrappedProof = await generateWrappedProof(claimProofs, walletClientData);
  const gnarkProof = await generateGnarkProof(wrappedProof);

  await submitClaimProofToScroll(claimProofs, gnarkProof, walletClientData);
};

const fetchClaimsWithProofs = async (requestingClaims: RequestingClaim[]) => {
  const requestingClaimUUIDs = requestingClaims.map((claim) => claim.uuid);

  const claims = await withdrawalPrisma.claim.findMany({
    select: {
      uuid: true,
      singleClaimProof: true,
      withdrawalHash: true,
    },
    where: {
      uuid: {
        in: requestingClaimUUIDs,
      },
      status: ClaimStatus.requested,
    },
  });

  if (claims.length !== requestingClaimUUIDs.length) {
    logger.warn(
      `Some requested claims were not found or not in REQUESTED status requested: ${requestingClaimUUIDs.length} found: ${claims.length}`,
    );
  }

  return claims as unknown as ClaimWithProof[];
};

const submitClaimProofToScroll = async (
  claimProofs: ClaimProof[],
  gnarkProof: GnarkProof,
  walletClientData: ReturnType<typeof getWalletClient>,
) => {
  const lastClaimHash = getLastClaimHashFromClaimProofs(claimProofs);
  const claimAggregator = walletClientData.account.address;

  const params = {
    contractWithdrawals: claimProofs.map(formatContractWithdrawal),
    publicInputs: {
      lastClaimHash,
      claimAggregator,
    },
    proof: `0x${gnarkProof.proof}`,
  };

  await submitClaimProof(params, walletClientData);
};
