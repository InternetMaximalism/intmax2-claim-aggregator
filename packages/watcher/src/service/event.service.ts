import {
  BLOCK_RANGE_MINIMUM,
  CLAIM_CONTRACT_ADDRESS,
  CLAIM_CONTRACT_DEPLOYED_BLOCK_NUMBER,
  type DirectWithdrawalQueuedEvent,
  directWithdrawalQueuedEvent,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK_NUMBER,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import type { NetworkState, WatcherEventType } from "../types";

const handleWithdrawalEvent = async <
  T extends { args: { withdrawalHash: string }; transactionHash: string },
>(
  publicClient: PublicClient,
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

  const events = await fetchEvents<T>(publicClient, {
    startBlockNumber,
    endBlockNumber,
    blockRange: BLOCK_RANGE_MINIMUM,
    eventInterface,
    contractAddress,
  });

  return {
    events: events.map(({ args, transactionHash }) => ({
      ...args,
      transactionHash,
    })) as (T["args"] & { transactionHash: T["transactionHash"] })[],
    eventName: eventName,
    currentBlockNumber: endBlockNumber,
  };
};

export const handleAllWithdrawalEvents = async (
  networkState: NetworkState,
  events: { name: string; lastBlockNumber: bigint }[],
) => {
  const { l1Client, l2Client, currentBlockNumber, scrollCurrentBlockNumber } = networkState;

  const [directWithdrawalQueueState, directWithdrawalSuccessState] = await Promise.all([
    handleWithdrawalEvent<DirectWithdrawalQueuedEvent>(l2Client, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(
        events,
        "ClaimWatcherDirectWithdrawalQueued",
        CLAIM_CONTRACT_DEPLOYED_BLOCK_NUMBER,
      ),
      endBlockNumber: scrollCurrentBlockNumber,
      eventInterface: directWithdrawalQueuedEvent,
      eventName: "ClaimWatcherDirectWithdrawalQueued",
      contractAddress: CLAIM_CONTRACT_ADDRESS,
    }),
    handleWithdrawalEvent<DirectWithdrawalQueuedEvent>(l1Client, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(
        events,
        "ClaimWatcherDirectWithdrawalSuccessed",
        LIQUIDITY_CONTRACT_DEPLOYED_BLOCK_NUMBER,
      ),
      endBlockNumber: currentBlockNumber,
      eventInterface: directWithdrawalSuccessedEvent,
      eventName: "ClaimWatcherDirectWithdrawalSuccessed",
      contractAddress: LIQUIDITY_CONTRACT_ADDRESS,
    }),
  ]);

  return [directWithdrawalQueueState, directWithdrawalSuccessState];
};

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
