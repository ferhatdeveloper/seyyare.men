// Recommendation Agent — benzer ilanlar
// Hibrit: feature similarity (postgreSQL aggregation) + LLM reasoning

import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

export interface RecommendationInput {
  vehicleId?: string;
  make?: string;
  model?: string;
  year?: number;
  priceAmount?: number;
  bodyTypeId?: number;
  fuelTypeId?: number;
  locale: string;
  limit?: number;
}

export interface RecommendedVehicle {
  id: string;
  title: string | null;
  price_amount: number | null;
  price_currency: string | null;
  year: number | null;
  mileage_km: number | null;
  cover_url: string | null;
  reason: string;
}

export interface RecommendationResult {
  vehicles: RecommendedVehicle[];
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function recommendSimilar(input: RecommendationInput): Promise<RecommendationResult> {
  const limit = input.limit ?? 10;

  // 1. Reference vehicle (varsa referans olarak kullan)
  let referenceMakeId: number | null = null;
  let referencePrice: number | null = input.priceAmount ?? null;
  let referenceYear: number | null = input.year ?? null;

  if (input.vehicleId) {
    const refRes = await db.query<{ make_id: number; price_amount: string | number; year: number }>(
      `SELECT make_id, price_amount, year FROM public.vehicles WHERE id = $1`,
      [input.vehicleId],
    );
    const ref = refRes.rows[0];
    if (ref) {
      referenceMakeId = ref.make_id;
      referencePrice = Number(ref.price_amount);
      referenceYear = ref.year;
    }
  }

  // 2. SQL-based benzer ilanlar (feature similarity)
  const sqlConditions: string[] = ["status = 'active'", "id != $1"];
  const sqlParams: unknown[] = [input.vehicleId ?? "00000000-0000-0000-0000-000000000000"];

  if (referenceMakeId) {
    sqlConditions.push("make_id = $" + (sqlParams.length + 1));
    sqlParams.push(referenceMakeId);
  }
  if (referenceYear !== null) {
    sqlConditions.push("year BETWEEN $" + (sqlParams.length + 1) + " - 2 AND $" + (sqlParams.length + 1) + " + 2");
    sqlParams.push(referenceYear);
  }
  if (input.bodyTypeId) {
    sqlConditions.push("body_type_id = $" + (sqlParams.length + 1));
    sqlParams.push(input.bodyTypeId);
  }
  if (input.fuelTypeId) {
    sqlConditions.push("fuel_type_id = $" + (sqlParams.length + 1));
    sqlParams.push(input.fuelTypeId);
  }

  // Fiyat aralığı: ±%30
  if (referencePrice !== null) {
    const low = referencePrice * 0.7;
    const high = referencePrice * 1.3;
    sqlConditions.push(`price_amount BETWEEN $${sqlParams.length + 1} AND $${sqlParams.length + 2}`);
    sqlParams.push(Math.round(low), Math.round(high));
  }

  sqlParams.push(limit);

  const similarRes = await db.query<{
    id: string;
    title_original: string | null;
    year: number | null;
    mileage_km: number | null;
    price_amount: string | number | null;
    price_currency: string | null;
    cover_url: string | null;
  }>(
    `SELECT v.id, v.title_original, v.year, v.mileage_km, v.price_amount, v.price_currency,
            (SELECT url FROM public.vehicle_media m WHERE m.vehicle_id = v.id ORDER BY m.is_cover DESC, m.sort_order ASC LIMIT 1) AS cover_url
     FROM public.vehicles v
     WHERE ${sqlConditions.join(" AND ")}
     ORDER BY v.published_at DESC NULLS LAST
     LIMIT $${sqlParams.length}`,
    sqlParams,
  );

  const candidates = similarRes.rows;

  // 3. LLM ile "neden bu?" reasoning
  const reasonsPrompt = candidates.length === 0
    ? null
    : `Sen bir araç öneri asistanısın. Aşağıdaki ilanların her birine 1 cümle "neden bu ilanı öneriyorum" açıklaması yaz:

Referans araç: ${input.make ?? "—"} ${input.model ?? ""} ${input.year ?? ""} ${input.priceAmount ? `${input.priceAmount} ${"USD"}` : ""}

İlanlar:
${candidates.slice(0, 5).map((c, i) => `${i + 1}. ${c.title_original} (${c.year}, ${c.price_amount} ${c.price_currency}, ${c.mileage_km?.toLocaleString() ?? "?"} km)`).join("\n")}

Sadece JSON: {"reasons": ["...", "...", ...]}`;

  let reasons: string[] = [];
  let costUsd = 0;
  let durationMs = 0;
  let tokens = 0;
  let modelUsed = "rule-based";

  if (reasonsPrompt && candidates.length > 0) {
    const llmRes = await openrouter.chat({
      model: MODELS.cheap_recommend,
      messages: [{ role: "user", content: reasonsPrompt }],
      responseFormat: { type: "json_object" },
      temperature: 0.3,
      maxTokens: 300,
    });

    try {
      const parsed = JSON.parse(llmRes.content.trim()) as { reasons?: string[] };
      reasons = parsed.reasons ?? [];
    } catch {
      reasons = [];
    }
    costUsd = llmRes.costUsd;
    durationMs = llmRes.durationMs;
    tokens = llmRes.usage.totalTokens;
    modelUsed = llmRes.model;
  }

  return {
    vehicles: candidates.map((c, i) => ({
      id: c.id,
      title: c.title_original,
      price_amount: c.price_amount ? Number(c.price_amount) : null,
      price_currency: c.price_currency,
      year: c.year,
      mileage_km: c.mileage_km,
      cover_url: c.cover_url,
      reason: reasons[i] ?? "Benzer özellikler",
    })),
    model: modelUsed,
    costUsd,
    durationMs,
    tokens,
  };
}