import type { PublicClient } from "viem";

export const WatcherEvents = {
  DIRECT_WITHDRAWAL_QUEUED: "DirectWithdrawalQueued",
  DIRECT_WITHDRAWAL_SUCCESSED: "DirectWithdrawalSuccessed",
} as const;

export type WatcherEventType = (typeof WatcherEvents)[keyof typeof WatcherEvents];

export const WATCHER_EVENT_NAMES = Object.values(WatcherEvents);

export interface NetworkState {
  ethereumClient: PublicClient;
  scrollClient: PublicClient;
  currentBlockNumber: bigint;
  scrollCurrentBlockNumber: bigint;
}
