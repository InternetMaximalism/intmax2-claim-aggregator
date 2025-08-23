import { createPublicClient, fallback, type PublicClient } from "viem";
import type { NetworkLayer } from "../types";
import { getClientConfig } from "./client";

export const createNetworkClient = (networkLayer: NetworkLayer) => {
  const { chain, rpcUrls } = getClientConfig(networkLayer);

  return createPublicClient({
    batch: {
      multicall: true,
    },
    chain,
    transport: fallback(rpcUrls, {
      retryCount: 3,
    }),
  }) as PublicClient;
};
