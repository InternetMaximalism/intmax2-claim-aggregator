export interface GetZKProofResponse<T> {
  success: boolean;
  proof: T | null;
  errorMessage: string | null;
}

export interface CreateProofResponse {
  success: boolean;
  message: string;
}

export interface CreateGnarkProofResponse {
  success: boolean;
  jobId: string;
}

export interface GnarkProof {
  publicInputs: string[];
  proof: string;
}

export interface PollOptions {
  maxAttempts?: number;
  intervalMs?: number;
  timeoutMs?: number;
}

export interface PollResult<T> {
  success: boolean;
  proof: T | null;
  errorMessage: string | null;
}

export interface SubmitContractClaim {
  recipient: string;
  amount: bigint;
  nullifier: string;
  blockHash: string;
  blockNumber: bigint;
}

export interface ClaimWithProof {
  uuid: string;
  singleClaimProof: Uint8Array | null;
  withdrawalHash: string;
}

export interface ClaimProof {
  proof: string;
  withdrawal: {
    recipient: string;
    amount: string;
    nullifier: string;
    blockHash: string;
    blockNumber: number;
  };
}

export interface ProverRequestParams {
  method: "get" | "post";
  path: string;
  data?: unknown;
  params?: Record<string, string>;
}

export interface SubmitClaimParams {
  contractClaims: SubmitContractClaim[];
  publicInputs: {
    lastClaimHash: string;
    claimAggregator: string;
  };
  proof: GnarkProof["proof"];
}
