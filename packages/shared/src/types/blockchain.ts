import type { Abi, Account } from "viem";

export interface BaseEvent {
  name: string;
  address: string;
  blockNumber: bigint;
  blockTimestamp: string;
}

export interface DirectWithdrawalQueuedEvent extends BaseEvent {
  args: DirectWithdrawalQueuedEventLog;
}

export interface DirectWithdrawalQueuedEventLog {
  withdrawalHash: string;
  recipient: string;
  withdrawal: {
    recipient: string;
    tokenIndex: number;
    amount: bigint;
    nullifier: string;
  };
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
