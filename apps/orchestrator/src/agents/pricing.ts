// Pricing Agent — piyasa karşılaştırması + LLM faktör analizi
// Hibrit: DB aggregation + LLM reasoning

import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

export interface PricingInput {
  make: string;
  model: string;
  year: number;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  condition?: "new" | "like_new" | "used" | "damaged";
  countryCode?: string;
  currency?: string;
  features?: string[];
}

export interface PricingFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  value: string;
}

export interface PricingResult {
  suggestedPrice: number;
  rangeLow: number;
  rangeHigh: number;
  currency: string;
  confidence: number;
  factors: PricingFactor[];
  marketComparisons: number;
  explanation: string;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function suggestPrice(input: PricingInput): Promise<PricingResult> {
  // 1. DB'den piyasa verisi
  const marketRes = await db.query<{
    price_amount: string | number;
    mileage_km: number;
    year: number;
    condition: string;
  }>(
    `SELECT v.price_amount, v.mileage_km, v.year, v.condition
     FROM public.vehicles v
     LEFT JOIN public.brands b ON b.id = v.make_id
     WHERE (b.name->>'en' = $1 OR b.name->>'tr' = $1)
       AND v.model = $2
       AND v.year BETWEEN $3 - 2 AND $3 + 2
       AND v.status = 'active'
       AND v.price_amount IS NOT NULL
       AND v.published_at > now() - interval '90 days'
     ORDER BY v.published_at DESC
     LIMIT 100`,
    [input.make, input.model, input.year],
  );

  const data = marketRes.rows.map((r) => ({
    price: Number(r.price_amount),
    year: r.year,
    mileage: r.mileage_km ?? 0,
    condition: r.condition,
  }));

  const stats = computeStats(data);
  const currency = input.currency ?? "USD";

  if (stats.count === 0) {
    return {
      suggestedPrice: 0,
      rangeLow: 0,
      rangeHigh: 0,
      currency,
      confidence: 0,
      factors: [],
      marketComparisons: 0,
      explanation: "Bu araç için yeterli piyasa verisi yok. Manuel değerlendirin.",
      model: "rule-based+v1",
      costUsd: 0,
      durationMs: 0,
      tokens: 0,
    };
  }

  // 2. LLM ile faktör analizi
  const prompt = `Sen otomotiv fiyat analisti olarak çalışıyorsun.

ARAÇ:
- Marka: ${input.make}
- Model: ${input.model}
- Yıl: ${input.year}
- KM: ${input.mileageKm ?? "belirtilmemiş"}
- Yakıt: ${input.fuelType ?? "—"}
- Vites: ${input.transmission ?? "—"}
- Kasa: ${input.bodyType ?? "—"}
- Durum: ${input.condition ?? "used"}
- Konum: ${input.countryCode ?? "TR"}

PİYASA (son 90 gün, ${stats.count} ilan):
- Ortanca: ${stats.median.toLocaleString()} ${currency}
- Ortalama: ${stats.mean.toLocaleString()} ${currency}
- Min: ${stats.min.toLocaleString()}, Max: ${stats.max.toLocaleString()}
- StdDev: ${stats.stdDev.toFixed(0)}

Sadece JSON:
{
  "factors": [
    {"factor": "<kısa>", "impact": "positive|negative|neutral", "weight": <0-1>, "value": "<TR açıklama>"}
  ],
  "adjustmentPct": <toplam yüzde, -20 ile +25 arası>,
  "explanation": "<TR 2-3 cümle>"
}

Kurallar:
- Premium marka (BMW, Mercedes, Audi, Porsche, Tesla, Lexus) → +5-10%
- Düşük km (100k altı) → +5-15%
- Sıfır/sıfır ayarında → +10-20%
- Hasarlı → -15-30%
- Popüler model (Toyota Corolla, Honda Civic) → -3-7% likidite
- adjustmentPct -20 ile +25 arasında`;

  const result = await openrouter.chat({
    model: MODELS.cheap_pricing,
    messages: [
      { role: "system", content: "Sen otomotiv fiyat analiz uzmanısın. Sadece JSON döndürürsün." },
      { role: "user", content: prompt },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.2,
    maxTokens: 800,
  });

  let analysis: { factors?: PricingFactor[]; adjustmentPct?: number; explanation?: string } = {};
  try {
    const codeBlock = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : result.content;
    analysis = JSON.parse(raw.trim());
  } catch {
    analysis = {};
  }

  const adjustment = clampPct(analysis.adjustmentPct ?? 0) / 100;
  const suggested = Math.round(stats.median * (1 + adjustment));
  const range = Math.round(stats.median * 0.12);

  return {
    suggestedPrice: suggested,
    rangeLow: suggested - range,
    rangeHigh: suggested + range,
    currency,
    confidence: clamp01(stats.confidence),
    factors: analysis.factors ?? [],
    marketComparisons: stats.count,
    explanation: analysis.explanation ?? `Piyasa ortanca fiyatı: ${stats.median.toLocaleString()} ${currency}.`,
    model: result.model,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    tokens: result.usage.totalTokens,
  };
}

interface Stats {
  count: number;
  median: number;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  confidence: number;
}

function computeStats(data: Array<{ price: number }>): Stats {
  if (data.length === 0) {
    return { count: 0, median: 0, mean: 0, min: 0, max: 0, stdDev: 0, confidence: 0 };
  }
  const prices = data.map((d) => d.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const dataScore = Math.min(1, data.length / 20);
  const varianceScore = mean > 0 ? Math.max(0, 1 - stdDev / mean) : 0;
  return {
    count: data.length,
    median,
    mean,
    min: prices[0],
    max: prices[prices.length - 1],
    stdDev,
    confidence: (dataScore + varianceScore) / 2,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function clampPct(n: number): number {
  return Math.max(-20, Math.min(25, n));
}