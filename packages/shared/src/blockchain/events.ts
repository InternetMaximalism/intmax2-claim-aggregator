import { type AbiEvent, parseAbiItem } from "abitype";
import type { PublicClient } from "viem";

export const directWithdrawalSuccessedEvent = parseAbiItem(
  "event DirectWithdrawalSuccessed(bytes32 indexed withdrawalHash, address indexed recipient)",
);

export const withdrawalClaimableEvent = parseAbiItem(
  "event WithdrawalClaimable(bytes32 indexed withdrawalHash)",
);

export const claimedWithdrawalEvent = parseAbiItem(
  "event ClaimedWithdrawal(address indexed recipient, bytes32 indexed withdrawalHash)",
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
