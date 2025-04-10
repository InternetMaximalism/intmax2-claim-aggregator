export interface ContractData {
  currentPeriod: bigint;
  startTimestamp: bigint;
  periodInterval: bigint;
}

export interface PeriodInfo {
  period: bigint;
  dates: Date[];
  totalReward: number;
}

export interface SetRewardParams {
  periodNumber: bigint;
  amount: bigint;
}

export interface AllowClaimParams {
  periodNumber: bigint;
}
