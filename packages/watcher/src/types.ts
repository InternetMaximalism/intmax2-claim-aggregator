import { type SubmitContractClaim, withdrawalDB } from "@intmax2-claim-aggregator/shared";
import type { PublicClient } from "viem";

export const WatcherEvents = {
  CLAIM_WATCHER_DIRECT_WITHDRAWAL_QUEUED: "ClaimWatcherDirectWithdrawalQueued",
  CLAIM_WATCHER_DIRECT_WITHDRAWAL_SUCCESSED: "ClaimWatcherDirectWithdrawalSuccessed",
} as const;

export type WatcherEventType = (typeof WatcherEvents)[keyof typeof WatcherEvents];

export const WATCHER_EVENT_NAMES = Object.values(WatcherEvents);

export interface NetworkState {
  l1Client: PublicClient;
  l2Client: PublicClient;
  currentBlockNumber: bigint;
  scrollCurrentBlockNumber: bigint;
}

export type DatabaseType = typeof withdrawalDB;
export type TransactionType = Parameters<Parameters<DatabaseType["transaction"]>[0]>[0];
export type Transaction = (tx: TransactionType) => Promise<void>;

export type ClaimTransactions = {
  txHash: string;
  txArgs: SubmitContractClaim[];
};

export type RelayClaimTransaction = {
  txHash: string;
  period: bigint;
};
