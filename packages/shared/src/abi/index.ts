export { abi as BlockBuilderRewardAbi } from "./BlockBuilderReward.json";
export { abi as ClaimAbi } from "./Claim.json";
export { abi as ContributionAbi } from "./Contribution.json";

import { config } from "../config";
import { abi as ClaimMigratedAbi } from "./Claim.json";
import { abi as ClaimTestnetAbi } from "./Claim.testnet.json";

export const claimAbi = config.USE_MIGRATED_ABI ? ClaimMigratedAbi : ClaimTestnetAbi;
