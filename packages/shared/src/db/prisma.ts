import { PrismaClient as EventPrismaClient } from "../../../../node_modules/.prisma/event-client";
import { PrismaClient as WithdrawalPrismaClient } from "../../../../node_modules/.prisma/withdrawal-client";
import { config } from "../config";

export const eventPrisma = new EventPrismaClient({
  datasources: {
    db: {
      url: config.EVENT_DATABASE_URL,
    },
  },
});

export const withdrawalPrisma = new WithdrawalPrismaClient({
  datasources: {
    db: {
      url: config.WITHDRAWAL_DATABASE_URL,
    },
  },
});
