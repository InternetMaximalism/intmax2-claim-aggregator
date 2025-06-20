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
import { MAX_PG_SQL_PARAMS, MAX_RESULTS_LIMIT, QUERY_BATCH_SIZE } from "../constants";
import type { ClaimResult } from "../types";

export const fetchRequestingClaims = async () => {
  const processedUUIDs = await ClaimManager.getInstance("claim-aggregator").getAllProcessedUUIDs();

  if (processedUUIDs.length > MAX_PG_SQL_PARAMS) {
    return await fetchRequestingClaimsBatch(processedUUIDs);
  }

  const requestingClaims = await withdrawalDB
    .select({
      uuid: claimSchema.uuid,
      createdAt: claimSchema.createdAt,
    })
    .from(claimSchema)
    .where(and(eq(claimSchema.status, "requested"), notInArray(claimSchema.uuid, processedUUIDs)))
    .orderBy(asc(claimSchema.createdAt))
    .limit(MAX_RESULTS_LIMIT);

  return requestingClaims;
};

// NOTE: better performance
export const fetchRequestingClaimsBatch = async (
  processedUUIDs: string[],
): Promise<ClaimResult[]> => {
  const processedUUIDSet = new Set(processedUUIDs);
  const results: ClaimResult[] = [];
  let offset = 0;
  let totalFetched = 0;

  while (results.length < MAX_RESULTS_LIMIT) {
    const batch = await withdrawalDB
      .select({
        uuid: claimSchema.uuid,
        createdAt: claimSchema.createdAt,
      })
      .from(claimSchema)
      .where(eq(claimSchema.status, "requested"))
      .orderBy(asc(claimSchema.createdAt))
      .limit(QUERY_BATCH_SIZE)
      .offset(offset);

    if (batch.length === 0) {
      break;
    }

    totalFetched += batch.length;

    const filtered = batch.filter((claim) => !processedUUIDSet.has(claim.uuid));

    const remainingSlots = MAX_RESULTS_LIMIT - results.length;
    const toAdd = filtered.slice(0, remainingSlots);
    results.push(...toAdd);

    logger.info(
      `Batch: ${batch.length} fetched, ${filtered.length} unprocessed, ${toAdd.length} added (total results: ${results.length}/${MAX_RESULTS_LIMIT})`,
    );

    if (results.length >= MAX_RESULTS_LIMIT) {
      break;
    }

    offset += QUERY_BATCH_SIZE;
  }

  logger.info(
    `Batch processing completed: ${results.length} unprocessed claims found from ${totalFetched} total fetched records`,
  );

  return results;
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
