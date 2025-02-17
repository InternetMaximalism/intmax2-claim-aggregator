import type { PollOptions } from "./types";

// id
export const DEFAULT_ID_LENGTH = 20;

// poll
export const DEFAULT_POLL_OPTIONS: Required<PollOptions> = {
  maxAttempts: 30,
  intervalMs: 10_000,
  timeoutMs: 300_000,
};
