export const WatcherEvents = {
  DIRECT_WITHDRAWAL_QUEUED: "DirectWithdrawalQueued",
  DIRECT_WITHDRAWAL_SUCCESSED: "DIRECT_WITHDRAWAL_SUCCESSED",
} as const;

export type WatcherEventType = (typeof WatcherEvents)[keyof typeof WatcherEvents];

export const WATCHER_EVENT_NAMES = Object.values(WatcherEvents);
