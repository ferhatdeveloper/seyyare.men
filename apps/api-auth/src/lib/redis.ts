import Redis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://redis:6379";

export const redis = {
  client: new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  }),

  async connect(): Promise<void> {
    if (this.client.status === "wait") await this.client.connect();
  },

  async quit(): Promise<void> {
    await this.client.quit();
  },

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  },

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (ttlSec) await this.client.set(key, value, "EX", ttlSec);
    else await this.client.set(key, value);
  },

  async del(key: string): Promise<void> {
    await this.client.del(key);
  },
};