import {
  BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS,
  BlockBuilderRewardAbi,
  createNetworkClient,
} from "@intmax2-claim-aggregator/shared";
import { type GetContractReturnType, getContract } from "viem";

export class BlockBuilderRewardContract {
  private static instance: BlockBuilderRewardContract;
  private readonly contract: GetContractReturnType<
    typeof BlockBuilderRewardAbi,
    ReturnType<typeof createNetworkClient>
  >;

  constructor() {
    const scrollClient = createNetworkClient("scroll");
    this.contract = getContract({
      address: BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS,
      abi: BlockBuilderRewardAbi,
      client: scrollClient,
    });
  }

  static getInstance() {
    if (!BlockBuilderRewardContract.instance) {
      BlockBuilderRewardContract.instance = new BlockBuilderRewardContract();
    }
    return BlockBuilderRewardContract.instance;
  }

  async isAlreadySetReward(period: bigint) {
    return this.contract.read.alreadySetReward([period]);
  }
}
