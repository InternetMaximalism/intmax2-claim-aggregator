import type { WatcherEventType } from "../types";

export const getLastProcessedBlockNumberByEventName = (
  events: { name: string; lastBlockNumber: bigint }[],
  eventName: WatcherEventType,
  deployedBlock: bigint,
) => {
  const filteredEvents = events.filter((event) => event.name === eventName);
  if (filteredEvents.length === 0) {
    return deployedBlock;
  }

  const lastEvent = filteredEvents.reduce((prev, current) => {
    return prev.lastBlockNumber > current.lastBlockNumber ? prev : current;
  });

  return lastEvent.lastBlockNumber;
};
