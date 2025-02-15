/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type { IClaim, IClaimInterface } from "../../../contracts/claim/IClaim";

const _abi = [
  {
    inputs: [],
    name: "AddressZero",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "blockHash",
        type: "bytes32",
      },
    ],
    name: "BlockHashNotExists",
    type: "error",
  },
  {
    inputs: [],
    name: "ClaimAggregatorMismatch",
    type: "error",
  },
  {
    inputs: [],
    name: "ClaimChainVerificationFailed",
    type: "error",
  },
  {
    inputs: [],
    name: "ClaimProofVerificationFailed",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "withdrawalHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        components: [
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint32",
            name: "tokenIndex",
            type: "uint32",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "nullifier",
            type: "bytes32",
          },
        ],
        indexed: false,
        internalType: "struct WithdrawalLib.Withdrawal",
        name: "withdrawal",
        type: "tuple",
      },
    ],
    name: "DirectWithdrawalQueued",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "periodNumber",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getAllocationInfo",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "totalContribution",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "allocationPerPeriod",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "userContribution",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "userAllocation",
            type: "uint256",
          },
        ],
        internalType: "struct AllocationLib.AllocationInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "period",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "users",
        type: "address[]",
      },
    ],
    name: "relayClaims",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "nullifier",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "blockHash",
            type: "bytes32",
          },
          {
            internalType: "uint32",
            name: "blockNumber",
            type: "uint32",
          },
        ],
        internalType: "struct ChainedClaimLib.ChainedClaim[]",
        name: "claims",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "bytes32",
            name: "lastClaimHash",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "claimAggregator",
            type: "address",
          },
        ],
        internalType: "struct ClaimProofPublicInputsLib.ClaimProofPublicInputs",
        name: "publicInputs",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "proof",
        type: "bytes",
      },
    ],
    name: "submitClaimProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class IClaim__factory {
  static readonly abi = _abi;
  static createInterface(): IClaimInterface {
    return new Interface(_abi) as IClaimInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): IClaim {
    return new Contract(address, _abi, runner) as unknown as IClaim;
  }
}
