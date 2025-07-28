CREATE TYPE "public"."claim_status" AS ENUM('requested', 'verified', 'relayed', 'success', 'failed');
CREATE TYPE "public"."withdrawal_status" AS ENUM('requested', 'relayed', 'success', 'need_claim', 'failed');

CREATE TABLE "claims" (
	"nullifier" char(66) PRIMARY KEY NOT NULL,
	"period" integer,
	"status" "claim_status" DEFAULT 'requested' NOT NULL,
	"pubkey" char(66) NOT NULL,
	"recipient" char(42) NOT NULL,
	"claim" jsonb NOT NULL,
	"single_claim_proof" "bytea",
	"withdrawal_hash" char(66),
	"contract_withdrawal" jsonb,
	"l1_tx_hash" varchar(66),
	"submit_claim_proof_tx_hash" varchar(66),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"withdrawal_hash" varchar(66) PRIMARY KEY NOT NULL,
	"status" "withdrawal_status" DEFAULT 'requested' NOT NULL,
	"pubkey" char(66) NOT NULL,
	"recipient" char(42) NOT NULL,
	"contract_withdrawal" jsonb NOT NULL,
	"single_withdrawal_proof" "bytea",
	"l1_tx_hash" varchar(66),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_withdrawals_withdrawal_hash" ON "claims" USING btree ("withdrawal_hash");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_pubkey" ON "withdrawals" USING btree ("pubkey");--> statement-breakpoint
CREATE INDEX "idx_withdrawals_recipient" ON "withdrawals" USING btree ("recipient");