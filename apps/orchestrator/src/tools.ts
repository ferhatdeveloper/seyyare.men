// Agent Tool Registry — OpenRouter tool calling format
// Her agent kendi tool setini alır, OpenRouter Agent SDK'nın tool() helper'ı yerine
// OpenAI-uyumlu tools[] array'i ile native tool calling

import { z } from "zod";
import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Tool definitions (OpenRouter chat completions API format)
export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  search_brands: {
    type: "function",
    function: {
      name: "search_brands",
      description: "Araç markası ara. Marka adının İngilizce/Türkçe/yerel karşılığını kabul eder.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Aranacak marka adı" },
          limit: { type: "number", description: "Maks sonuç (default 10)" },
        },
        required: ["query"],
      },
    },
  },

  get_vehicle_details: {
    type: "function",
    function: {
      name: "get_vehicle_details",
      description: "Bir aracın tüm detaylarını getir (marka, model, yıl, km, fiyat, konum, satıcı bilgisi).",
      parameters: {
        type: "object",
        properties: {
          vehicleId: { type: "string", description: "Araç UUID'si" },
        },
        required: ["vehicleId"],
      },
    },
  },

  get_market_comparables: {
    type: "function",
    function: {
      name: "get_market_comparables",
      description: "Belirli bir make/model/year için son 90 gündeki aktif ilanları getir. Piyasa karşılaştırması için kullanılır.",
      parameters: {
        type: "object",
        properties: {
          make: { type: "string" },
          model: { type: "string" },
          year: { type: "number" },
          countryCode: { type: "string", description: "Ülke kodu (TR, IQ, DE, vb.)" },
          limit: { type: "number", description: "Max sonuç (default 50)" },
        },
        required: ["make", "model", "year"],
      },
    },
  },

  compute_price_stats: {
    type: "function",
    function: {
      name: "compute_price_stats",
      description: "Verilen fiyat listesinden istatistik hesapla: median, mean, stddev, count.",
      parameters: {
        type: "object",
        properties: {
          prices: { type: "array", items: { type: "number" } },
        },
        required: ["prices"],
      },
    },
  },

  search_vehicles: {
    type: "function",
    function: {
      name: "search_vehicles",
      description: "Araç ilanlarını filtreleyerek ara. Tüm filtreler opsiyoneldir.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Genel arama metni" },
          makeIds: { type: "array", items: { type: "number" } },
          bodyTypeIds: { type: "array", items: { type: "number" } },
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
          minYear: { type: "number" },
          maxYear: { type: "number" },
          countryCode: { type: "string" },
          locale: { type: "string", description: "Sonuç dili (tr, en, ar, fa, ku-bad, ku-sor)" },
          sortBy: { type: "string", enum: ["created_at", "price", "year", "mileage"] },
          limit: { type: "number", default: 20 },
        },
      },
    },
  },

  get_user_profile: {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Kullanıcının profil bilgilerini, favori ilanlarını ve son aramalarını getir.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Kullanıcı UUID" },
        },
        required: ["userId"],
      },
    },
  },

  get_user_recent_searches: {
    type: "function",
    function: {
      name: "get_user_recent_searches",
      description: "Kullanıcının son 30 gündeki arama geçmişini getir (kişiselleştirme için).",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["userId"],
      },
    },
  },

  get_user_favorites: {
    type: "function",
    function: {
      name: "get_user_favorites",
      description: "Kullanıcının favori ilanlarını getir.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["userId"],
      },
    },
  },

  get_rental_availability: {
    type: "function",
    function: {
      name: "get_rental_availability",
      description: "Bir kiralama ilanı için belirli tarih aralığındaki müsaitlik durumunu kontrol et.",
      parameters: {
        type: "object",
        properties: {
          rentalId: { type: "string" },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["rentalId", "startDate", "endDate"],
      },
    },
  },

  get_negotiation_history: {
    type: "function",
    function: {
      name: "get_negotiation_history",
      description: "Belirli bir negotiation thread'in mesaj geçmişini getir.",
      parameters: {
        type: "object",
        properties: {
          negotiationId: { type: "string" },
        },
        required: ["negotiationId"],
      },
    },
  },

  get_vehicle_damage_history: {
    type: "function",
    function: {
      name: "get_vehicle_damage_history",
      description: "Bir aracın daha önce yapılmış hasar analizlerini getir.",
      parameters: {
        type: "object",
        properties: {
          vehicleId: { type: "string" },
        },
        required: ["vehicleId"],
      },
    },
  },

  get_locale_terms: {
    type: "function",
    function: {
      name: "get_locale_terms",
      description: "Verilen bir otomotiv teriminin tüm desteklenen dillerdeki karşılığını getir (çeviri kalitesini artırır).",
      parameters: {
        type: "object",
        properties: {
          term: { type: "string", description: "Otomotiv terimi (İngilizce)" },
        },
        required: ["term"],
      },
    },
  },

  get_holidays_for_period: {
    type: "function",
    function: {
      name: "get_holidays_for_period",
      description: "Belirli bir tarih aralığı için resmi tatilleri getir (fiyat çarpanları için).",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string" },
          endDate: { type: "string" },
          countryCode: { type: "string", default: "TR" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },

  get_session_history: {
    type: "function",
    function: {
      name: "get_session_history",
      description: "Thread'in son N mesajını getir (bağlam için).",
      parameters: {
        type: "object",
        properties: {
          threadId: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["threadId"],
      },
    },
  },

  save_user_preference: {
    type: "function",
    function: {
      name: "save_user_preference",
      description: "Kullanıcının bir tercihini kaydet (uzun vadeli hafıza).",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string" },
          key: { type: "string", description: "Tercih anahtarı" },
          value: { type: "string", description: "Tercih değeri" },
        },
        required: ["userId", "key", "value"],
      },
    },
  },
};

// Tool handlers — gerçek DB / Redis implementasyonları
export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_brands: async ({ query, limit = 10 }) => {
    const res = await db.query<{ id: number; name: unknown; is_premium: boolean }>(
      `SELECT id, name, is_premium FROM public.brands
       WHERE name::text ILIKE $1
       LIMIT $2`,
      [`%${query}%`, limit],
    );
    return res.rows.map((b) => ({
      id: b.id,
      name: (b.name as Record<string, string>)?.en ?? (b.name as Record<string, string>)?.tr ?? query,
      is_premium: b.is_premium,
    }));
  },

  get_vehicle_details: async ({ vehicleId }) => {
    const res = await db.query(
      `SELECT v.*, b.name as make_name, u.email as seller_email
       FROM public.vehicles v
       LEFT JOIN public.brands b ON b.id = v.make_id
       LEFT JOIN public.users u ON u.id = v.seller_id
       WHERE v.id = $1`,
      [vehicleId],
    );
    return res.rows[0] ?? null;
  },

  get_market_comparables: async ({ make, model, year, countryCode, limit = 50 }) => {
    const res = await db.query(
      `SELECT v.id, v.title_original, v.price_amount, v.price_currency, v.mileage_km, v.year, v.city, v.created_at
       FROM public.vehicles v
       LEFT JOIN public.brands b ON b.id = v.make_id
       WHERE (b.name->>'en' = $1 OR b.name->>'tr' = $1)
         AND v.model = $2
         AND v.year BETWEEN $3 - 2 AND $3 + 2
         AND v.status = 'active'
         AND v.published_at > now() - interval '90 days'
         AND ($4 IS NULL OR v.country_code = $4)
       ORDER BY v.published_at DESC
       LIMIT $5`,
      [make, model, year, countryCode ?? null, limit],
    );
    return res.rows;
  },

  compute_price_stats: async ({ prices }) => {
    const list = prices as number[];
    if (list.length === 0) {
      return { count: 0, median: 0, mean: 0, min: 0, max: 0, stdDev: 0 };
    }
    const sorted = [...list].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = list.reduce((s, p) => s + p, 0) / list.length;
    const variance = list.reduce((s, p) => s + (p - mean) ** 2, 0) / list.length;
    return {
      count: list.length,
      median,
      mean,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Math.sqrt(variance),
    };
  },

  search_vehicles: async (args) => {
    const locale = (args.locale as string) ?? "tr";
    const result = await db
      .query<Record<string, unknown>>(
        `SELECT * FROM public.search_vehicles(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )`,
        [
          args.query ?? null,
          args.makeIds ?? null,
          args.bodyTypeIds ?? null,
          null,
          null,
          null,
          args.countryCode ?? null,
          null,
          args.minYear ?? null,
          args.maxYear ?? null,
          args.minPrice ?? null,
          args.maxPrice ?? null,
          null,
          null,
          null,
          null,
          null,
          null,
          locale,
          args.sortBy ?? "created_at",
          "desc",
          args.limit ?? 20,
          0,
        ],
      )
      .catch(() => ({ rows: [], rowCount: 0 }));

    return result.rows;
  },

  get_user_profile: async ({ userId }) => {
    const res = await db.query(
      `SELECT u.id, u.email, u.role, u.locale, u.created_at,
              p.display_name, p.avatar_url, p.bio, p.country_code, p.city
       FROM public.users u
       LEFT JOIN public.user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return res.rows[0] ?? null;
  },

  get_user_recent_searches: async ({ userId, limit = 10 }) => {
    const res = await db.query(
      `SELECT id, name, filters, created_at
       FROM public.saved_searches
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return res.rows;
  },

  get_user_favorites: async ({ userId, limit = 10 }) => {
    const res = await db.query(
      `SELECT v.id, v.title_original, v.price_amount, v.price_currency, v.year
       FROM public.favorites f
       JOIN public.vehicles v ON v.id = f.vehicle_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return res.rows;
  },

  get_rental_availability: async ({ rentalId, startDate, endDate }) => {
    const res = await db.query(
      `SELECT date, status, custom_price_amount
       FROM public.rental_availability
       WHERE rental_id = $1 AND date BETWEEN $2 AND $3
       ORDER BY date`,
      [rentalId, startDate, endDate],
    );
    return res.rows;
  },

  get_negotiation_history: async ({ negotiationId }) => {
    const res = await db.query(
      `SELECT id, status, turn_count, messages, current_offer_amount, current_offer_by
       FROM public.negotiation_threads
       WHERE id = $1`,
      [negotiationId],
    );
    return res.rows[0] ?? null;
  },

  get_vehicle_damage_history: async ({ vehicleId }) => {
    const res = await db.query(
      `SELECT damages, overall_score, recommendation, created_at
       FROM public.ai_vehicle_analysis
       WHERE vehicle_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [vehicleId],
    );
    return res.rows;
  },

  get_locale_terms: async ({ term }) => {
    // Redis cache + fallback DB
    const cacheKey = `locale-term:${term}`;
    const cached = await redis.get<Record<string, string>>(cacheKey);
    if (cached) return cached;

    // Statik otomotiv terimleri sözlüğü
    const dict: Record<string, Record<string, string>> = {
      "sunroof": { tr: "sunroof", en: "sunroof", ar: "سقف شمسي", fa: "سانروف", "ku-bad": "stûrê tavê", "ku-sor": "سەقفی خۆر" },
      "leather seats": { tr: "deri koltuk", en: "leather seats", ar: "مقاعد جلدية", fa: "صندلی چرمی", "ku-bad": "niqışta çermî", "ku-sor": "دانیشتنی چەرم" },
      "alloy wheels": { tr: "alaşım jant", en: "alloy wheels", ar: "عجلات من السبائك", fa: "رینگ آلیاژی", "ku-bad": "çantên aleşîm", "ku-sor": "چەرخی ئالەیش" },
      "automatic": { tr: "otomatik", en: "automatic", ar: "أوتوماتيك", fa: "اتوماتیک", "ku-bad": "otomatîk", "ku-sor": "ئۆتۆماتیک" },
      "manual": { tr: "manuel", en: "manual", ar: "يدوي", fa: "دنده‌ای", "ku-bad": "manuel", "ku-sor": "دەستی" },
      "diesel": { tr: "dizel", en: "diesel", ar: "ديزل", fa: "دیزل", "ku-bad": "dîzel", "ku-sor": "دیزەڵ" },
      "gasoline": { tr: "benzin", en: "gasoline", ar: "بنزين", fa: "بنزین", "ku-bad": "benzîn", "ku-sor": "بەنزین" },
      "electric": { tr: "elektrik", en: "electric", ar: "كهربائي", fa: "برقی", "ku-bad": "elektrîk", "ku-sor": "کارەبا" },
      "hybrid": { tr: "hibrit", en: "hybrid", ar: "هجين", fa: "هیبرید", "ku-bad": "hîbrît", "ku-sor": "هیبرید" },
      "navigation": { tr: "navigasyon", en: "navigation", ar: "ملاحة", fa: "ناوبری", "ku-bad": "navîgasyon", "ku-sor": "ڕێنمایی" },
    };

    const lower = (term as string).toLowerCase();
    const found = dict[lower] ?? { tr: term, en: term, ar: term, fa: term, "ku-bad": term, "ku-sor": term };

    await redis.set(cacheKey, found, 60 * 60 * 24 * 30); // 30 gün
    return found;
  },

  get_holidays_for_period: async ({ startDate, endDate, countryCode = "TR" }) => {
    // TR holidays (statik)
    const holidays: Record<string, Array<{ date: string; name: string; impact: number }>> = {
      TR: [
        { date: "01-01", name: "Yılbaşı", impact: 1.2 },
        { date: "04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı", impact: 1.15 },
        { date: "05-01", name: "Emek ve Dayanışma Günü", impact: 1.1 },
        { date: "05-19", name: "Atatürk'ü Anma Gençlik ve Spor Bayramı", impact: 1.15 },
        { date: "07-15", name: "Demokrasi ve Milli Birlik Günü", impact: 1.15 },
        { date: "08-30", name: "Zafer Bayramı", impact: 1.2 },
        { date: "10-29", name: "Cumhuriyet Bayramı", impact: 1.25 },
      ],
      IQ: [
        { date: "01-01", name: "Yılbaşı", impact: 1.15 },
        { date: "03-21", name: "Newroz", impact: 1.3 },
        { date: "10-03", name: "Bağımsızlık Günü", impact: 1.15 },
      ],
    };

    const list = holidays[countryCode as string] ?? holidays.TR;
    const startMonthDay = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const s = new Date(startDate as string);
    const e = new Date(endDate as string);
    return list.filter((h) => {
      const [mm, dd] = h.date.split("-");
      const monthDay = `${mm}-${dd}`;
      const inRange = list.some((_, _i) => {
        // Basitleştirilmiş: her ay içinde kontrol
        return monthDay >= startMonthDay(s) && monthDay <= startMonthDay(e);
      });
      return inRange;
    });
  },

  get_session_history: async ({ threadId, limit = 10 }) => {
    const thread = await db.query<{ messages: unknown }>(
      `SELECT messages FROM public.agent_threads WHERE id = $1`,
      [threadId],
    );
    const allMessages = (thread.rows[0]?.messages as Array<unknown>) ?? [];
    return allMessages.slice(-limit);
  },

  save_user_preference: async ({ userId, key, value }) => {
    // user_profiles.context alanına JSON olarak kaydet (schema migration gerekebilir)
    await db.query(
      `INSERT INTO public.user_profiles (user_id, bio)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET bio = COALESCE(user_profiles.bio, '') || $3`,
      [userId, `__pref__:${key}=${value}`, `__pref__:${key}=${value}`],
    ).catch(() => {
      // Fallback: Redis'e yaz
      return redis.set(`pref:${userId}:${key}`, value, 60 * 60 * 24 * 90);
    });
    return { saved: true };
  },
};

// Tool çağrısı yap (agent'lar için)
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    throw new Error(`tool_not_found: ${name}`);
  }
  try {
    return await handler(args);
  } catch (err) {
    console.error(`[tool:${name}] failed:`, err);
    throw err;
  }
}

// Bir agent için kullanılabilir tool'ları döndür
export function getAgentTools(agentName: string): ToolDefinition[] {
  const TOOLS_PER_AGENT: Record<string, string[]> = {
    vision: ["search_brands", "get_vehicle_details"],
    pricing: ["get_market_comparables", "compute_price_stats", "search_brands"],
    search: ["search_vehicles", "get_user_recent_searches", "get_user_favorites", "save_user_preference"],
    translate: ["get_locale_terms"],
    damage: ["get_vehicle_damage_history"],
    rental: ["get_rental_availability", "get_holidays_for_period"],
    fraud: ["get_vehicle_details", "get_vehicle_damage_history"],
    recommend: ["get_user_favorites", "get_user_recent_searches", "get_user_profile"],
    negotiation: ["get_negotiation_history", "get_market_comparables", "save_user_preference"],
    support: ["get_user_profile", "get_session_history"],
    voice: ["search_vehicles", "get_vehicle_details"],
  };
  const toolNames = TOOLS_PER_AGENT[agentName] ?? [];
  return toolNames.map((n) => TOOL_DEFINITIONS[n]).filter(Boolean);
}