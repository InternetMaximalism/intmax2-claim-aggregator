import {
  BLOCK_RANGE_MINIMUM,
  type DirectWithdrawalQueuedEvent,
  type Event,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  directWithdrawalQueuedEvent,
  fetchEvents,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import type { ClaimEventType } from "../types";

const handleWithdrawalEvent = async <T extends { args: { withdrawalHash: string } }>(
  ethereumClient: PublicClient,
  params: {
    startBlockNumber: bigint;
    endBlockNumber: bigint;
    eventInterface: ReturnType<typeof parseAbiItem>;
    eventName: ClaimEventType;
  },
) => {
  const { eventName, eventInterface, startBlockNumber, endBlockNumber } = params;

  validateBlockRange(eventName, startBlockNumber, endBlockNumber);

  const events = await fetchEvents<T>(ethereumClient, {
    startBlockNumber,
    endBlockNumber,
    blockRange: BLOCK_RANGE_MINIMUM,
    contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
    eventInterface,
  });

  return events.map(({ args }) => args) as T["args"][];
};

export const handleAllWithdrawalEvents = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  events: Event[],
) => {
  const [directWithdrawalQueues] = await Promise.all([
    handleWithdrawalEvent<DirectWithdrawalQueuedEvent>(ethereumClient, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(events, "DirectWithdrawalQueued"),
      endBlockNumber: currentBlockNumber,
      eventInterface: directWithdrawalQueuedEvent,
      eventName: "DirectWithdrawalQueued",
    }),
  ]);

  return {
    directWithdrawalQueues,
  };
};

export const getLastProcessedBlockNumberByEventName = (
  events: Event[],
  eventName: ClaimEventType,
) => {
  const filteredEvents = events.filter((event) => event.name === eventName);
  if (filteredEvents.length === 0) {
    return LIQUIDITY_CONTRACT_DEPLOYED_BLOCK;
  }

  const lastEvent = filteredEvents.reduce((prev, current) => {
    return prev.lastBlockNumber > current.lastBlockNumber ? prev : current;
  });

  return lastEvent.lastBlockNumber;
};
