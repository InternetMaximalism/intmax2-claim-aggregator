import { logger } from "./logger";

type OperationResult<T> = {
  result: T;
  durationInSeconds: string;
};

export const timeOperation = async <T>(
  operation: () => Promise<T>,
): Promise<OperationResult<T>> => {
  const startTime = Date.now();
  try {
    const result = await operation();
    const durationInSeconds = (Date.now() - startTime) / 1000;
    return {
      result,
      durationInSeconds: durationInSeconds.toFixed(3),
    };
  } catch (error) {
    const durationInSeconds = (Date.now() - startTime) / 1000;
    logger.error(`Job failed after ${durationInSeconds.toFixed(3)}s`);
    throw error;
  }
};
