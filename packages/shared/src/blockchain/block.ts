import type { Event } from "../db";

export const getStartBlockNumber = (
  lastProcessedEvent: Event | null,
  deployedBlockNumber: number,
) => {
  return lastProcessedEvent?.lastBlockNumber
    ? lastProcessedEvent.lastBlockNumber + BigInt(1)
    : BigInt(deployedBlockNumber);
};
