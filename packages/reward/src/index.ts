import { cleanup, logger, timeOperation } from "@intmax2-claim-aggregator/shared";
import { name } from "../package.json";
import { performJob } from "./service/job.service";

async function main() {
  try {
    logger.info(`Starting ${name} job`);
    const { durationInSeconds } = await timeOperation(performJob);
    logger.info(`Completed ${name} job executed successfully in ${durationInSeconds}s`);
    await cleanup();
    process.exit(0);
  } catch (error) {
    logger.error(error);
    await cleanup();
    process.exit(1);
  }
}

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
