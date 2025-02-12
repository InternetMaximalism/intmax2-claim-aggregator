import { createNetworkClient, eventPrisma } from "@intmax2-claim-aggregator/shared";
import { CLAIM_EVENT_NAMES } from "../types";
import { handleAllWithdrawalEvents } from "./event.service";
import { batchUpdateClaimStatusTransactions } from "./claim.service";

export const performJob = async (): Promise<void> => {
  const ethereumClient = createNetworkClient("scroll");

  const [events, currentBlockNumber] = await Promise.all([
    eventPrisma.event.findMany({
      where: {
        name: {
          in: CLAIM_EVENT_NAMES,
        },
      },
    }),
    ethereumClient.getBlockNumber(),
  ]);

  const { directWithdrawalQueues } = await handleAllWithdrawalEvents(
    ethereumClient,
    currentBlockNumber,
    events,
  );

  await batchUpdateClaimStatusTransactions(directWithdrawalQueues);

  await eventPrisma.$transaction(
    CLAIM_EVENT_NAMES.map((eventName) =>
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
