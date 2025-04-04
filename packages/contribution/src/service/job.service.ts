import { createNetworkClient } from "@intmax2-claim-aggregator/shared";
import { relayContribution } from "./submit.service";

export const performJob = async () => {
  const ethereumClient = createNetworkClient("scroll");

  await relayContribution(ethereumClient, {
    period: 1n,
    recipients: [],
  });
};
