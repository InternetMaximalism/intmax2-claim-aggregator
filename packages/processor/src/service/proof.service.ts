import {
  bytesToBase64,
  getRandomString,
  getWalletClient,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { DEFAULT_ID_LENGTH } from "../constants";
import { pollGnarkProof, pollWithdrawalProof, pollWithdrawalWrapperProof } from "../lib/poll";
import { createGnarkProof, createWithdrawalProof, createWrappedProof } from "../lib/zkp";
import type { WithdrawalProof, WithdrawalWithProof } from "../types";

export const generateWithdrawalProofs = async (withdrawals: WithdrawalWithProof[]) => {
  const withdrawalProofs: WithdrawalProof[] = [];

  for (const [index, withdrawal] of withdrawals.entries()) {
    const { uuid, singleWithdrawalProof } = withdrawal;
    if (!singleWithdrawalProof) {
      throw new Error(`Missing single withdrawal proof for withdrawal ${uuid}`);
    }

    logger.info(`Generating proof for withdrawal ${index + 1}/${withdrawals.length}`, { uuid });

    try {
      const prevWithdrawalProof = index > 0 ? withdrawalProofs[index - 1].proof : null;
      await createWithdrawalProof(uuid, bytesToBase64(singleWithdrawalProof), prevWithdrawalProof);

      const result = await pollWithdrawalProof(uuid);
      if (!result.proof) {
        throw new Error(`Failed to generate proof for withdrawal ${uuid}`);
      }

      logger.debug(`Successfully generated proof for withdrawal ${uuid}`);

      withdrawalProofs.push(result.proof);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate proof for withdrawal ${uuid} - ${message}`);
      throw error;
    }
  }

  return withdrawalProofs;
};

export const generateWrappedProof = async (
  withdrawalProofs: WithdrawalProof[],
  walletClientData: ReturnType<typeof getWalletClient>,
) => {
  if (withdrawalProofs.length === 0) {
    throw new Error("No withdrawal proofs available to generate Wrapped proof");
  }

  const lastWithdrawalProof = withdrawalProofs[withdrawalProofs.length - 1].proof;
  const wrapperId = getRandomString(DEFAULT_ID_LENGTH);

  try {
    logger.info("Generating wrapped proof", { wrapperId });

    await createWrappedProof(wrapperId, walletClientData.account.address, lastWithdrawalProof);

    const wrappedResult = await pollWithdrawalWrapperProof(wrapperId, {
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

export const generateGnarkProof = async (wrappedProof: string) => {
  let jobId: string;
  try {
    logger.info("Generating gnark proof");

    const createGnarkResult = await createGnarkProof(wrappedProof);
    if (!createGnarkResult.jobId) {
      throw new Error("Failed to create Gnark proof job");
    }
    jobId = createGnarkResult.jobId;

    const gnarkResult = await pollGnarkProof(jobId, {
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
