import { createNetworkClient, eventPrisma } from "@intmax2-claim-aggregator/shared";
import { WITHDRAWAL_EVENT_NAMES } from "../types";
import { handleAllWithdrawalEvents } from "./event.service";
import { batchUpdateWithdrawalStatusTransactions } from "./withdrawal.service";

export const performJob = async (): Promise<void> => {
  const ethereumClient = createNetworkClient("scroll");

  const [events, currentBlockNumber] = await Promise.all([
    eventPrisma.event.findMany({
      where: {
        name: {
          in: WITHDRAWAL_EVENT_NAMES,
        },
      },
    }),
    ethereumClient.getBlockNumber(),
  ]);

  const { claimDirectWithdrawals } = await handleAllWithdrawalEvents(
    ethereumClient,
    currentBlockNumber,
    events,
  );

  await batchUpdateWithdrawalStatusTransactions(claimDirectWithdrawals);

  await eventPrisma.$transaction(
    WITHDRAWAL_EVENT_NAMES.map((eventName) =>
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
