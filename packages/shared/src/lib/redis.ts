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

    this.client = new Redis(config.REDIS_URL, {
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
