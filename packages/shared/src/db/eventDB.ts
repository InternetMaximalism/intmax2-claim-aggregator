import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import { config, isProduction } from "../config";
import { logger } from "../lib";
import * as schema from "./eventSchema";

const ssl = config.USE_DATABASE_SSL ? { rejectUnauthorized: false } : false;

const poolConfig: PoolConfig = {
  connectionString: process.env.EVENT_DATABASE_URL,
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

const eventPool = new Pool(poolConfig);

eventPool.on("error", (error, _) => {
  logger.error(`Unexpected error on idle client: ${error.message}`);
});

eventPool.on("connect", () => {
  logger.debug("New client connected to event database");
});

eventPool.on("acquire", () => {
  logger.debug("Client acquired from event database pool");
});

eventPool.on("remove", () => {
  logger.debug("Client removed from event database pool");
});

export const eventDB = drizzle(eventPool, { schema, logger: !isProduction });

export const getEventPoolStats = () => ({
  totalCount: eventPool.totalCount,
  idleCount: eventPool.idleCount,
  waitingCount: eventPool.waitingCount,
});

export const closeEventDB = async () => {
  try {
    await eventPool.end();
    logger.debug("Event database pool closed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error closing event database pool: ${errorMessage}`);
    throw error;
  }
};
