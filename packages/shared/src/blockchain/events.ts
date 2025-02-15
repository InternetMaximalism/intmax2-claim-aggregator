import { type AbiEvent, parseAbiItem } from "abitype";
import type { PublicClient } from "viem";

export const directWithdrawalSuccessedEvent = parseAbiItem(
  "event DirectWithdrawalSuccessed(bytes32 indexed withdrawalHash, address indexed recipient)",
);

export const directWithdrawalQueuedEvent = parseAbiItem(
  "event DirectWithdrawalQueued(bytes32 indexed withdrawalHash, address indexed recipient, (address recipient, uint32 tokenIndex, uint256 amount, bytes32 nullifier) withdrawal)",
);

export const contributionRecordedEvent = parseAbiItem(
  "event ContributionRecorded(uint256 indexed period, address indexed recipient, uint256 depositAmount, uint256 contribution)",
);

export const getEventLogs = async (
  client: PublicClient,
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint,
  args?: Record<string, unknown>,
) => {
  const logs = await client.getLogs({
    address,
    event,
    args,
    fromBlock,
    toBlock,
  });
  return logs;
};
