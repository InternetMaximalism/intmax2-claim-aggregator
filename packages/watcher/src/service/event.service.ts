import {
  BLOCK_RANGE_MINIMUM,
  type DirectWithdrawalSuccessedEvent,
  type Event,
  LIQUIDITY_CONTRACT_ADDRESS,
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
  directWithdrawalSuccessedEvent,
  fetchEvents,
  validateBlockRange,
} from "@intmax2-claim-aggregator/shared";
import { parseAbiItem } from "abitype";
import type { PublicClient } from "viem";
import type { WithdrawalEventType } from "../types";

const handleWithdrawalEvent = async <T extends { args: { withdrawalHash: string } }>(
  ethereumClient: PublicClient,
  params: {
    startBlockNumber: bigint;
    endBlockNumber: bigint;
    eventInterface: ReturnType<typeof parseAbiItem>;
    eventName: WithdrawalEventType;
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

  return events.map((log) => ({
    withdrawalHash: log.args.withdrawalHash,
  }));
};

export const handleAllWithdrawalEvents = async (
  ethereumClient: PublicClient,
  currentBlockNumber: bigint,
  events: Event[],
) => {
  const [claimDirectWithdrawals] = await Promise.all([
    handleWithdrawalEvent<DirectWithdrawalSuccessedEvent>(ethereumClient, {
      startBlockNumber: getLastProcessedBlockNumberByEventName(
        events,
        "ClaimDirectWithdrawalSuccessed",
      ),
      endBlockNumber: currentBlockNumber,
      eventInterface: directWithdrawalSuccessedEvent,
      eventName: "ClaimDirectWithdrawalSuccessed",
    }),
  ]);

  return {
    claimDirectWithdrawals,
  };
};

export const getLastProcessedBlockNumberByEventName = (
  events: Event[],
  eventName: WithdrawalEventType,
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
