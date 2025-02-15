-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_block_number" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_periods" (
    "id" TEXT NOT NULL,
    "period" BIGINT NOT NULL,
    "start_block_number" BIGINT NOT NULL,
    "end_block_number" BIGINT NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_name_key" ON "events"("name");

-- CreateIndex
CREATE UNIQUE INDEX "claim_periods_period_key" ON "claim_periods"("period");
