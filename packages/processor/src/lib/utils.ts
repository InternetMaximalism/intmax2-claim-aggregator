import { encodePacked, keccak256, zeroHash } from "viem";
import type { ClaimProof } from "../types";

export const getLastClaimHashFromClaimProofs = (claimProofs: ClaimProof[]) => {
  let lastWithdrawalHash = zeroHash as `0x${string}`;
  for (const { claim } of claimProofs) {
    lastWithdrawalHash = keccak256(
      encodePacked(
        ["bytes32", "address", "uint256", "bytes32", "bytes32", "uint32"],
        [
          lastWithdrawalHash,
          claim.recipient as `0x${string}`,
          BigInt(claim.amount) as bigint,
          claim.nullifier as `0x${string}`,
          claim.blockHash as `0x${string}`,
          BigInt(claim.blockNumber) as unknown as number,
        ],
      ),
    );
  }

  return lastWithdrawalHash;
};

export const formatContractClaim = (claimProof: ClaimProof) => {
  return {
    recipient: claimProof.claim.recipient,
    amount: BigInt(claimProof.claim.amount),
    nullifier: claimProof.claim.nullifier,
    blockHash: claimProof.claim.blockHash,
    blockNumber: BigInt(claimProof.claim.blockNumber),
  };
};
