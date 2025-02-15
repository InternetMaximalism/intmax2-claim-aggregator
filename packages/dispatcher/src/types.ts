export interface ContributionParams {
  period: bigint;
  recipients: string[];
}

export interface AllocationConstants {
  startTimestamp: bigint;
  periodInterval: bigint;
  genesisTimestamp: bigint;
  phase0RewardPerDay: bigint;
  numPhases: bigint;
  phase0Period: bigint;
}

export interface PeriodInfo {
  period: bigint;
  startTime: bigint;
  endTime: bigint;
}

export interface PeriodBlockInterval {
  periodInfo: PeriodInfo;
  startBlockNumber: bigint;
  endBlockNumber: bigint;
}
