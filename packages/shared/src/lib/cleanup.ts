import { eventPool, withdrawalPool } from "../db";
import { RedisClient, logger } from "../lib";

export const cleanup = async () => {
  logger.debug("Cleaning up resources");

  await Promise.all([eventPool.end(), withdrawalPool.end(), RedisClient.getInstance().quit()]);

  logger.debug("Resources cleaned up");
};
