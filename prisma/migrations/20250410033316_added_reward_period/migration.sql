-- CreateTable
CREATE TABLE "reward_periods" (
    "id" TEXT NOT NULL,
    "period" BIGINT NOT NULL,
    "totalReward" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_periods_period_key" ON "reward_periods"("period");
