import { config } from "@intmax2-claim-aggregator/shared";

// transaction
export const WAIT_TRANSACTION_TIMEOUT = 15_000;
export const TRANSACTION_MAX_RETRIES = 5;

// contracts
export const CLAIM_CONTRACT_ADDRESS = config.CLAIM_CONTRACT_ADDRESS as `0x${string}`;
export const CLAIM_CONTRACT_DEPLOYED_BLOCK = config.CLAIM_CONTRACT_DEPLOYED_BLOCK;

// errors
export const TRANSACTION_WAIT_TIMEOUT_ERROR_MESSAGE =
  "Timed out while waiting for transaction with hash";
export const EXECUTION_REVERTED_ERROR_MESSAGE = "Execution reverted";
export const TRANSACTION_REPLACEMENT_FEE_TOO_LOW = "replacement fee too low";
export const TRANSACTION_MISSING_REVERT_DATA = "missing revert data"; // because of the gasPrice

// ethers
export const ETHERS_WAIT_TRANSACTION_TIMEOUT_MESSAGE = "timeout";
export const ETHERS_CONFIRMATIONS = 1;
