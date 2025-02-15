import { encodePacked, keccak256, zeroHash } from "viem";
import type { ClaimProof } from "../types";

export const getLastClaimHashFromClaimProofs = (claimProofs: ClaimProof[]) => {
  let lastWithdrawalHash = zeroHash as `0x${string}`;
  for (const { withdrawal } of claimProofs) {
    lastWithdrawalHash = keccak256(
      encodePacked(
        ["bytes32", "address", "uint256", "bytes32", "bytes32", "uint32"],
        [
          lastWithdrawalHash,
          withdrawal.recipient as `0x${string}`,
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

export const formatContractClaim = (withdrawalProof: ClaimProof) => {
  return {
    recipient: withdrawalProof.withdrawal.recipient,
    amount: BigInt(withdrawalProof.withdrawal.amount),
    nullifier: withdrawalProof.withdrawal.nullifier,
    blockHash: withdrawalProof.withdrawal.blockHash,
    blockNumber: BigInt(withdrawalProof.withdrawal.blockNumber),
  };
};
