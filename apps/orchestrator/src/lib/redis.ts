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

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },

  async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    const str = JSON.stringify(value);
    if (ttlSec) await this.client.set(key, str, "EX", ttlSec);
    else await this.client.set(key, str);
  },

  async del(key: string): Promise<void> {
    await this.client.del(key);
  },

  async publish(channel: string, message: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(message));
  },
};