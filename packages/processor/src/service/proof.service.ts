import {
  bytesToBase64,
  getRandomString,
  getWalletClient,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { DEFAULT_ID_LENGTH } from "../constants";
import { pollClaimGnarkProof, pollClaimProof, pollClaimWrapperProof } from "../lib/poll";
import { createClaimGnarkProof, createClaimProof, createClaimWrappedProof } from "../lib/zkp";
import type { ClaimProof, ClaimWithProof } from "../types";

export const generateClaimProofs = async (claims: ClaimWithProof[]) => {
  const claimProofs: ClaimProof[] = [];

  for (const [index, claim] of claims.entries()) {
    const { uuid, singleClaimProof } = claim;
    if (!singleClaimProof) {
      throw new Error(`Missing single claim proof for claim ${uuid}`);
    }

    logger.info(`Generating proof for claim ${index + 1}/${claims.length}`, { uuid });

    try {
      const prevClaimProof = index > 0 ? claimProofs[index - 1].proof : null;
      await createClaimProof(uuid, bytesToBase64(singleClaimProof), prevClaimProof);

      const result = await pollClaimProof(uuid);
      if (!result.proof) {
        throw new Error(`Failed to generate proof for claim ${uuid}`);
      }

      logger.debug(`Successfully generated proof for claim ${uuid}`);

      claimProofs.push(result.proof);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate proof for claim ${uuid} - ${message}`);
      throw error;
    }
  }

  return claimProofs;
};

export const generateClaimWrappedProof = async (
  claimProofs: ClaimProof[],
  walletClientData: ReturnType<typeof getWalletClient>,
) => {
  if (claimProofs.length === 0) {
    throw new Error("No claim proofs available to generate Wrapped proof");
  }

  const lastClaimProof = claimProofs[claimProofs.length - 1].proof;
  const wrapperId = getRandomString(DEFAULT_ID_LENGTH);

  try {
    logger.info("Generating wrapped proof", { wrapperId });

    await createClaimWrappedProof(wrapperId, walletClientData.account.address, lastClaimProof);

    const wrappedResult = await pollClaimWrapperProof(wrapperId, {
      maxAttempts: 30,
      intervalMs: 10_000,
    });
    if (!wrappedResult.proof) {
      throw new Error("Failed to generate wrapper proof");
    }

    logger.debug(`Successfully generated wrapped proof ${wrapperId}`);

    return wrappedResult.proof;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate wrapped proof ${wrapperId} - ${message}`);
    throw error;
  }
};

export const generateClaimGnarkProof = async (wrappedProof: string) => {
  let jobId: string;
  try {
    logger.info("Generating gnark proof");

    const createGnarkResult = await createClaimGnarkProof(wrappedProof);
    if (!createGnarkResult.jobId) {
      throw new Error("Failed to create Gnark proof job");
    }
    jobId = createGnarkResult.jobId;

    const gnarkResult = await pollClaimGnarkProof(jobId, {
      maxAttempts: 30,
      intervalMs: 10_000,
    });

    if (!gnarkResult.proof) {
      throw new Error("Failed to generate Gnark proof");
    }

    logger.debug(`Successfully generated gnark proof`);

    return gnarkResult.proof;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate gnark proof - ${message}`);
    throw error;
  }
};
