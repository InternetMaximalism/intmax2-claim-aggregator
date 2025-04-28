import * as t from "drizzle-orm/pg-core";
import { pgTable as table } from "drizzle-orm/pg-core";

export const eventSchema = table("events", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  name: t.varchar("name").notNull().unique(),
  lastBlockNumber: t.bigint("last_block_number", { mode: "bigint" }).notNull(),
  createdAt: t.timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  metadata: t.jsonb("metadata"),
});

export const claimPeriodSchema = table("claim_periods", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  period: t.bigint("period", { mode: "bigint" }).notNull().unique(),
  startBlockNumber: t.bigint("start_block_number", { mode: "bigint" }).notNull(),
  endBlockNumber: t.bigint("end_block_number", { mode: "bigint" }).notNull(),
  recipientCount: t.integer("recipient_count").default(0).notNull(),
  createdAt: t.timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const rewardPeriodSchema = table("reward_periods", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  period: t.bigint("period", { mode: "bigint" }).notNull().unique(),
  totalReward: t.integer("totalReward").notNull(),
  createdAt: t.timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: t
    .timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
