import type { PollOptions } from "./types";

// id
export const DEFAULT_ID_LENGTH = 20;

// poll
export const DEFAULT_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 30,
  intervalMs: 6_000,
  timeoutMs: 180_000,
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
