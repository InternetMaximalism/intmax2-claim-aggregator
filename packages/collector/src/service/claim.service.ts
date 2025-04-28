import {
  ClaimGroupStatus,
  ClaimManager,
  QueueManager,
  type RequestingClaim,
  claimSchema,
  logger,
  withdrawalDB,
} from "@intmax2-claim-aggregator/shared";
import { and, asc, eq, notInArray } from "drizzle-orm";

export const fetchRequestingClaims = async () => {
  const processedUUIDs = await ClaimManager.getInstance("claim-aggregator").getAllProcessedUUIDs();

  const requestingClaims = await withdrawalDB
    .select({
      uuid: claimSchema.uuid,
      createdAt: claimSchema.createdAt,
    })
    .from(claimSchema)
    .where(and(eq(claimSchema.status, "requested"), notInArray(claimSchema.uuid, processedUUIDs)))
    .orderBy(asc(claimSchema.createdAt));

  return requestingClaims;
};

export const createClaimGroup = async (group: RequestingClaim[]) => {
  const queueManager = QueueManager.getInstance("claim-aggregator");
  const now = new Date();

  const groupId = await ClaimManager.getInstance("claim-aggregator").addGroup({
    requestingClaims: group.map((withdrawal) => ({
      uuid: withdrawal.uuid,
    })),
    status: ClaimGroupStatus.PENDING,
    createdAt: now,
    updatedAt: now,
  });

  await queueManager.addJob("processBatch", { groupId });

  logger.debug(`Created claim group ${groupId}`);

  return groupId;
};
