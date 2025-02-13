import {
  CLAIM_CONTRACT_ADDRESS,
  ClaimAbi,
  createNetworkClient,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { getContract } from "viem";

export const getCurrentPeriod = async (ethereumClient: ReturnType<typeof createNetworkClient>) => {
  const contract = getContract({
    address: CLAIM_CONTRACT_ADDRESS,
    abi: ClaimAbi,
    client: ethereumClient,
  });
  const currentPeriod = await contract.read.getCurrentPeriod();
  logger.info(`Current period: ${currentPeriod}`);
};
