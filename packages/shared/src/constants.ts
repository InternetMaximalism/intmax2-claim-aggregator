import { config } from "./config";

// block event
export const BLOCK_RANGE_MINIMUM = 10000n;

// contracts
export const LIQUIDITY_CONTRACT_ADDRESS = config.LIQUIDITY_CONTRACT_ADDRESS as `0x${string}`;
export const LIQUIDITY_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
) as bigint;
export const CLAIM_CONTRACT_ADDRESS = config.CLAIM_CONTRACT_ADDRESS as `0x${string}`;
export const CLAIM_CONTRACT_DEPLOYED_BLOCK = BigInt(config.CLAIM_CONTRACT_DEPLOYED_BLOCK) as bigint;
export const L2_CONTRIBUTION_CONTRACT_ADDRESS =
  config.L2_CONTRIBUTION_CONTRACT_ADDRESS as `0x${string}`;
export const BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS =
  config.BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS as `0x${string}`;

// etherscan
export const ETHERSCAN_URL_MAPS = {
  "ethereum-mainnet": "https://api.etherscan.io/api",
  "ethereum-sepolia": "https://api-sepolia.etherscan.io/api",
  "scroll-mainnet": "https://api.scrollscan.com/api",
  "scroll-sepolia": "https://api-sepolia.scrollscan.com/api",
};

// transaction
export const WAIT_TRANSACTION_TIMEOUT = 15_000;
export const TRANSACTION_MAX_RETRIES = 5;

// errors
export const TRANSACTION_WAIT_TIMEOUT_ERROR_MESSAGE =
  "Timed out while waiting for transaction with hash";
export const EXECUTION_REVERTED_ERROR_MESSAGE = "Execution reverted";
export const TRANSACTION_REPLACEMENT_FEE_TOO_LOW = "replacement fee too low";
export const TRANSACTION_MISSING_REVERT_DATA = "missing revert data"; // because of the gasPrice

// ethers
export const ETHERS_WAIT_TRANSACTION_TIMEOUT_MESSAGE = "timeout";
export const ETHERS_CONFIRMATIONS = 1;
