import type { PublicClient } from "viem";

export const getNonce = async (publiClient: PublicClient, address: `0x${string}`) => {
  const [currentNonce, pendingNonce] = await Promise.all([
    publiClient.getTransactionCount({
      address,
    }),
    publiClient.getTransactionCount({
      address,
      blockTag: "pending",
    }),
  ]);
  const lastNonce = currentNonce - 1;

  return { pendingNonce, currentNonce, lastNonce };
};
