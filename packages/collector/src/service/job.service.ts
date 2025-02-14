import { type RequestingClaim, config, logger } from "@intmax2-claim-aggregator/shared";
import { differenceInMinutes } from "date-fns";
import { chunkArray } from "../lib/utils";
import { createClaimGroup, fetchRequestingClaims } from "./claim.service";

export const performJob = async (): Promise<void> => {
  const requestingClaims = await fetchRequestingClaims();

  if (requestingClaims.length === 0) {
    logger.info("No requesting claims found");
    return;
  }

  const shouldProcess = shouldProcessClaims(requestingClaims);
  if (!shouldProcess) {
    logger.info("Conditions not met for processing withdrawals");
    return;
  }

  const claimGroups = chunkArray<RequestingClaim>(requestingClaims, config.CLAIM_GROUP_SIZE);

  const groupIds = await Promise.all(claimGroups.map(createClaimGroup));

  logger.info(
    `Successfully processed requesting claims ${requestingClaims.length} claims and created ${groupIds.length} groups`,
  );
};

const shouldProcessClaims = (requestingClaims: Array<RequestingClaim & { createdAt: Date }>) => {
  const oldestClaim = requestingClaims[0];
  const minutesSinceOldestClaim = differenceInMinutes(new Date(), new Date(oldestClaim.createdAt));
  const hasEnoughClaims = requestingClaims.length >= config.CLAIM_MIN_BATCH_SIZE;
  const isOldEnough = minutesSinceOldestClaim >= config.CLAIM_MIN_WAIT_MINUTES;

  logger.info(
    `shouldProcessClaims hasEnoughClaims: ${hasEnoughClaims} isOldEnough: ${isOldEnough}`,
  );

  return hasEnoughClaims || isOldEnough;
};
