export const ClaimEvents = {
  DIRECT_WITHDRAWAL_QUEUED: "DirectWithdrawalQueued",
} as const;

export type ClaimEventType = (typeof ClaimEvents)[keyof typeof ClaimEvents];

export const CLAIM_EVENT_NAMES = Object.values(ClaimEvents);
