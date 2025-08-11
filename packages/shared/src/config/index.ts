import { bool, cleanEnv, num, str } from "envalid";
import { version } from "../../../../package.json";

export const config = cleanEnv(process.env, {
  // app
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: num({ default: 3000 }),
  LOG_LEVEL: str({
    choices: ["fatal", "error", "warn", "info", "debug", "trace"],
    default: "info",
  }),
  SERVICE_NAME: str({ default: "intmax2-claim-aggregator" }),
  SERVICE_VERSION: str({ default: version }),
  // db
  EVENT_DATABASE_URL: str(),
  WITHDRAWAL_DATABASE_URL: str(),
  USE_DATABASE_SSL: bool({ default: false }),
  // db pool
  DB_POOL_MAX: num({ default: 5 }),
  DB_MAX_LIFETIME: num({ default: 3600 }),
  DB_MAX_USES: num({ default: 1000 }),
  DB_IDLE_TIMEOUT: num({ default: 60000 }),
  DB_KEEPALIVE_DELAY: num({ default: 30000 }),
  DB_CONNECTION_TIMEOUT: num({ default: 3000 }),
  DB_STATEMENT_TIMEOUT: num({ default: 10000 }),
  DB_QUERY_TIMEOUT: num({ default: 8000 }),
  DB_IDLE_IN_TRANSACTION_TIMEOUT: num({ default: 30000 }),
  // redis
  REDIS_URL: str(),
  REDIS_ENABLED: bool({ default: true }),
  // blockchain
  NETWORK_ENVIRONMENT: str({
    choices: ["mainnet", "sepolia"],
    default: "sepolia",
    desc: "The environment of the blockchain network to connect to",
  }),
  ALCHEMY_API_KEY: str(),
  ETHERSCAN_API_KEY: str(),
  USE_MIGRATED_ABI: bool({
    default: false,
    desc: "Use migrated ABI for contracts. Set to `true` on mainnet, and `false` on testnet.",
  }),
  // dispatcher
  PERIOD_BATCH_SIZE: num({ default: 1 }),
  PERIOD_BATCH_DELAY: num({ default: 1000 }),
  // contracts
  LIQUIDITY_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  LIQUIDITY_CONTRACT_DEPLOYED_BLOCK_NUMBER: num({ devDefault: 0 }),
  CLAIM_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  CLAIM_CONTRACT_DEPLOYED_BLOCK_NUMBER: num({ devDefault: 0 }),
  L2_CONTRIBUTION_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  BLOCK_BUILDER_REWARD_CONTRACT_ADDRESS: str({ devDefault: "0x" }),
  // private key
  INTMAX2_OWNER_MNEMONIC: str({ desc: "The mnemonic of the INTMAX2 owner wallet" }),
  // zkp
  ZKP_PROVER_URL: str({ default: "http://localhost:3001", desc: "The URL of the ZKP prover API" }),
  GNARK_VERIFIER_DATA_TYPE: str({
    default: "ProofType",
    choices: [
      "withdrawal-dev",
      "withdrawal-stage",
      "withdrawal-prod",
      "claim-dev",
      "claim-stage",
      "claim-prod",
    ],
  }),
  // queue
  QUEUE_CONCURRENCY: num({
    default: 2,
    desc: "Maximum number of concurrent jobs that can be processed simultaneously",
  }),
  // claim group
  CLAIM_GROUP_SIZE: num({
    default: 50,
    desc: "Maximum number of claims to group together in a single batch",
  }),
  CLAIM_MIN_BATCH_SIZE: num({
    default: 5,
    desc: "Minimum number of claims required to create a batch",
  }),
  CLAIM_MIN_WAIT_MINUTES: num({
    default: 5,
    desc: "Minimum time (in minutes) to wait before a claim batch can be processed",
  }), // 5 minutes
  CLAIM_MODE: str({
    choices: ["faster", "standard"],
    default: "faster",
  }),
  // block builder
  BLOCK_BUILDER_REWARD_TYPE: str({
    choices: ["development", "production"],
    default: "development",
  }),
  // scroll
  SCROLL_GAS_MULTIPLIER: num({ default: 2, desc: "Gas multiplier for Scroll L1 fee calculations" }), // for l1 fee
});

export const isProduction = config.NODE_ENV === "production";
