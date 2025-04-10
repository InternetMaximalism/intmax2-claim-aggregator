import { config } from "@intmax2-claim-aggregator/shared";
import { REWARD_CONSTANTS, TERMS, TIME_BOUNDARIES } from "../constant";

export const calculateReward = (date: Date) => {
  const term = determineTerm(date);
  return REWARD_CONSTANTS[config.BLOCK_BUILDER_REWARD_TYPE][term];
};

const determineTerm = (date: Date) => {
  switch (true) {
    case date < TIME_BOUNDARIES.TERM_7_START:
      return TERMS.BEFORE_TERM_7;
    case date < TIME_BOUNDARIES.TERM_7_END:
      return TERMS.TERM_7;
    default:
      return TERMS.AFTER_TERM_7;
  }
};
