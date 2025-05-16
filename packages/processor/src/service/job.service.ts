import {
  ClaimGroupStatus,
  ClaimManager,
  EXECUTION_REVERTED_ERROR_MESSAGE,
  type QueueJobData,
  claimSchema,
  logger,
  timeOperation,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { inArray } from "drizzle-orm";
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

    const txHash = await processClaimGroup(group.requestingClaims);

    await withdrawalDB
      .update(claimSchema)
      .set({
        status: "verified",
        submitClaimProofTxHash: txHash,
      })
      .where(
        inArray(
          claimSchema.uuid,
          group.requestingClaims.map((claim) => claim.uuid),
        ),
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error(`Error processing claim group ${groupId}: ${message}`);

    if (message.includes(EXECUTION_REVERTED_ERROR_MESSAGE)) {
      logger.warn(`Marking all claims in group ${groupId} as failed`);

      const group = await claimManager.getGroup(groupId);

      await withdrawalDB
        .update(claimSchema)
        .set({
          status: "failed",
        })
        .where(
          inArray(
            claimSchema.uuid,
            group!.requestingClaims.map((claim) => claim.uuid),
          ),
        );
    }
  } finally {
    await claimManager.deleteGroup(groupId);
  }
};
