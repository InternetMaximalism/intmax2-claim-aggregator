export const PERIOD_INTERVAL = {
  development: 1,
  production: 7,
};

export const TERMS = {
  BEFORE_TERM_7: "before_term_7",
  TERM_7: "term_7",
  AFTER_TERM_7: "after_term_7",
};

export const TIME_BOUNDARIES = {
  TERM_7_START: new Date("2027-05-12T00:00:00Z"),
  TERM_7_END: new Date("2030-03-01T00:00:00Z"),
};

export const REWARD_CONSTANTS = {
  development: {
    [TERMS.BEFORE_TERM_7]: 2083, // 50,000 / 24
    [TERMS.TERM_7]: 1041, // 25,000 / 24
    [TERMS.AFTER_TERM_7]: 0,
  },
  production: {
    [TERMS.BEFORE_TERM_7]: 50000,
    [TERMS.TERM_7]: 25000,
    [TERMS.AFTER_TERM_7]: 0,
  },
};
