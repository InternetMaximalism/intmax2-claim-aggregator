import {
  ClaimStatus,
  type RequestingClaim,
  getWalletClient,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import { formatContractWithdrawal, getLastClaimHashFromClaimProofs } from "../lib/utils";
import type { ClaimProof, ClaimWithProof, GnarkProof } from "../types";
import {
  generateClaimGnarkProof,
  generateClaimProofs,
  generateClaimWrappedProof,
} from "./proof.service";
import { submitClaimProof } from "./submit.service";

export const processClaimGroup = async (requestingClaims: RequestingClaim[]) => {
  const walletClientData = getWalletClient("withdrawal", "scroll");

  const claims = await fetchClaimsWithProofs(requestingClaims);
  const claimProofs = await generateClaimProofs(claims);
  const claimWrappedProof = await generateClaimWrappedProof(claimProofs, walletClientData);
  const claimGnarkProof = await generateClaimGnarkProof(claimWrappedProof);

  await submitClaimProofToScroll(walletClientData, claimProofs, claimGnarkProof);
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
      `Some requested claims were not found or not in requested status requested: ${requestingClaimUUIDs.length} found: ${claims.length}`,
    );
  }

  return claims as unknown as ClaimWithProof[];
};

const submitClaimProofToScroll = async (
  walletClientData: ReturnType<typeof getWalletClient>,
  claimProofs: ClaimProof[],
  claimGnarkProof: GnarkProof,
) => {
  const lastClaimHash = getLastClaimHashFromClaimProofs(claimProofs);
  const claimAggregator = walletClientData.account.address;

  const params = {
    contractWithdrawals: claimProofs.map(formatContractWithdrawal),
    publicInputs: {
      lastClaimHash,
      claimAggregator,
    },
    proof: `0x${claimGnarkProof.proof}`,
  };

  await submitClaimProof(walletClientData, params);
};
