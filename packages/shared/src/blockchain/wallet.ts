import { http, createWalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { config } from "../config";
import { networkConfig } from "./network";

type WalletType = "builder" | "depositAnalyzer" | "withdrawal" | "blockBuilderReward";

const walletConfigs: Record<WalletType, number> = {
  builder: 0,
  depositAnalyzer: 1,
  withdrawal: 2,
  blockBuilderReward: 3,
};

export const getWalletClient = (
  type: WalletType,
  network: "ethereum" | "scroll",
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

  const { chain, rpcUrl } = networkConfig[network][config.NETWORK_ENVIRONMENT];

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  return {
    account,
    walletClient: client,
  };
};
