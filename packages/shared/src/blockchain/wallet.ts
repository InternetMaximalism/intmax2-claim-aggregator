import { createWalletClient, fallback } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { config } from "../config";
import type { NetworkLayer } from "../types";
import { getClientConfig } from "./client";

type WalletType = "builder" | "depositAnalyzer" | "withdrawal" | "blockBuilderReward";

const walletConfigs: Record<WalletType, number> = {
  builder: 0,
  depositAnalyzer: 1,
  withdrawal: 2,
  blockBuilderReward: 3,
};

export const getWalletClient = (
  type: WalletType,
  networkLayer: NetworkLayer,
): {
  account: ReturnType<typeof mnemonicToAccount>;
  walletClient: ReturnType<typeof createWalletClient>;
} => {
  const addressIndex = walletConfigs[type];
  if (addressIndex === undefined) {
    throw new Error(`Invalid wallet type: ${type}`);
  }
  const account = mnemonicToAccount(config.INTMAX2_OWNER_MNEMONIC, {
    accountIndex: 0,
    addressIndex,
  });

  const { chain, rpcUrls } = getClientConfig(networkLayer);

  const client = createWalletClient({
    account,
    chain,
    transport: fallback(rpcUrls, {
      retryCount: 3,
    }),
  });

  return {
    account,
    walletClient: client,
  };
};
