import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import { config, isProduction } from "../config";
import { logger } from "../lib";
import * as schema from "./eventSchema";

const ssl = config.USE_DATABASE_SSL ? { rejectUnauthorized: false } : false;

const poolConfig: PoolConfig = {
  connectionString: process.env.WITHDRAWAL_DATABASE_URL,
  ssl,
  max: config.DB_POOL_MAX,
  maxUses: config.DB_MAX_USES,
  idleTimeoutMillis: config.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT,
  keepAlive: true,
  maxLifetimeSeconds: config.DB_MAX_LIFETIME,
  keepAliveInitialDelayMillis: config.DB_KEEPALIVE_DELAY,
  idle_in_transaction_session_timeout: config.DB_IDLE_IN_TRANSACTION_TIMEOUT,
  statement_timeout: config.DB_STATEMENT_TIMEOUT,
  query_timeout: config.DB_QUERY_TIMEOUT,
  application_name: config.SERVICE_NAME,
};

const withdrawalPool = new Pool(poolConfig);

withdrawalPool.on("error", (error, _) => {
  logger.error(`Unexpected error on idle client: ${error.message}`);
});

withdrawalPool.on("connect", () => {
  logger.debug("New client connected to event database");
});

withdrawalPool.on("acquire", () => {
  logger.debug("Client acquired from event database pool");
});

withdrawalPool.on("remove", () => {
  logger.debug("Client removed from event database pool");
});

export const withdrawalDB = drizzle(withdrawalPool, { schema, logger: !isProduction });

export const getWithdrawalPoolStats = () => ({
  totalCount: withdrawalPool.totalCount,
  idleCount: withdrawalPool.idleCount,
  waitingCount: withdrawalPool.waitingCount,
});

export const closeWithdrawalDB = async () => {
  try {
    await withdrawalPool.end();
    logger.debug("Withdrawal database pool closed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error closing event database pool: ${errorMessage}`);
    throw error;
  }
};
