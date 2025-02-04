import { eventPrisma, withdrawalPrisma } from "../db";
import { RedisClient, logger } from "../lib";

export const cleanup = async () => {
  logger.debug("Cleaning up resources");

  await Promise.all([
    withdrawalPrisma.$disconnect(),
    eventPrisma.$disconnect(),
    RedisClient.getInstance().quit(),
  ]);

  logger.debug("Resources cleaned up");
};
