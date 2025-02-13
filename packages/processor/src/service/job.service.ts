import {
  ClaimGroupStatus,
  ClaimManager,
  ClaimStatus,
  EXECUTION_REVERTED_ERROR_MESSAGE,
  type QueueJobData,
  logger,
  timeOperation,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";
import { processClaimGroup } from "./claim.service";

export const processQueueJob = async (jobData: QueueJobData) => {
  return await timeOperation(async () => await performJob(jobData));
};

const performJob = async (data: QueueJobData): Promise<void> => {
  const claimManager = ClaimManager.getInstance("claim-aggregator");
  const { groupId } = data.payload;

  try {
    const group = await claimManager.getGroup(groupId);
    if (!group) {
      logger.warn(`Claim group ${groupId} not found`);
      return;
    }

    await claimManager.updateGroup(groupId, {
      status: ClaimGroupStatus.PROCESSING,
    });

    await processClaimGroup(group.requestingClaims);

    await withdrawalPrisma.claim.updateMany({
      where: {
        uuid: {
          in: group.requestingClaims.map((claim) => claim.uuid),
        },
      },
      data: {
        status: ClaimStatus.verified, // NOTE: verified
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error(`Error processing claim group ${groupId}: ${message}`);

    if (message.includes(EXECUTION_REVERTED_ERROR_MESSAGE)) {
      logger.warn(`Marking all claims in group ${groupId} as failed`);

      const group = await claimManager.getGroup(groupId);
      await withdrawalPrisma.claim.updateMany({
        where: {
          uuid: {
            in: group!.requestingClaims.map((claim) => claim.uuid),
          },
        },
        data: {
          status: ClaimStatus.failed,
        },
      });
    }
  } finally {
    await claimManager.deleteGroup(groupId);
  }
};
