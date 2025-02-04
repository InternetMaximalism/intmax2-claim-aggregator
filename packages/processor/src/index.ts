import { QueueManager, cleanup, logger } from "@intmax2-claim-aggregator/shared";
import { name } from "../package.json";
import { startHealthCheckServer } from "./lib/healthCheck";
import { shutdown } from "./lib/shutdown";
import { processQueueJob } from "./service/job.service";

async function main() {
  try {
    logger.info(`Starting ${name} job processor`);

    await startHealthCheckServer();

    const queueManager = QueueManager.getInstance("claim-aggregator");

    queueManager.registerProcessor(async (job) => {
      logger.info(`Processing job ${job.id} with data: ${JSON.stringify(job.data)}`);
      const { durationInSeconds } = await processQueueJob(job.data);
      logger.info(`Job ${job.id} completed in ${durationInSeconds}s`);
      return { success: true, durationInSeconds };
    });

    logger.info(`${name} job processor is running and waiting for jobs...`);
  } catch (error) {
    logger.error(error);
    await cleanup();
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error(error);
    process.exit(1);
  });
}
