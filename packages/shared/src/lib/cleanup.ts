import { closeEventDB, closeWithdrawalDB } from "../db";
import { RedisClient, logger } from "../lib";

export const cleanup = async () => {
  logger.debug("Cleaning up resources");

  await Promise.all([closeEventDB(), closeWithdrawalDB(), RedisClient.getInstance().quit()]);

  logger.debug("Resources cleaned up");
};
