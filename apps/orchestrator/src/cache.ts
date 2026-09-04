// Performance optimization — akıllı cache stratejisi
// SSE first-event < 500ms hedefi için:
// 1. Intent classification cache (TTL: 1 saat, aynı metin)
// 2. Agent response cache (TTL: 6 saat)
// 3. DB query cache (PostgREST)
// 4. SSE warm-up: ilk event'i erkenden gönder

import crypto from "node:crypto";
import { redis } from "./lib/redis.js";

export interface CacheOptions {
  ttlSec?: number;
  tags?: string[]; // Invalidasyon için tag listesi
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  hitRate: number;
  totalKeys: number;
}

/**
 * Deterministik cache key oluştur (sorted JSON)
 */
export function makeCacheKey(prefix: string, payload: unknown): string {
  const sorted = JSON.stringify(payload, Object.keys(payload as object).sort());
  const hash = crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 32);
  return `${prefix}:${hash}`;
}

/**
 * Akıllı cache: tag-based invalidation + sliding TTL + stats
 */
export const cache = {
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, hitRate: 0, totalKeys: 0 },

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = await redis.get<CacheEntry<T>>(`cache:${key}`);
      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }
      if (entry.expiresAt < Date.now()) {
        await redis.del(`cache:${key}`);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }
      entry.hits++;
      this.stats.hits++;
      this.updateHitRate();
      // Hit count'u Redis'e yaz (async, await etmiyoruz performans için)
      redis.client.set(`cache:${key}`, JSON.stringify(entry), "EX", Math.floor((entry.expiresAt - Date.now()) / 1000)).catch(() => {});
      return entry.value;
    } catch (err) {
      console.warn(`[cache] get failed for ${key}:`, err);
      this.stats.misses++;
      return null;
    }
  },

  async set<T>(key: string, value: T, opts: CacheOptions = {}): Promise<void> {
    try {
      const ttl = opts.ttlSec ?? 3600;
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl * 1000,
        tags: opts.tags ?? [],
        createdAt: Date.now(),
        hits: 0,
      };
      await redis.set(`cache:${key}`, entry, ttl);
      this.stats.sets++;

      // Tag index güncelle (invalidation için)
      if (opts.tags && opts.tags.length > 0) {
        for (const tag of opts.tags) {
          await redis.client.sadd(`cache-tags:${tag}`, key);
          await redis.client.expire(`cache-tags:${tag}`, ttl);
        }
      }
    } catch (err) {
      console.warn(`[cache] set failed for ${key}:`, err);
    }
  },

  /**
   * Tag'e bağlı tüm key'leri invalidate et
   * Örn: "vehicle:uuid-123" tag'li tüm cache'leri temizle
   */
  async invalidateTag(tag: string): Promise<number> {
    try {
      const keys = await redis.client.smembers(`cache-tags:${tag}`);
      if (keys.length === 0) return 0;
      const fullKeys = keys.map((k) => `cache:${k}`);
      await redis.client.del(...fullKeys, `cache-tags:${tag}`);
      return keys.length;
    } catch (err) {
      console.warn(`[cache] invalidateTag failed for ${tag}:`, err);
      return 0;
    }
  },

  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.client.keys(`cache:${pattern}`);
      if (keys.length === 0) return 0;
      await redis.client.del(...keys);
      return keys.length;
    } catch (err) {
      console.warn(`[cache] invalidateByPattern failed:`, err);
      return 0;
    }
  },

  async getOrSet<T>(key: string, factory: () => Promise<T>, opts: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await factory();
    await this.set(key, fresh, opts);
    return fresh;
  },

  getStats(): CacheStats {
    return { ...this.stats };
  },

  updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  },

  async resetStats(): Promise<void> {
    this.stats = { hits: 0, misses: 0, sets: 0, hitRate: 0, totalKeys: 0 };
  },
};

/**
 * SSE warm-up helper: ilk event'i hızlıca gönder (loading göster)
 * Plan hedefi: SSE ilk event < 500ms
 */
export interface WarmupEvent {
  type: "agent_started" | "cache_hit" | "fallback";
  agent?: string;
  timestamp: number;
  cached?: boolean;
}

export function createWarmupEvent(agent: string, cached: boolean = false): WarmupEvent {
  return {
    type: cached ? "cache_hit" : "agent_started",
    agent,
    timestamp: Date.now(),
    cached,
  };
}

/**
 * Intent classification cache — aynı metin için tekrar cache
 * (Çok yaygın pattern: kullanıcı "BMW X5" aramasını birden fazla tur yapar)
 */
export async function getCachedIntent(
  text: string,
  locale: string,
): Promise<{ intent: string; confidence: number } | null> {
  const key = makeCacheKey("intent", { text: text.toLowerCase().trim(), locale });
  return cache.get(key);
}

export async function cacheIntentResult(
  text: string,
  locale: string,
  result: { intent: string; confidence: number },
): Promise<void> {
  const key = makeCacheKey("intent", { text: text.toLowerCase().trim(), locale });
  await cache.set(key, result, { ttlSec: 3600, tags: [`intent:${locale}`] });
}

/**
 * Vehicle detail cache — sık sorgulanan ilanlar için
 */
export async function getCachedVehicle(vehicleId: string): Promise<unknown | null> {
  return cache.get(`vehicle:${vehicleId}`);
}

export async function cacheVehicle(vehicleId: string, data: unknown): Promise<void> {
  await cache.set(`vehicle:${vehicleId}`, data, {
    ttlSec: 600, // 10 dakika
    tags: [`vehicle:${vehicleId}`],
  });
}

export async function invalidateVehicle(vehicleId: string): Promise<number> {
  return cache.invalidateTag(`vehicle:${vehicleId}`);
}

/**
 * Search results cache — aynı query için kısa süreli cache
 */
export async function getCachedSearchResults(
  query: string,
  locale: string,
): Promise<unknown[] | null> {
  const key = makeCacheKey("search", { q: query.toLowerCase().trim(), locale });
  return cache.get(key);
}

export async function cacheSearchResults(
  query: string,
  locale: string,
  results: unknown[],
): Promise<void> {
  const key = makeCacheKey("search", { q: query.toLowerCase().trim(), locale });
  await cache.set(key, results, { ttlSec: 300 }); // 5 dakika
}