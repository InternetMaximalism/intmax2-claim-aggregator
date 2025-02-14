import { bool, cleanEnv, num, str } from "envalid";

export const config = cleanEnv(process.env, {
  // app
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: num({ default: 3000 }),
  LOG_LEVEL: str({
    choices: ["fatal", "error", "warn", "info", "debug", "trace"],
    default: "debug",
  }),
  SERVICE_NAME: str({ default: "intmax2-claim-aggregator" }),
  SERVICE_VERSION: str({ default: "v0.0.0" }),
  // db
  EVENT_DATABASE_URL: str(),
  WITHDRAWAL_DATABASE_URL: str(),
  // redis
  REDIS_URL: str(),
  USE_REDIS: bool({ default: true }),
  // blockchain
  NETWORK_ENVIRONMENT: str({
    choices: ["mainnet", "sepolia"],
    default: "sepolia",
  }),
  ALCHEMY_API_KEY: str(),
  ETHERSCAN_API_KEY: str(),
  // contracts
  LIQUIDITY_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK: num({ devDefault: 0 }),
  CLAIM_CONTRACT_ADDRESS: str(),
  CLAIM_CONTRACT_DEPLOYED_BLOCK: num({ default: 0 }),
  // private key
  INTMAX2_OWNER_MNEMONIC: str(),
  // zkp
  ZKP_PROVER_URL: str({ default: "http://localhost:3001" }),
  // queue
  QUEUE_CONCURRENCY: num({ default: 2 }),
  // claim group
  CLAIM_GROUP_SIZE: num({ default: 50 }),
  CLAIM_MIN_BATCH_SIZE: num({ default: 5 }),
  CLAIM_MIN_WAIT_MINUTES: num({ default: 5 }), // 5 minutes
  // scroll
  SCROLL_GAS_MULTIPLIER: num({ default: 2 }), // for l1 fee
});
