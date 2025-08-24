import type { Log, PublicClient } from "viem";
import { logger } from "../lib/logger";
import { getEventLogs } from "./events";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_RETRIES_EVENT_LOGS = 2;
const BATCH_SIZE = 10;

interface EventLogOptions {
  startBlockNumber: bigint;
  endBlockNumber: bigint;
  blockRange: bigint;
  contractAddress: `0x${string}`;
  eventInterface: any;
  maxRetries?: number;
  args?: Record<string, unknown>;
}

export const getEventLogsWithRetry = async <T>(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  event: any,
  fromBlock: bigint,
  toBlock: bigint,
  filter: { from?: string[]; depositId?: bigint[] },
) => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const logs = await getEventLogs(
        publicClient,
        contractAddress,
        event,
        fromBlock,
        toBlock,
        filter,
      );
      return logs as Array<Log & { args: T }>;
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        `Attempt ${attempt}/${MAX_RETRIES} failed to get event logs: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      );

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  throw new Error(
    `Failed to get event logs after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`,
  );
};

export const createBlockRanges = (
  fromBlockNumber: bigint,
  latestBlockNumber: bigint,
  contractEventBatchSize: bigint,
): [bigint, bigint][] => {
  const ranges: [bigint, bigint][] = [];

  if (fromBlockNumber > latestBlockNumber) {
    return ranges;
  }

  let currentFromBlock = fromBlockNumber;
  while (currentFromBlock <= latestBlockNumber) {
    const chunkToBlock =
      currentFromBlock + contractEventBatchSize > latestBlockNumber
        ? latestBlockNumber
        : currentFromBlock + contractEventBatchSize;

    ranges.push([currentFromBlock, chunkToBlock]);
    currentFromBlock = chunkToBlock + 1n;
  }

  return ranges;
};

export const fetchEvents = async <T>(
  publicClient: PublicClient,
  options: EventLogOptions,
): Promise<T[]> => {
  const {
    startBlockNumber,
    endBlockNumber,
    blockRange,
    contractAddress,
    eventInterface,
    maxRetries = MAX_RETRIES_EVENT_LOGS,
    args,
  } = options;

  try {
    const blockRanges = createBlockRanges(startBlockNumber, endBlockNumber, blockRange);
    const events: T[] = [];

    for (let i = 0; i < blockRanges.length; i += BATCH_SIZE) {
      const batch = blockRanges.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(
        ([fromBlock, toBlock]) =>
          getEventLogs(
            publicClient,
            contractAddress,
            eventInterface,
            fromBlock,
            toBlock,
            args,
          ) as Promise<T[]>,
      );

      const batchResults = await Promise.all(batchPromises);
      events.push(...batchResults.flat());
    }

    return events;
  } catch (error) {
    if (maxRetries > 0) {
      logger.warn(
        `Failed to fetch events Retrying: ${error instanceof Error ? error.message : "Unknown error"}.`,
      );

      return fetchEvents(publicClient, {
        ...options,
        blockRange: blockRange / 2n,
        maxRetries: maxRetries - 1,
      });
    }

    logger.error(
      `Failed to fetch events max retry reached: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};

export const validateBlockRange = (
  eventName: string,
  startBlockNumber: bigint,
  endBlockNumber: bigint,
) => {
  logger.info(`Fetching ${eventName} from block ${startBlockNumber} to ${endBlockNumber}`);

  if (startBlockNumber > endBlockNumber) {
    throw new Error(
      `startBlockNumber ${startBlockNumber} is greater than currentBlockNumber ${endBlockNumber}`,
    );
  }
};
