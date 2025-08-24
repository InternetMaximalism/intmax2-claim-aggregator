import {
  BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS,
  BlockBuilderReward__factory,
  type ContractCallOptionsEthers,
  type ContractCallParameters,
  calculateEthersIncreasedGasPrice,
  calculateGasMultiplier,
  createNetworkClient,
  ETHERS_CONFIRMATIONS,
  ETHERS_WAIT_TRANSACTION_TIMEOUT_MESSAGE,
  ethersWaitForTransactionConfirmation,
  executeEthersTransaction,
  getEthersMaxGasMultiplier,
  getEthersTxOptions,
  getNonce,
  getWalletClient,
  logger,
  type RetryOptionsEthers,
  replacedEthersTransaction,
  TRANSACTION_MAX_RETRIES,
  TRANSACTION_MISSING_REVERT_DATA,
  TRANSACTION_REPLACEMENT_FEE_TOO_LOW,
  WAIT_TRANSACTION_TIMEOUT,
} from "@intmax2-claim-aggregator/shared";
import { ethers } from "ethers";
import { type PublicClient, toHex } from "viem";
import type { SetRewardParams } from "../types";

export const setReward = async (
  l2Client: ReturnType<typeof createNetworkClient>,
  params: SetRewardParams,
) => {
  const walletClientData = getWalletClient("blockBuilderReward", "l2");
  const retryOptions: RetryOptionsEthers = {
    gasPrice: null,
  };

  for (let attempt = 0; attempt < TRANSACTION_MAX_RETRIES; attempt++) {
    try {
      const multiplier = calculateGasMultiplier(attempt);

      const { transactionHash } = await setRewardWithRetry(
        l2Client,
        walletClientData,
        params,
        multiplier,
        retryOptions,
      );

      const receipt = await ethersWaitForTransactionConfirmation(
        l2Client,
        transactionHash,
        "setReward",
        {
          confirms: ETHERS_CONFIRMATIONS,
          timeout: WAIT_TRANSACTION_TIMEOUT,
        },
      );

      return receipt;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Error sending transaction: ${message}`);

      if (attempt === TRANSACTION_MAX_RETRIES - 1) {
        throw new Error("Transaction Max retries reached");
      }

      if (
        message.includes(ETHERS_WAIT_TRANSACTION_TIMEOUT_MESSAGE) ||
        message.includes(TRANSACTION_REPLACEMENT_FEE_TOO_LOW) ||
        message.includes(TRANSACTION_MISSING_REVERT_DATA)
      ) {
        logger.warn(`Attempt ${attempt + 1} failed. Retrying with higher gas...`);
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unexpected end of transaction");
};

export const setRewardWithRetry = async (
  l2Client: PublicClient,
  walletClientData: ReturnType<typeof getWalletClient>,
  params: SetRewardParams,
  multiplier: number,
  retryOptions: RetryOptionsEthers,
) => {
  const contractCallParams: ContractCallParameters = {
    contractAddress: BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS,
    functionName: "setReward",
    account: walletClientData.account,
    args: [params.periodNumber, params.amount],
  };

  const [{ pendingNonce, currentNonce }, gasPriceData] = await Promise.all([
    getNonce(l2Client, walletClientData.account.address),
    getEthersMaxGasMultiplier(l2Client, multiplier),
  ]);
  let { gasPrice } = gasPriceData;

  if (retryOptions.gasPrice) {
    const { newGasPrice } = calculateEthersIncreasedGasPrice(retryOptions.gasPrice, gasPrice);

    gasPrice = newGasPrice;

    logger.info(`Increased gas fees multiplier: ${multiplier} - gasPrice: ${gasPrice}`);
  }

  retryOptions.gasPrice = gasPrice;

  const contractCallOptions: ContractCallOptionsEthers = {
    nonce: currentNonce,
    gasPrice,
  };

  const provider = new ethers.JsonRpcProvider(l2Client.transport.url);
  const signer = new ethers.Wallet(
    toHex(walletClientData.account.getHdKey().privateKey!),
    provider,
  );
  const contract = BlockBuilderReward__factory.connect(contractCallParams.contractAddress, signer);

  const ethersTxOptions = getEthersTxOptions(contractCallParams, contractCallOptions ?? {});
  const callArgs = [contractCallParams.args[0], contractCallParams.args[1], ethersTxOptions];

  if (pendingNonce > currentNonce) {
    return await replacedEthersTransaction({
      functionName: contractCallParams.functionName,
      contract,
      callArgs,
    });
  }

  const transactionResult = await executeEthersTransaction({
    functionName: contractCallParams.functionName,
    contract,
    callArgs,
  });

  return transactionResult;
};
