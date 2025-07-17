import type { Account } from "viem";

export interface BaseEvent {
  name: string;
  address: string;
  blockNumber: bigint;
  blockTimestamp: string;
  transactionHash: string;
}

export interface WithdrawalEventLog {
  withdrawalHash: string;
  transactionHash: string;
}

export interface DirectWithdrawalQueuedEvent extends BaseEvent {
  args: DirectWithdrawalQueuedEventLog;
}

export interface DirectWithdrawalQueuedEventLog extends WithdrawalEventLog {
  transactionHash: string;
  recipient: string;
  withdrawal: {
    recipient: string;
    tokenIndex: number;
    amount: bigint;
    nullifier: string;
  };
}

export interface DirectWithdrawalSuccessedEvent extends BaseEvent {
  args: DirectWithdrawalSuccessedEventLog;
}

export interface DirectWithdrawalSuccessedEventLog extends WithdrawalEventLog {
  transactionHash: string;
  recipient: string;
}

export interface ContributionRecordedEvent extends BaseEvent {
  args: ContributionRecordedEventLog;
}

export interface ContributionRecordedEventLog {
  period: bigint;
  recipient: string;
  depositAmount: bigint;
  contribution: bigint;
}

export interface ContractCallParameters {
  contractAddress: `0x${string}`;
  functionName: string;
  account: Account;
  args: any[];
}

export interface ContractCallOptionsEthers {
  value?: bigint;
  nonce?: number;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

export interface RetryOptionsEthers {
  nonce?: number | null;
  gasPrice: bigint | null;
}

export interface EthersTransactionExecutionParams {
  functionName: string;
  contract: any;
  callArgs: any;
}

export interface WaitForTransactionOptions {
  confirms?: number;
  timeout?: number;
}

export interface SubmitContractClaim {
  recipient: string;
  amount: bigint;
  nullifier: string;
  blockHash: string;
  blockNumber: bigint;
}
