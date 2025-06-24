import { logger } from "@intmax2-claim-aggregator/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chunkArray } from "../lib/utils";
import { createClaimGroup, fetchRequestingClaims } from "./claim.service";
import { performJob } from "./job.service";

vi.mock("./claim.service");
vi.mock("@intmax2-claim-aggregator/shared", () => ({
  config: {
    CLAIM_GROUP_SIZE: 10,
    CLAIM_MIN_BATCH_SIZE: 5,
    CLAIM_MIN_WAIT_MINUTES: 30,
  },
  logger: {
    info: vi.fn(),
  },
}));
vi.mock("../lib/utils");

const mockFetchRequestingClaims = vi.mocked(fetchRequestingClaims);
const mockCreateClaimGroup = vi.mocked(createClaimGroup);
const mockChunkArray = vi.mocked(chunkArray);

describe("performJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exit early when no requesting claims are found", async () => {
    mockFetchRequestingClaims.mockResolvedValue([]);

    await performJob();

    expect(logger.info).toHaveBeenCalledWith("No requesting claims found");
    expect(mockCreateClaimGroup).not.toHaveBeenCalled();
  });

  it("should exit early when processing conditions are not met", async () => {
    const mockClaims = [
      { nullifier: "1", createdAt: new Date() },
      { nullifier: "2", createdAt: new Date() },
    ];
    mockFetchRequestingClaims.mockResolvedValue(mockClaims);

    await performJob();

    expect(logger.info).toHaveBeenCalledWith("Conditions not met for processing claims");
    expect(mockCreateClaimGroup).not.toHaveBeenCalled();
  });

  it("should create claim groups when there are enough claims", async () => {
    const mockClaims = Array.from({ length: 15 }, (_, i) => ({
      nullifier: `${i + 1}`,
      createdAt: new Date(),
    }));

    mockFetchRequestingClaims.mockResolvedValue(mockClaims);
    mockChunkArray.mockReturnValue([mockClaims.slice(0, 10), mockClaims.slice(10, 15)]);
    mockCreateClaimGroup.mockResolvedValue("group-id");

    await performJob();

    expect(mockChunkArray).toHaveBeenCalledWith(mockClaims, 10);
    expect(mockCreateClaimGroup).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      "Successfully processed requesting claims 15 claims and created 2 groups",
    );
  });

  it("should process claims when they are old enough, even with small quantity", async () => {
    const oldDate = new Date();
    oldDate.setMinutes(oldDate.getMinutes() - 35);

    const mockClaims = [
      { nullifier: "1", createdAt: oldDate },
      { nullifier: "2", createdAt: new Date() },
    ];

    mockFetchRequestingClaims.mockResolvedValue(mockClaims);
    mockChunkArray.mockReturnValue([mockClaims]);
    mockCreateClaimGroup.mockResolvedValue("group-id");

    await performJob();

    expect(mockCreateClaimGroup).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "Successfully processed requesting claims 2 claims and created 1 groups",
    );
  });

  it("should propagate error when createClaimGroup fails", async () => {
    const mockClaims = Array.from({ length: 10 }, (_, i) => ({
      nullifier: `${i + 1}`,
      createdAt: new Date(),
    }));

    mockFetchRequestingClaims.mockResolvedValue(mockClaims);
    mockChunkArray.mockReturnValue([mockClaims]);
    mockCreateClaimGroup.mockRejectedValue(new Error("Database error"));

    await expect(performJob()).rejects.toThrow("Database error");
  });
});
