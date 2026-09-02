// Long-term Memory System
// - User preferences (dil tercihleri, favori markalar, fiyat aralığı)
// - Search history (son 30 gün sorgular)
// - RAG cache (agent response cache'leri — TTL bazlı)
// - Embedding cache (araç embedding'leri)

import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";

export interface UserPreferences {
  userId: string;
  preferredLocale: string;
  preferredCurrency: string;
  favoriteBrands: string[];
  priceRange: { min: number; max: number };
  preferredBodyTypes: number[];
  preferredFuelTypes: number[];
  lastUpdated: number;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, "userId" | "lastUpdated"> = {
  preferredLocale: "tr",
  preferredCurrency: "USD",
  favoriteBrands: [],
  priceRange: { min: 0, max: 1_000_000 },
  preferredBodyTypes: [],
  preferredFuelTypes: [],
};

export const memory = {
  // ===== User Preferences =====

  async getPreferences(userId: string): Promise<UserPreferences> {
    // Önce Redis'ten dene (cache hit)
    const cacheKey = `user-prefs:${userId}`;
    const cached = await redis.get<UserPreferences>(cacheKey);
    if (cached) return cached;

    // DB'den çek
    const res = await db.query<{
      locale: string;
      bio: string | null;
    }>(
      `SELECT u.locale, p.bio
       FROM public.users u
       LEFT JOIN public.user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    const row = res.rows[0];
    const prefs: UserPreferences = {
      userId,
      ...DEFAULT_PREFERENCES,
      preferredLocale: row?.locale ?? "tr",
      lastUpdated: Date.now(),
    };

    // Bio'dan encoded preferences'ı çöz (varsa)
    if (row?.bio) {
      const prefRegex = /__pref__:(\w+)=(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = prefRegex.exec(row.bio)) !== null) {
        const [, key, value] = m;
        switch (key) {
          case "currency":
            prefs.preferredCurrency = value;
            break;
          case "favoriteBrands":
            prefs.favoriteBrands = value.split(",");
            break;
          case "minPrice":
            prefs.priceRange.min = Number(value);
            break;
          case "maxPrice":
            prefs.priceRange.max = Number(value);
            break;
        }
      }
    }

    await redis.set(cacheKey, prefs, 60 * 60); // 1 saat cache
    return prefs;
  },

  async setPreference(
    userId: string,
    key: keyof Omit<UserPreferences, "userId" | "lastUpdated">,
    value: unknown,
  ): Promise<void> {
    // Redis'te güncelle (anında)
    const cached = await redis.get<UserPreferences>(`user-prefs:${userId}`);
    const next: UserPreferences = cached ?? {
      userId,
      ...DEFAULT_PREFERENCES,
      lastUpdated: Date.now(),
    };
    (next as Record<string, unknown>)[key] = value;
    next.lastUpdated = Date.now();
    await redis.set(`user-prefs:${userId}`, next, 60 * 60);

    // DB'ye yaz (kalıcı)
    await db.query(
      `INSERT INTO public.user_profiles (user_id, bio)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET bio = COALESCE(user_profiles.bio, '') || ' ' || $3`,
      [userId, `__pref__:${key}=${String(value)}`, `__pref__:${key}=${String(value)}`],
    ).catch((err) => console.warn("[memory] DB preference save failed:", err));
  },

  // ===== Search History =====

  async recordSearch(userId: string, query: string, filters: Record<string, unknown> = {}): Promise<void> {
    // Redis'te listeye ekle
    const key = `user-searches:${userId}`;
    await redis.client
      .multi()
      .lpush(key, JSON.stringify({ query, filters, ts: Date.now() }))
      .ltrim(key, 0, 49) // Son 50 aramayı tut
      .expire(key, 60 * 60 * 24 * 30) // 30 gün
      .exec();

    // DB'ye saved_searches olarak kaydet
    await db.query(
      `INSERT INTO public.saved_searches (user_id, name, filters, alerts_enabled)
       VALUES ($1, $2, $3, false)
       ON CONFLICT DO NOTHING`,
      [userId, query.slice(0, 60), JSON.stringify(filters)],
    ).catch((err) => console.warn("[memory] DB save failed:", err));
  },

  async getRecentSearches(userId: string, limit: number = 10): Promise<Array<{ query: string; filters: Record<string, unknown>; ts: number }>> {
    const key = `user-searches:${userId}`;
    const list = await redis.client.lrange(key, 0, limit - 1);
    return list
      .map((s) => {
        try {
          return JSON.parse(s) as { query: string; filters: Record<string, unknown>; ts: number };
        } catch {
          return null;
        }
      })
      .filter((x): x is { query: string; filters: Record<string, unknown>; ts: number } => x !== null);
  },

  // ===== RAG Cache =====

  async cacheAgentResponse<T>(opts: {
    agent: string;
    input: Record<string, unknown>;
    response: T;
    ttlSec?: number;
  }): Promise<void> {
    const key = this.makeCacheKey(opts.agent, opts.input);
    await redis.set(key, opts.response, opts.ttlSec ?? 3600); // 1 saat default
  },

  async getCachedResponse<T>(opts: {
    agent: string;
    input: Record<string, unknown>;
  }): Promise<T | null> {
    const key = this.makeCacheKey(opts.agent, opts.input);
    return redis.get<T>(key);
  },

  async invalidateAgentCache(agent: string, pattern?: string): Promise<void> {
    const fullPattern = pattern ? `cache:${agent}:${pattern}` : `cache:${agent}:*`;
    const keys = await redis.client.keys(fullPattern);
    if (keys.length > 0) await redis.client.del(keys);
  },

  // Vehicle değiştiğinde cache invalidation
  async invalidateVehicleCaches(vehicleId: string): Promise<void> {
    const patterns = [
      `cache:vision:*${vehicleId}*`,
      `cache:pricing:*${vehicleId}*`,
      `cache:fraud:*${vehicleId}*`,
      `cache:recommend:*${vehicleId}*`,
      `cache:search:*${vehicleId}*`,
    ];
    for (const pattern of patterns) {
      const keys = await redis.client.keys(pattern);
      if (keys.length > 0) await redis.client.del(keys);
    }
  },

  // ===== Embedding cache (vehicle-level) =====

  async getVehicleEmbedding(vehicleId: string): Promise<number[] | null> {
    return redis.get<number[]>(`vehicle-emb:${vehicleId}`);
  },

  async setVehicleEmbedding(vehicleId: string, embedding: number[]): Promise<void> {
    await redis.set(`vehicle-emb:${vehicleId}`, embedding, 60 * 60 * 24 * 7); // 7 gün
  },

  // ===== Conversation Context (thread memory) =====

  async getThreadContext(threadId: string): Promise<{
    recentIntents: string[];
    recentVehicles: string[];
    costBudget: number;
  } | null> {
    return redis.get(`thread-ctx:${threadId}`);
  },

  async setThreadContext(threadId: string, ctx: {
    recentIntents: string[];
    recentVehicles: string[];
    costBudget: number;
  }): Promise<void> {
    await redis.set(`thread-ctx:${threadId}`, ctx, 60 * 60);
  },

  // ===== Helpers =====

  makeCacheKey(agent: string, input: Record<string, unknown>): string {
    // Input hash'i — sorted keys ile deterministik
    const sorted = JSON.stringify(input, Object.keys(input).sort());
    let h = 0;
    for (let i = 0; i < sorted.length; i++) {
      h = (h << 5) - h + sorted.charCodeAt(i);
      h |= 0;
    }
    return `cache:${agent}:${Math.abs(h).toString(36)}:${sorted.length}`;
  },
};