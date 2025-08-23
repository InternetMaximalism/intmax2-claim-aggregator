import { type Block, ethers, type FeeData } from "ethers";
import type { PublicClient } from "viem";
import { config } from "../config";
import { PRECISION } from "../constants";

const calculateAdjustedGasPrices = (multiplier: number, baseGasPrice: bigint) => {
  const multiplierScaled = BigInt(Math.round(multiplier * Number(PRECISION)));

  const gasPrice = (baseGasPrice * multiplierScaled) / PRECISION;

  return {
    gasPrice,
  };
};

export const getEthersMaxGasMultiplier = async (publicClient: PublicClient, multiplier: number) => {
  const provider = new ethers.JsonRpcProvider(publicClient.transport.url);

  const [block, feeData] = await Promise.all([provider.getBlock("latest"), provider.getFeeData()]);
  const baseGasPrice = getGasPrice(block, feeData);

  const { gasPrice } = calculateAdjustedGasPrices(multiplier, baseGasPrice);

  return { gasPrice };
};

const getGasPrice = (block: Block | null, feeData: FeeData) => {
  const baseFee = block?.baseFeePerGas ?? 0n;
  const gasPrice = feeData.gasPrice ?? 0n;
  const baseGasPrice = baseFee > gasPrice ? baseFee : gasPrice;

  const multiplierGasPrice = calculateAdjustedGasPrices(config.SCROLL_GAS_MULTIPLIER, baseGasPrice);
  return multiplierGasPrice.gasPrice + (feeData?.maxPriorityFeePerGas ?? 0n);
};

export const calculateEthersIncreasedGasPrice = (
  previousGasPrice: bigint,
  currentGasPrice: bigint,
) => {
  const newGasPrice = previousGasPrice > currentGasPrice ? previousGasPrice + 1n : currentGasPrice;

  return {
    newGasPrice,
  };
};

export const calculateGasMultiplier = (attempt: number, incrementRate: number = 0.2) => {
  if (attempt === 0) return 1;

  return 1 + attempt * incrementRate;
};
