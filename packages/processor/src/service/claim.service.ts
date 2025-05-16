import {
  type RequestingClaim,
  claimSchema,
  getWalletClient,
  logger,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { and, eq, inArray } from "drizzle-orm";
import { formatContractClaim, getLastClaimHashFromClaimProofs } from "../lib/utils";
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

  return submitClaimProofToScroll(walletClientData, claimProofs, claimGnarkProof);
};

const fetchClaimsWithProofs = async (requestingClaims: RequestingClaim[]) => {
  const requestingClaimUUIDs = requestingClaims.map((claim) => claim.uuid);

  const claims = await withdrawalDB
    .select({
      uuid: claimSchema.uuid,
      singleClaimProof: claimSchema.singleClaimProof,
      withdrawalHash: claimSchema.withdrawalHash,
    })
    .from(claimSchema)
    .where(
      and(inArray(claimSchema.uuid, requestingClaimUUIDs), eq(claimSchema.status, "requested")),
    );
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
    contractClaims: claimProofs.map(formatContractClaim),
    publicInputs: {
      lastClaimHash,
      claimAggregator,
    },
    proof: `0x${claimGnarkProof.proof}`,
  };

  const receipt = await submitClaimProof(walletClientData, params);
  return receipt.hash;
};
