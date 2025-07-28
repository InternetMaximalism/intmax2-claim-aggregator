import * as t from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";
import { bytea } from "./utils";

const withdrawalStatus = ["requested", "relayed", "success", "need_claim", "failed"] as const;
export type WithdrawalStatus = (typeof withdrawalStatus)[number];
const withdrawalStatusEnum = t.pgEnum("withdrawal_status", withdrawalStatus);

const claimStatus = ["requested", "verified", "relayed", "success", "failed"] as const;
export type ClaimStatus = (typeof claimStatus)[number];
const claimStatusEnum = t.pgEnum("claim_status", claimStatus);

export const withdrawalSchema = table(
  "withdrawals",
  {
    withdrawalHash: t.varchar("withdrawal_hash", { length: 66 }).primaryKey(),
    status: withdrawalStatusEnum("status").default("requested").notNull(),
    pubkey: t.char("pubkey", { length: 66 }).notNull(),
    recipient: t.char("recipient", { length: 42 }).notNull(),
    contractWithdrawal: t.jsonb("contract_withdrawal").notNull(),
    singleWithdrawalProof: bytea("single_withdrawal_proof"),
    l1TxHash: t.varchar("l1_tx_hash", { length: 66 }),
    createdAt: t.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    t.index("idx_withdrawals_pubkey").on(table.pubkey),
    t.index("idx_withdrawals_recipient").on(table.recipient),
  ],
);

export const claimSchema = table(
  "claims",
  {
    nullifier: t.char("nullifier", { length: 66 }).primaryKey(),
    period: t.integer("period"),
    status: claimStatusEnum("status").default("requested").notNull(),
    pubkey: t.char("pubkey", { length: 66 }).notNull(),
    recipient: t.char("recipient", { length: 42 }).notNull(),
    claim: t.jsonb("claim").notNull(),
    singleClaimProof: bytea("single_claim_proof"),
    withdrawalHash: t.char("withdrawal_hash", { length: 66 }),
    contractWithdrawal: t.jsonb("contract_withdrawal"),
    l1TxHash: t.varchar("l1_tx_hash", { length: 66 }),
    submitClaimProofTxHash: t.varchar("submit_claim_proof_tx_hash", { length: 66 }),
    createdAt: t.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [t.index("idx_withdrawals_withdrawal_hash").on(table.withdrawalHash)],
);
