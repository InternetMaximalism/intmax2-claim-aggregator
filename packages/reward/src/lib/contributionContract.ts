import {
  ContributionAbi,
  L2_CONTRIBUTION_CONTRACT_ADDRESS,
  createNetworkClient,
  logger,
} from "@intmax2-claim-aggregator/shared";
import { GetContractReturnType, getContract } from "viem";

export class ContributionContract {
  private static instance: ContributionContract;
  private readonly contract: GetContractReturnType<
    typeof ContributionAbi,
    ReturnType<typeof createNetworkClient>
  >;

  constructor() {
    const ethereumClient = createNetworkClient("scroll");
    this.contract = getContract({
      address: L2_CONTRIBUTION_CONTRACT_ADDRESS,
      abi: ContributionAbi,
      client: ethereumClient,
    });
  }

  static getInstance() {
    if (!ContributionContract.instance) {
      ContributionContract.instance = new ContributionContract();
    }
    return ContributionContract.instance;
  }

  async fetchContractPeriodData() {
    const [currentPeriod, startTimestamp, periodInterval] = (await Promise.all([
      this.contract.read.getCurrentPeriod(),
      this.contract.read.startTimestamp(),
      this.contract.read.periodInterval(),
    ])) as [bigint, bigint, bigint];

    logger.debug(
      `currentPeriod: ${currentPeriod} startTimestamp: ${startTimestamp} periodInterval: ${periodInterval}`,
    );

    return { currentPeriod, startTimestamp, periodInterval };
  }
}
