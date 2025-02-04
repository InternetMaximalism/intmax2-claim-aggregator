export const ClaimEvents = {
  CLAIM_DIRECT_WITHDRAWAL_SUCCESSED: "ClaimDirectWithdrawalSuccessed",
} as const;

export type WithdrawalEventType = (typeof ClaimEvents)[keyof typeof ClaimEvents];

export const WITHDRAWAL_EVENT_NAMES = Object.values(ClaimEvents);
