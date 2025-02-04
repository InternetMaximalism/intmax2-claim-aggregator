import { encodePacked, keccak256, zeroHash } from "viem";
import type { WithdrawalProof } from "../types";

export const getLastWithdrawalHashFromWithdrawalProofs = (withdrawalProofs: WithdrawalProof[]) => {
  let lastWithdrawalHash = zeroHash as `0x${string}`;
  for (const { withdrawal } of withdrawalProofs) {
    lastWithdrawalHash = keccak256(
      encodePacked(
        ["bytes32", "address", "uint32", "uint256", "bytes32", "bytes32", "uint32"],
        [
          lastWithdrawalHash,
          withdrawal.recipient as `0x${string}`,
          BigInt(withdrawal.tokenIndex) as unknown as number,
          BigInt(withdrawal.amount) as bigint,
          withdrawal.nullifier as `0x${string}`,
          withdrawal.blockHash as `0x${string}`,
          BigInt(withdrawal.blockNumber) as unknown as number,
        ],
      ),
    );
  }

  return lastWithdrawalHash;
};

export const formatContractWithdrawal = (withdrawalProof: WithdrawalProof) => {
  return {
    recipient: withdrawalProof.withdrawal.recipient,
    tokenIndex: BigInt(withdrawalProof.withdrawal.tokenIndex),
    amount: BigInt(withdrawalProof.withdrawal.amount),
    nullifier: withdrawalProof.withdrawal.nullifier,
    blockHash: withdrawalProof.withdrawal.blockHash,
    blockNumber: BigInt(withdrawalProof.withdrawal.blockNumber),
  };
};
