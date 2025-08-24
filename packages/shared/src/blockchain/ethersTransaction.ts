import { ethers } from "ethers";
import type { PublicClient } from "viem";
import { logger } from "../lib/logger";
import type {
  ContractCallOptionsEthers,
  ContractCallParameters,
  EthersTransactionExecutionParams,
  WaitForTransactionOptions,
} from "../types";

export const getEthersTxOptions = (
  contractCallParams: ContractCallParameters,
  contractCallOptions: ContractCallOptionsEthers,
) => {
  const { functionName, args } = contractCallParams;
  const { nonce, gasPrice, maxFeePerGas, maxPriorityFeePerGas, value } = contractCallOptions ?? {};

  if (gasPrice) {
    logger.info(
      `functionName: ${functionName}, args: ${JSON.stringify(args, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      )} nonce: ${nonce}, gasPrice: ${gasPrice?.toString()} type: 0`,
    );

    return {
      nonce,
      gasPrice,
      type: 0,
    };
  }

  logger.info(
    `functionName: ${functionName}, nonce: ${nonce}, maxFeePerGas: ${maxFeePerGas?.toString()} maxPriorityFeePerGas: ${maxPriorityFeePerGas?.toString()}`,
  );

  return {
    nonce,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ...(value ? { value } : {}),
  };
};

export const executeEthersTransaction = async ({
  functionName,
  contract,
  callArgs,
}: EthersTransactionExecutionParams) => {
  try {
    if (typeof contract[functionName] !== "function") {
      throw new Error(`Method ${functionName} does not exist on contract`);
    }

    const tx = await contract[functionName](...callArgs);

    const transactionHash = tx.hash as `0x${string}`;
    logger.info(`${functionName} transaction initiated with hash: ${transactionHash}`);

    return {
      transactionHash,
      nonce: tx.nonce,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Transaction failed: ${error.message}`);
      throw error;
    } else {
      console.error("An unknown error occurred");
      throw new Error("Unknown transaction error");
    }
  }
};

export const replacedEthersTransaction = async ({
  functionName,
  contract,
  callArgs,
}: EthersTransactionExecutionParams) => {
  logger.warn(`Transaction was replaced. Sending new transaction...`);

  try {
    const transactionResult = await executeEthersTransaction({
      functionName,
      contract,
      callArgs,
    });

    return transactionResult;
  } catch (error) {
    logger.warn(
      `Failed to send replaced transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );

    throw error;
  }
};

const DEFAULT_OPTIONS: Required<WaitForTransactionOptions> = {
  confirms: 1,
  timeout: 30_000,
};

export const ethersWaitForTransactionConfirmation = async (
  publicClient: PublicClient,
  transactionHash: string,
  functionName: string,
  options?: WaitForTransactionOptions,
) => {
  try {
    const provider = new ethers.JsonRpcProvider(publicClient.transport.url);
    const { confirms, timeout } = options ?? DEFAULT_OPTIONS;
    const receipt = await provider.waitForTransaction(transactionHash, confirms, timeout);

    if (!receipt) {
      throw new Error("Transaction receipt not found");
    }

    if (receipt.status !== 1) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }

    logger.info(`${functionName} transaction confirmed`);

    return receipt;
  } catch (error) {
    logger.warn(
      `Failed to confirm ${functionName} transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );

    throw error;
  }
};
