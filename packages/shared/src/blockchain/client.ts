import { type Chain, http } from "viem";
import * as chains from "viem/chains";
import { config } from "../config";
import type { NetworkLayer } from "../types";

const l1Rpcs = config.L1_RPC_URLS.map((rpc) => http(rpc));
const l2Rpcs = config.L2_RPC_URLS.map((rpc) => http(rpc));

type ClientConfig = {
  chain: Chain;
  rpcUrls: typeof l1Rpcs | typeof l2Rpcs;
};

export const getClientConfig = (networkLayer: NetworkLayer): ClientConfig => {
  if (networkLayer === "l1") {
    return {
      chain: chains[config.L1_CHAIN as keyof typeof chains],
      rpcUrls: l1Rpcs,
    };
  }

  return {
    chain: chains[config.L2_CHAIN as keyof typeof chains],
    rpcUrls: l2Rpcs,
  };
};
