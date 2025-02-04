import Redis from "ioredis";
import type { ClaimGroup } from "../types";
import { RedisClient } from "./redis";

type ManagerNameType = "claim-aggregator";

export class ClaimManager {
  private static instance: ClaimManager;
  private redis: Redis;
  private readonly keyPrefix: string;
  private readonly groupSetKey: string;
  private readonly expiration = 30 * 60; // NOTE: expiration 30 minutes

  constructor(managerName: ManagerNameType) {
    this.redis = RedisClient.getInstance().getClient()!;
    this.keyPrefix = `${managerName}:`;
    this.groupSetKey = `${managerName}:groups`;
  }

  public static getInstance(managerName: ManagerNameType): ClaimManager {
    if (!ClaimManager.instance) {
      ClaimManager.instance = new ClaimManager(managerName);
    }
    return ClaimManager.instance;
  }

  private getKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  async getGroup(id: string): Promise<ClaimGroup | null> {
    const data = await this.redis.get(this.getKey(id));
    return data ? JSON.parse(data) : null;
  }

  async addGroup(group: ClaimGroup): Promise<string> {
    const id = crypto.randomUUID();
    const key = this.getKey(id);
    const timestamp = Date.now();
    const pipeline = this.redis.pipeline();

    pipeline.set(key, JSON.stringify(group));
    pipeline.expire(key, this.expiration);
    pipeline.zadd(this.groupSetKey, timestamp, id);

    await pipeline.exec();

    return id;
  }

  async updateGroup(id: string, updates: Partial<ClaimGroup>) {
    const key = this.getKey(id);
    const current = await this.getGroup(id);

    if (!current) {
      return false;
    }

    const updated: ClaimGroup = {
      ...current,
      ...updates,
      updatedAt: new Date(),
    };

    await this.redis.set(key, JSON.stringify(updated));

    return true;
  }

  async deleteGroup(id: string): Promise<void> {
    const key = this.getKey(id);
    const pipeline = this.redis.pipeline();

    pipeline.del(key);
    pipeline.zrem(this.groupSetKey, id);

    await pipeline.exec();
  }

  async getAllGroups(): Promise<ClaimGroup[]> {
    const ids = await this.redis.zrange(this.groupSetKey, 0, -1);
    const groups = await Promise.all(ids.map((id) => this.getGroup(id)));
    return groups.filter((group): group is ClaimGroup => group !== null);
  }

  async getAllProcessedUUIDs(): Promise<string[]> {
    const groups = await this.getAllGroups();
    return groups.flatMap((group) => group.requestingClaims.map(({ uuid }) => uuid));
  }
}
