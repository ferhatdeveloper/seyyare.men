import type { ConnectionOptions } from "bullmq";

/**
 * BullMQ-dedicated Redis options (same REDIS_URL as cache lib).
 * Do NOT reuse the ioredis client from lib/redis.ts — BullMQ requires
 * maxRetriesPerRequest: null and manages its own duplicated connections.
 */
const url = process.env.REDIS_URL ?? "redis://redis:6379";

export const queueConnection: ConnectionOptions = {
  url,
  maxRetriesPerRequest: null,
};
