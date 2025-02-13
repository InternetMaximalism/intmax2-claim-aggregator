import {
  type Event,
  createNetworkClient,
  eventPrisma,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { getContributionParams, getContributionRecordedEvents } from "./event.service";
import { relayClaims } from "./submit.service";

export const performJob = async () => {
  const ethereumClient = createNetworkClient("scroll");
  const [currentBlockNumber, lastProcessedEvent] = await Promise.all([
    ethereumClient.getBlockNumber(),
    eventPrisma.event.findFirst({
      where: {
        name: "ContributionRecorded",
      },
    }),
  ]);

  await processDispatcher(ethereumClient, currentBlockNumber, lastProcessedEvent);
  await updateEventState(currentBlockNumber);
};

const processDispatcher = async (
  ethereumClient: ReturnType<typeof createNetworkClient>,
  currentBlockNumber: bigint,
  lastProcessedEvent: Event | null,
) => {
  const contributionRecordedEvents = await getContributionRecordedEvents(
    ethereumClient,
    currentBlockNumber,
    lastProcessedEvent,
  );

  if (contributionRecordedEvents.length === 0) {
    logger.info("No new contribution found.");
    return;
  }

  const contributionParams = getContributionParams(contributionRecordedEvents);

  await relayClaims(ethereumClient, contributionParams);
};

const updateEventState = async (currentBlockNumber: bigint) => {
  await eventPrisma.event.upsert({
    where: {
      name: "ContributionRecorded",
    },
    create: {
      name: "ContributionRecorded",
      lastBlockNumber: currentBlockNumber,
    },
    update: {
      lastBlockNumber: currentBlockNumber,
    },
  });
};
