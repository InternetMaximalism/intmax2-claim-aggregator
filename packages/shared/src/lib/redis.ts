import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;

  private constructor() {
    if (!config.REDIS_ENABLED) {
      logger.info("Redis is disabled by configuration");
      return;
    }

    this.client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      reconnectOnError: (err) => {
        logger.warn(`Redis reconnection triggered by error: ${err.message}`);
        const targetErrors = ["READONLY", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"];
        return targetErrors.some((target) => err.message.includes(target));
      },
    });

    this.client.on("connect", () => {
      logger.debug(`Redis Client Connected`);
    });

    this.client.on("ready", () => {
      logger.debug("Redis client ready for commands");
    });

    this.client.on("error", (error) => {
      logger.error(`Redis Client Error: ${error.stack}`);
    });

    this.client.on("close", () => {
      logger.debug("Redis client connection closed");
    });

    this.client.on("reconnecting", (time: number) => {
      logger.debug(`Redis client reconnecting in ${time}ms`);
    });

    this.client.on("end", () => {
      logger.debug("Redis client connection ended");
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public async quit() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.debug("Redis client quit successfully");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Error during Redis quit: ${errorMessage}`);
      } finally {
        this.client = null;
      }
    }
  }
}
