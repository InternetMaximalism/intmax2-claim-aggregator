CREATE TABLE "claim_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" bigint NOT NULL,
	"start_block_number" bigint NOT NULL,
	"end_block_number" bigint NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_periods_period_unique" UNIQUE("period")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"last_block_number" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "events_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reward_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" bigint NOT NULL,
	"totalReward" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_periods_period_unique" UNIQUE("period")
);
