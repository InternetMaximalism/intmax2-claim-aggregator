import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getContract } from "viem";
import {
  CLAIM_CONTRACT_ADDRESS,
  ClaimAbi,
  createNetworkClient,
  getBlockNumberByTimestamp,
  logger,
  sleep,
} from "@intmax2-claim-aggregator/shared";
import { getPeriodBlockIntervals } from "./period.service";
import { PERIOD_BATCH_DELAY } from "../constants";
import type { AllocationConstants } from "../types";

vi.mock("viem", () => ({
  getContract: vi.fn(),
}));

vi.mock("@intmax2-claim-aggregator/shared", () => ({
  CLAIM_CONTRACT_ADDRESS: "0x1234567890123456789012345678901234567890",
  ClaimAbi: [],
  createNetworkClient: vi.fn(),
  getBlockNumberByTimestamp: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
  sleep: vi.fn(),
}));

const mockGetContract = vi.mocked(getContract);
const mockGetBlockNumberByTimestamp = vi.mocked(getBlockNumberByTimestamp);
const mockSleep = vi.mocked(sleep);
const mockLogger = vi.mocked(logger);

describe("period.service", () => {
  const mockEthereumClient = {} as ReturnType<typeof createNetworkClient>;

  const mockAllocationConstants: AllocationConstants = {
    startTimestamp: 1000000000n,
    periodInterval: 86400n,
    genesisTimestamp: 1000000000n,
    phase0RewardPerDay: 100n,
    numPhases: 10n,
    phase0Period: 365n,
  };

  const mockContract = {
    read: {
      getCurrentPeriod: vi.fn(),
      getAllocationConstants: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContract.mockReturnValue(mockContract as any);
    mockContract.read.getAllocationConstants.mockResolvedValue(mockAllocationConstants);
    mockGetBlockNumberByTimestamp.mockResolvedValue(1000n);
    mockSleep.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPeriodBlockIntervals", () => {
    it("should return empty array when current period is already processed", async () => {
      const currentPeriod = 5n;
      const lastClaimPeriod = { period: 5n };

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith("Current period is already processed.");
    });

    it("should throw error when last claim period is greater than current period", async () => {
      const currentPeriod = 3n;
      const lastClaimPeriod = { period: 5n };

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);

      await expect(getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod)).rejects.toThrow(
        "Last claim period is greater than current period. Last claim period: 5, current period: 3",
      );
    });

    it("should process unprocessed periods when lastClaimPeriod is null", async () => {
      const currentPeriod = 2n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp
        .mockResolvedValueOnce(1000n)
        .mockResolvedValueOnce(1100n)
        .mockResolvedValueOnce(1200n)
        .mockResolvedValueOnce(1300n);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        periodInfo: {
          period: 0n,
          startTime: mockAllocationConstants.startTimestamp,
          endTime:
            mockAllocationConstants.startTimestamp + mockAllocationConstants.periodInterval - 1n,
        },
        startBlockNumber: 1000n,
        endBlockNumber: 1100n,
      });
      expect(result[1]).toEqual({
        periodInfo: {
          period: 1n,
          startTime:
            mockAllocationConstants.startTimestamp + mockAllocationConstants.periodInterval,
          endTime:
            mockAllocationConstants.startTimestamp +
            2n * mockAllocationConstants.periodInterval -
            1n,
        },
        startBlockNumber: 1200n,
        endBlockNumber: 1300n,
      });
    });

    it("should process unprocessed periods when lastClaimPeriod is provided", async () => {
      const currentPeriod = 3n;
      const lastClaimPeriod = { period: 1n };

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValueOnce(1200n).mockResolvedValueOnce(1300n);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        periodInfo: {
          period: 2n,
          startTime:
            mockAllocationConstants.startTimestamp + 2n * mockAllocationConstants.periodInterval,
          endTime:
            mockAllocationConstants.startTimestamp +
            3n * mockAllocationConstants.periodInterval -
            1n,
        },
        startBlockNumber: 1200n,
        endBlockNumber: 1300n,
      });
    });

    it("should process periods in batches with delay", async () => {
      const currentPeriod = 5n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);

      for (let i = 0; i < 5; i++) {
        mockGetBlockNumberByTimestamp
          .mockResolvedValueOnce(BigInt(1000 + i * 100))
          .mockResolvedValueOnce(BigInt(1050 + i * 100));
      }

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toHaveLength(5);

      expect(mockSleep).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledWith(PERIOD_BATCH_DELAY);
    });

    it("should handle contract read errors", async () => {
      const lastClaimPeriod = null;
      const error = new Error("Contract read failed");

      mockContract.read.getCurrentPeriod.mockRejectedValue(error);

      await expect(getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod)).rejects.toThrow(
        "Contract read failed",
      );
    });

    it("should handle getBlockNumberByTimestamp errors", async () => {
      const currentPeriod = 1n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockRejectedValue(new Error("Block number fetch failed"));

      await expect(getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod)).rejects.toThrow(
        "Block number fetch failed",
      );
    });

    it("should call getContract with correct parameters", async () => {
      const currentPeriod = 1n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValueOnce(1000n).mockResolvedValueOnce(1100n);

      await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(mockGetContract).toHaveBeenCalledWith({
        address: CLAIM_CONTRACT_ADDRESS,
        abi: ClaimAbi,
        client: mockEthereumClient,
      });
    });

    it("should call getBlockNumberByTimestamp with correct parameters", async () => {
      const currentPeriod = 1n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValueOnce(1000n).mockResolvedValueOnce(1100n);

      await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      const expectedStartTime = Number(mockAllocationConstants.startTimestamp);
      const expectedEndTime = Number(
        mockAllocationConstants.startTimestamp + mockAllocationConstants.periodInterval - 1n,
      );

      expect(mockGetBlockNumberByTimestamp).toHaveBeenCalledWith(
        "scroll",
        expectedStartTime,
        "after",
      );
      expect(mockGetBlockNumberByTimestamp).toHaveBeenCalledWith(
        "scroll",
        expectedEndTime,
        "before",
      );
    });

    it("should log debug information", async () => {
      const currentPeriod = 1n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValueOnce(1000n).mockResolvedValueOnce(1100n);

      await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `currentPeriod: ${currentPeriod} periodInterval: ${mockAllocationConstants.periodInterval} startTimestamp: ${mockAllocationConstants.startTimestamp}`,
      );
    });

    it("should handle empty periods correctly", async () => {
      const currentPeriod = 0n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toEqual([]);
      expect(mockGetBlockNumberByTimestamp).not.toHaveBeenCalled();
    });

    it("should process single period correctly", async () => {
      const currentPeriod = 1n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValueOnce(1000n).mockResolvedValueOnce(1100n);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result).toHaveLength(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it("should calculate period times correctly", async () => {
      const currentPeriod = 2n;
      const lastClaimPeriod = null;

      mockContract.read.getCurrentPeriod.mockResolvedValue(currentPeriod);
      mockGetBlockNumberByTimestamp.mockResolvedValue(1000n);

      const result = await getPeriodBlockIntervals(mockEthereumClient, lastClaimPeriod);

      expect(result[0].periodInfo).toEqual({
        period: 0n,
        startTime: mockAllocationConstants.startTimestamp,
        endTime:
          mockAllocationConstants.startTimestamp + mockAllocationConstants.periodInterval - 1n,
      });

      expect(result[1].periodInfo).toEqual({
        period: 1n,
        startTime: mockAllocationConstants.startTimestamp + mockAllocationConstants.periodInterval,
        endTime:
          mockAllocationConstants.startTimestamp + 2n * mockAllocationConstants.periodInterval - 1n,
      });
    });
  });
});
