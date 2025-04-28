import { eventSchema } from "../db";

export const getStartBlockNumber = (
  lastProcessedEvent: typeof eventSchema.$inferSelect | null,
  deployedBlockNumber: bigint,
) => {
  return lastProcessedEvent?.lastBlockNumber
    ? lastProcessedEvent.lastBlockNumber + BigInt(1)
    : deployedBlockNumber;
};
