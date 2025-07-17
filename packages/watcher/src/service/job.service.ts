import { createNetworkClient, eventDB, eventSchema } from "@intmax2-claim-aggregator/shared";
import { inArray } from "drizzle-orm";
import { WATCHER_EVENT_NAMES } from "../types";
import { batchUpdateClaimStatusTransactions } from "./claim.service";
import { handleAllWithdrawalEvents } from "./event.service";
import { processClaimPeriodUpdates } from "./period.service";

export const performJob = async (): Promise<void> => {
  const [events, networkState] = await Promise.all([
    eventDB.select().from(eventSchema).where(inArray(eventSchema.name, WATCHER_EVENT_NAMES)),
    getEthereumAndScrollBlockNumbers(),
  ]);

  await processClaimPeriodUpdates(networkState, events);

  const [directWithdrawalQueueState, directWithdrawalSuccessState] =
    await handleAllWithdrawalEvents(networkState, events);

  await batchUpdateClaimStatusTransactions(
    directWithdrawalQueueState.events,
    directWithdrawalSuccessState.events,
  );

  await eventDB.transaction(async (tx) => {
    for (const { eventName, currentBlockNumber } of [
      directWithdrawalQueueState,
      directWithdrawalSuccessState,
    ]) {
      await tx
        .insert(eventSchema)
        .values({
          name: eventName,
          lastBlockNumber: currentBlockNumber,
        })
        .onConflictDoUpdate({
          target: eventSchema.name,
          set: {
            lastBlockNumber: currentBlockNumber,
          },
        });
    }
  });
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
