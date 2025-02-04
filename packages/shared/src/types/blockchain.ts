import type { Abi, Account } from "viem";

export interface BaseEvent {
  name: string;
  address: string;
  blockNumber: bigint;
  blockTimestamp: string;
}

export interface DirectWithdrawalSuccessedEvent extends BaseEvent {
  args: DirectWithdrawalSuccessedEventLog;
}

export interface WithdrawalEventLog {
  withdrawalHash: string;
}

export interface DirectWithdrawalSuccessedEventLog extends WithdrawalEventLog {
  recipient: string;
}

export interface WithdrawalClaimableEvent extends BaseEvent {
  args: WithdrawalClaimableEventLog;
}

export interface WithdrawalClaimableEventLog extends WithdrawalEventLog {}

export interface ClaimedWithdrawalEvent extends BaseEvent {
  args: ClaimedWithdrawalEventLog;
}

export interface ClaimedWithdrawalEventLog extends WithdrawalEventLog {
  recipient: string;
}

export interface ContractCallParameters {
  contractAddress: `0x${string}`;
  abi: Abi;
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
