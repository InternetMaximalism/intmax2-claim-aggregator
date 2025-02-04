import { config } from "./config";

// block event
export const BLOCK_RANGE_MINIMUM = 10000n;

// config
export const LIQUIDITY_CONTRACT_ADDRESS = config.LIQUIDITY_CONTRACT_ADDRESS as `0x${string}`;
export const LIQUIDITY_CONTRACT_DEPLOYED_BLOCK = BigInt(
  config.LIQUIDITY_CONTRACT_DEPLOYED_BLOCK,
) as bigint;

// etherscan
export const ETHERSCAN_URL_MAPS = {
  "ethereum-mainnet": "https://api.etherscan.io/api",
  "ethereum-sepolia": "https://api-sepolia.etherscan.io/api",
  "scroll-mainnet": "https://api.scrollscan.org/api",
  "scroll-sepolia": "https://api-sepolia.scrollscan.org/api",
};
