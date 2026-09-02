import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://redis:6379";

export const cache = {
  client: new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  }),

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSec: number = 3600): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSec);
  },

  async del(key: string): Promise<void> {
    await this.client.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(keys);
  },
};