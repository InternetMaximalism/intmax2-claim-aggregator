import {
  BLOCK_RANGE_MINIMUM,
  CLAIM_CONTRACT_ADDRESS,
  CLAIM_CONTRACT_DEPLOYED_BLOCK,
  type DirectWithdrawalQueuedEvent,
  type Event,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  directWithdrawalQueuedEvent,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import type { NetworkState, WatcherEventType } from "../types";

const handleWithdrawalEvent = async <T extends { args: { withdrawalHash: string } }>(
  ethereumClient: PublicClient,
  params: {
    startBlockNumber: bigint;
    endBlockNumber: bigint;
    eventInterface: ReturnType<typeof parseAbiItem>;
    eventName: WatcherEventType;
    contractAddress: `0x${string}`;
  },
) => {
  const { startBlockNumber, endBlockNumber, eventName, eventInterface, contractAddress } = params;

  validateBlockRange(eventName, startBlockNumber, endBlockNumber);

  const events = await fetchEvents<T>(ethereumClient, {
    startBlockNumber,
    endBlockNumber,
    blockRange: BLOCK_RANGE_MINIMUM,
    eventInterface,
    contractAddress,
  });

  return {
    eventLogs: events.map(({ args }) => args) as T["args"][],
    eventName: eventName,
    currentBlockNumber: endBlockNumber,
  };
};

export const handleAllWithdrawalEvents = async (networkState: NetworkState, events: Event[]) => {
  const { ethereumClient, scrollClient, currentBlockNumber, scrollCurrentBlockNumber } =
    networkState;

  const [directWithdrawalQueueState, directWithdrawalSuccessState] = await Promise.all([
    handleWithdrawalEvent<DirectWithdrawalQueuedEvent>(scrollClient, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(
        events,
        "DirectWithdrawalQueued",
        CLAIM_CONTRACT_DEPLOYED_BLOCK,
      ),
      endBlockNumber: scrollCurrentBlockNumber,
      eventInterface: directWithdrawalQueuedEvent,
      eventName: "DirectWithdrawalQueued",
      contractAddress: CLAIM_CONTRACT_ADDRESS,
    }),
    handleWithdrawalEvent<DirectWithdrawalQueuedEvent>(ethereumClient, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(
        events,
        "DirectWithdrawalSuccessed",
        LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
      ),
      endBlockNumber: currentBlockNumber,
      eventInterface: directWithdrawalSuccessedEvent,
      eventName: "DirectWithdrawalSuccessed",
      contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
    }),
  ]);

  return [directWithdrawalQueueState, directWithdrawalSuccessState];
};

export const getLastProcessedBlockNumberByEventName = (
  events: Event[],
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
