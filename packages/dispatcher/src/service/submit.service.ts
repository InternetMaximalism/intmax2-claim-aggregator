import {
  CLAIM_CONTRACT_ADDRESS,
  Claim__factory,
  type ContractCallOptionsEthers,
  type ContractCallParameters,
  type RetryOptionsEthers,
  calculateEthersIncreasedGasPrice,
  calculateGasMultiplier,
  createNetworkClient,
  ethersWaitForTransactionConfirmation,
  executeEthersTransaction,
  getEthersMaxGasMultiplier,
  getEthersTxOptions,
  getNonce,
  getWalletClient,
  logger,
  replacedEthersTransaction,
  ETHERS_CONFIRMATIONS,
  ETHERS_WAIT_TRANSACTION_TIMEOUT_MESSAGE,
  TRANSACTION_MAX_RETRIES,
  TRANSACTION_MISSING_REVERT_DATA,
  TRANSACTION_REPLACEMENT_FEE_TOO_LOW,
  WAIT_TRANSACTION_TIMEOUT,
} from "@intmax2-claim-aggregator/shared";
import { ethers } from "ethers";
import { type PublicClient, toHex } from "viem";
import type { ContributionParams } from "../types";

export const relayClaims = async (
  ethereumClient: ReturnType<typeof createNetworkClient>,
  params: ContributionParams,
) => {
  const walletClientData = getWalletClient("withdrawal", "scroll");
  const retryOptions: RetryOptionsEthers = {
    gasPrice: null,
  };

  for (let attempt = 0; attempt < TRANSACTION_MAX_RETRIES; attempt++) {
    try {
      const multiplier = calculateGasMultiplier(attempt);

      const { transactionHash } = await relayClaimsWithRetry(
        ethereumClient,
        walletClientData,
        params,
        multiplier,
        retryOptions,
      );

      const receipt = await ethersWaitForTransactionConfirmation(
        ethereumClient,
        transactionHash,
        "submitClaimProof",
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

export const relayClaimsWithRetry = async (
  ethereumClient: PublicClient,
  walletClientData: ReturnType<typeof getWalletClient>,
  params: ContributionParams,
  multiplier: number,
  retryOptions: RetryOptionsEthers,
) => {
  const contractCallParams: ContractCallParameters = {
    contractAddress: CLAIM_CONTRACT_ADDRESS,
    functionName: "submitClaimProof",
    account: walletClientData.account,
    args: [params.period, params.users],
  };

  const [{ pendingNonce, currentNonce }, gasPriceData] = await Promise.all([
    getNonce(ethereumClient, walletClientData.account.address),
    getEthersMaxGasMultiplier(ethereumClient, multiplier),
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

  const provider = new ethers.JsonRpcProvider(ethereumClient.transport.url);
  const signer = new ethers.Wallet(
    toHex(walletClientData.account.getHdKey().privateKey!),
    provider,
  );
  const contract = Claim__factory.connect(contractCallParams.contractAddress, signer);

  const ethersTxOptions = getEthersTxOptions(contractCallParams, contractCallOptions ?? {});
  const callArgs = [
    contractCallParams.args[0],
    contractCallParams.args[1],
    contractCallParams.args[2],
    ethersTxOptions,
  ];

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
