import Queue, { Job, type JobOptions, type QueueOptions, Queue as QueueType } from "bull";
import { config } from "../config";
import { logger } from "../lib";

type JobType = "processBatch";
type QueueNameType = "claim-aggregator";

interface JobPayload {
  groupId: string;
}

export interface QueueJobData {
  type: JobType;
  payload: JobPayload;
}

export class QueueManager {
  private static instance: QueueManager;

  private queue: QueueType<QueueJobData>;
  private readonly defaultJobOptions: JobOptions = {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  };

  constructor(queueName: QueueNameType, options?: QueueOptions) {
    const defaultOptions: QueueOptions = {};
    this.queue = new Queue<QueueJobData>(queueName, config.REDIS_URL, {
      ...defaultOptions,
      ...options,
    });

    this.queue.on("error", (error) => {
      logger.error(`Queue error: ${error}`);
    });

    this.queue.on("completed", (job: Job, result: any) => {
      logger.info(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
    });

    this.queue.on("failed", (job: Job, error: Error) => {
      logger.error(`Job ${job.id} failed: ${error.message}`);
    });
  }

  public static getInstance(queueName: QueueNameType) {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(queueName);
    }
    return QueueManager.instance;
  }

  registerProcessor(processor: (job: Job<QueueJobData>) => Promise<any>) {
    this.queue.process(config.QUEUE_CONCURRENCY, async (job: Job<QueueJobData>) => {
      try {
        return await processor(job);
      } catch (error) {
        logger.error(
          `Error processing job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        throw error;
      }
    });
  }

  async addJob(type: JobType, payload: JobPayload, options?: JobOptions) {
    const jobData: QueueJobData = {
      type,
      payload,
    };

    return await this.queue.add(jobData, {
      ...this.defaultJobOptions,
      ...options,
    });
  }
}
