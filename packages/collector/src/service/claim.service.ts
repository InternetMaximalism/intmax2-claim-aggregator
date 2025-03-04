import {
  ClaimGroupStatus,
  ClaimManager,
  ClaimStatus,
  QueueManager,
  type RequestingClaim,
  WithdrawalPrisma,
  logger,
  withdrawalPrisma,
} from "@intmax2-claim-aggregator/shared";

export const fetchRequestingClaims = async () => {
  const processedUUIDs = await ClaimManager.getInstance("claim-aggregator").getAllProcessedUUIDs();

  const requestingClaims = await withdrawalPrisma.claim.findMany({
    select: {
      uuid: true,
      createdAt: true,
    },
    where: {
      status: ClaimStatus.requested,
      uuid: {
        notIn: processedUUIDs,
      },
    },
    orderBy: {
      createdAt: WithdrawalPrisma.SortOrder.asc,
    },
  });

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
