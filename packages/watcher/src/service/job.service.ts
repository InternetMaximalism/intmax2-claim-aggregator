import { createNetworkClient, eventDB, eventSchema } from "@intmax2-claim-aggregator/shared";
import { inArray } from "drizzle-orm";
import { WATCHER_EVENT_NAMES } from "../types";
import { batchUpdateClaimStatusTransactions } from "./claim.service";
import { handleAllWithdrawalEvents } from "./event.service";

export const performJob = async (): Promise<void> => {
  const [events, networkState] = await Promise.all([
    eventDB.select().from(eventSchema).where(inArray(eventSchema.name, WATCHER_EVENT_NAMES)),
    getEthereumAndScrollBlockNumbers(),
  ]);

  const [directWithdrawalQueueState, directWithdrawalSuccessState] =
    await handleAllWithdrawalEvents(networkState, events);

  await batchUpdateClaimStatusTransactions(
    directWithdrawalQueueState.eventLogs,
    directWithdrawalSuccessState.eventLogs,
  );

  await eventPrisma.$transaction(
    [directWithdrawalQueueState, directWithdrawalSuccessState].map(
      ({ eventName, currentBlockNumber }) =>
        eventPrisma.event.upsert({
          where: {
            name: eventName,
          },
          create: {
            name: eventName,
            lastBlockNumber: currentBlockNumber,
          },
          update: {
            lastBlockNumber: currentBlockNumber,
          },
        }),
    ),
  );
};

const getEthereumAndScrollBlockNumbers = async () => {
  const ethereumClient = createNetworkClient("ethereum");
  const scrollClient = createNetworkClient("scroll");

  const [currentBlockNumber, scrollCurrentBlockNumber] = await Promise.all([
    ethereumClient.getBlockNumber(),
    scrollClient.getBlockNumber(),
  ]);

  return {
    ethereumClient,
    scrollClient,
    currentBlockNumber,
    scrollCurrentBlockNumber,
  };
};
