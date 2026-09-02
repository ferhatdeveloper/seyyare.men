import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter } from "../services/openrouter.js";

const VehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  mileageKm: z.number().int().min(0).optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  bodyType: z.string().optional(),
  condition: z.enum(["new", "like_new", "used", "damaged", "salvage"]).optional(),
  countryCode: z.string().length(2).optional(),
  city: z.string().optional(),
  currency: z.string().length(3).default("USD"),
  features: z.array(z.string()).optional(),
});

interface PriceFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  value: string;
}

interface PriceSuggestion {
  suggestedPrice: number;
  rangeLow: number;
  rangeHigh: number;
  currency: string;
  confidence: number;
  factors: PriceFactor[];
  marketComparisons: number;
  explanation: string;
}

export async function priceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/price-suggest
   * Body: { make, model, year, mileageKm, fuelType, transmission, bodyType, condition, countryCode, city, currency }
   * Returns: { suggestedPrice, rangeLow, rangeHigh, currency, confidence, factors[], explanation }
   */
  app.post("/ai/price-suggest", async (req, reply) => {
    const parsed = VehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const v = parsed.data;

    // 1. Aynı make/model/year için son 90 gündeki piyasa ilanlarını çek
    const marketRes = await db.query<{
      price_amount: string | number;
      year: number;
      mileage_km: number;
      condition: string;
      country_code: string;
      city: string;
    }>(
      `SELECT price_amount, year, mileage_km, condition, country_code, city
       FROM public.vehicles
       WHERE make_id = (SELECT id FROM public.brands WHERE name->>'en' = $1 OR name->>'tr' = $1 LIMIT 1)
         AND model = $2
         AND year BETWEEN $3 - 2 AND $3 + 2
         AND status = 'active'
         AND price_amount IS NOT NULL
         AND published_at > now() - interval '90 days'
       ORDER BY published_at DESC
       LIMIT 100`,
      [v.make, v.model, v.year],
    );

    const marketData = marketRes.rows.map((r) => ({
      price: Number(r.price_amount),
      year: r.year,
      mileage: r.mileage_km,
      condition: r.condition,
      country: r.country_code,
      city: r.city,
    }));

    const cacheKey = `price:${v.make}:${v.model}:${v.year}:${v.mileageKm ?? 0}:${v.condition ?? "used"}:${v.countryCode ?? ""}`;
    const cached = await cache.get<PriceSuggestion>(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    // 2. İstatistikleri hesapla
    const stats = computeStats(marketData);

    // 3. LLM'e faktör analizi yaptır
    const factors = await analyzeFactors(v, stats);

    // 4. Final fiyatı belirle
    const adjustment = factors.adjustmentPct / 100;
    const suggested = Math.round(stats.median * (1 + adjustment));
    const range = Math.round(stats.median * 0.12); // ±%12

    const suggestion: PriceSuggestion = {
      suggestedPrice: suggested,
      rangeLow: suggested - range,
      rangeHigh: suggested + range,
      currency: v.currency,
      confidence: clamp01(stats.confidence),
      factors: factors.factors,
      marketComparisons: marketData.length,
      explanation: factors.explanation,
    };

    // Cache + DB log
    await cache.set(cacheKey, suggestion, 60 * 60 * 6); // 6 saat

    const userId = (req.headers["x-user-id"] as string) ?? null;
    await db.query(
      `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, duration_ms, completed_at)
       VALUES ($1, 'price_suggest', 'completed', $2, $3, $4, $5, $6, now())`,
      [
        userId,
        JSON.stringify(v),
        JSON.stringify(suggestion),
        "openai/gpt-4o-mini",
        0,
        0,
      ],
    );

    return reply.send({ ...suggestion, cached: false });
  });

  /**
   * POST /ai/price-history
   * Body: { vehicleId }
   * Returns: price history (last 90 days) + trend analysis
   */
  app.post<{ Body: { vehicleId: string } }>("/ai/price-history", async (req, reply) => {
    const { vehicleId } = req.body;
    const res = await db.query(
      `SELECT price_amount, recorded_at
       FROM public.price_history
       WHERE vehicle_id = $1 AND recorded_at > now() - interval '90 days'
       ORDER BY recorded_at ASC`,
      [vehicleId],
    );
    return reply.send({ history: res.rows });
  });
}

interface MarketStats {
  count: number;
  median: number;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  confidence: number;
}

function computeStats(data: Array<{ price: number }>): MarketStats {
  if (data.length === 0) {
    return { count: 0, median: 0, mean: 0, min: 0, max: 0, stdDev: 0, confidence: 0 };
  }
  const prices = data.map((d) => d.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Güven skoru: veri sayısı + düşük varyans = yüksek güven
  const dataScore = Math.min(1, data.length / 20); // 20 ilan = full data score
  const varianceScore = mean > 0 ? Math.max(0, 1 - stdDev / mean) : 0;
  const confidence = (dataScore + varianceScore) / 2;

  return {
    count: data.length,
    median,
    mean,
    min: prices[0],
    max: prices[prices.length - 1],
    stdDev,
    confidence,
  };
}

interface FactorResult {
  factors: PriceFactor[];
  adjustmentPct: number;
  explanation: string;
}

async function analyzeFactors(v: z.infer<typeof VehicleSchema>, stats: MarketStats): Promise<FactorResult> {
  if (stats.count === 0) {
    return {
      factors: [
        {
          factor: "no_market_data",
          impact: "neutral",
          weight: 1,
          value: "Yeterli piyasa verisi yok, fiyat önerisi güvenilir değil",
        },
      ],
      adjustmentPct: 0,
      explanation: "Bu araç için yeterli piyasa verisi bulunamadı. Lütfen manuel değerlendirin.",
    };
  }

  const prompt = `Sen bir otomotiv fiyat analisti olarak çalışıyorsun. Aşağıdaki araç için fiyat önerisini etkileyen faktörleri analiz et:

ARAÇ:
- Marka: ${v.make}
- Model: ${v.model}
- Yıl: ${v.year}
- Kilometre: ${v.mileageKm ?? "belirtilmemiş"}
- Yakıt: ${v.fuelType ?? "belirtilmemiş"}
- Vites: ${v.transmission ?? "belirtilmemiş"}
- Kasa: ${v.bodyType ?? "belirtilmemiş"}
- Durum: ${v.condition ?? "used"}
- Konum: ${v.countryCode ?? "TR"}/${v.city ?? "belirtilmemiş"}

PİYASA İSTATİSTİKLERİ (son 90 gün, ${stats.count} ilan):
- Ortanca fiyat: ${stats.median.toLocaleString()} ${v.currency}
- Ortalama: ${stats.mean.toLocaleString()} ${v.currency}
- Min: ${stats.min.toLocaleString()} ${v.currency}
- Maks: ${stats.max.toLocaleString()} ${v.currency}
- Standart sapma: ${stats.stdDev.toFixed(0)} ${v.currency}

Sadece JSON döndür, başka metin ekleme:
{
  "factors": [
    {
      "factor": "<kısa tanımlayıcı — örn. low_mileage, premium_brand, new_condition, popular_model>",
      "impact": "positive" | "negative" | "neutral",
      "weight": <0.0 to 1.0 — ne kadar etkili>,
      "value": "<Türkçe açıklama>"
    }
  ],
  "adjustmentPct": <toplam yüzde ayarlama — örn. -5 (daha düşük fiyat öner), +8 (daha yüksek)>,
  "explanation": "<Türkçe, 2-3 cümle piyasa analizi>"
}

Kurallar:
- Kilometre düşükse +%5 ile +%15 arası positive impact
- Premium markalar (BMW, Mercedes, Audi, Porsche, Tesla, Lexus) için +%5 ile +%10
- "new" veya "like_new" durum için +%10 ile +%20
- Hasarlı/damaged için -%15 ile -%30
- Popüler modeller (Toyota Corolla, Honda Civic, vb.) -%3 ile -%7 (likidite avantajı)
- adjustmentPct -20 ile +25 arasında olmalı`;

  try {
    const result = await openrouter.chat({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen otomotiv fiyat analizi yapıyorsun. Sadece JSON döndürürsün." },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      maxTokens: 800,
    });

    const json = extractJson(result.content);
    return {
      factors: json.factors ?? [],
      adjustmentPct: clampPct(json.adjustmentPct ?? 0),
      explanation: json.explanation ?? "",
    };
  } catch {
    return {
      factors: [],
      adjustmentPct: 0,
      explanation: `Piyasa ortanca fiyatı: ${stats.median.toLocaleString()} ${v.currency} (${stats.count} ilan analiz edildi).`,
    };
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampPct(n: number): number {
  return Math.max(-20, Math.min(25, n));
}

function extractJson(text: string): { factors?: PriceFactor[]; adjustmentPct?: number; explanation?: string } {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1] : text;
  return JSON.parse(raw.trim());
}