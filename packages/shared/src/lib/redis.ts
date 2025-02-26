import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;

  private constructor() {
    if (!config.USE_REDIS) {
      return;
    }

    const redisUrl = this.getRedisURL();

    this.client = new Redis(redisUrl, {
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.client.on("error", (error) => {
      logger.error(`Redis Client Error: ${error.stack}`);
    });

    this.client.on("connect", () => {
      logger.info(`Redis Client Connected`);
    });
  }

  private getRedisURL(): string {
    const hasQueryParams = config.REDIS_URL.includes("?");

    if (config.REDIS_URL.includes("rediss")) {
      return hasQueryParams ? `${config.REDIS_URL}&tls=true` : `${config.REDIS_URL}?tls=true`;
    }

    return config.REDIS_URL;
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
      await this.client.quit();
      this.client = null;
    }
  }
}
