import { cleanup, logger } from "@intmax2-claim-aggregator/shared";

let isShuttingDown = false;

export const shutdown = async () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  try {
    await cleanup();
    process.exit(0);
  } catch (error) {
    logger.error(`Shutdown failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }
};
