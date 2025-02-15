import { createNetworkClient, eventPrisma } from "@intmax2-claim-aggregator/shared";
import { WATCHER_EVENT_NAMES } from "../types";
import { batchUpdateClaimStatusTransactions } from "./claim.service";
import { handleAllWithdrawalEvents } from "./event.service";

export const performJob = async (): Promise<void> => {
  const ethereumClient = createNetworkClient("scroll");
  const [currentBlockNumber, events] = await Promise.all([
    ethereumClient.getBlockNumber(),
    eventPrisma.event.findMany({
      where: {
        name: {
          in: WATCHER_EVENT_NAMES,
        },
      },
    }),
  ]);

  const { directWithdrawalQueues } = await handleAllWithdrawalEvents(
    ethereumClient,
    currentBlockNumber,
    events,
  );

  await batchUpdateClaimStatusTransactions(directWithdrawalQueues);

  await eventPrisma.$transaction(
    WATCHER_EVENT_NAMES.map((eventName) =>
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
