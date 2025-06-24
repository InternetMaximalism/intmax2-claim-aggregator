export enum ClaimGroupStatus {
  PENDING,
  PROCESSING,
}

export interface ClaimGroup {
  requestingClaims: RequestingClaim[];
  status: ClaimGroupStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestingClaim {
  nullifier: string;
}
