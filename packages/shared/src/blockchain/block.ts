import type { Event } from "../db";

export const getStartBlockNumber = (
  lastProcessedEvent: Event | null,
  deployedBlockNumber: bigint,
) => {
  return lastProcessedEvent?.lastBlockNumber
    ? lastProcessedEvent.lastBlockNumber + BigInt(1)
    : deployedBlockNumber;
};
