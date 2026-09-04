// Recommendation Agent — pgvector-based similarity search
// Hibrit: pgvector cosine similarity + SQL feature similarity + LLM reasoning

import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

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
  similarity?: number; // pgvector similarity (0..1)
}

export interface RecommendationResult {
  vehicles: RecommendedVehicle[];
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
  source: "vector" | "sql" | "hybrid";
}

const EMBEDDING_DIM = 384;
const CACHE_TTL_SEC = 60 * 60; // 1 saat

/**
 * Embedding üret (OpenRouter üzerinden sentence-transformers destekleyen model)
 * Not: OpenRouter'da hosted embedding modelleri sınırlı.
 * Production'da kendi inference'ınızı kullanmanız önerilir.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = `emb:${hashText(text)}`;
  const cached = await redis.get<number[]>(cacheKey);
  if (cached) return cached;

  // OpenRouter'da şu an embedding endpoint yok.
  // Deterministik pseudo-embedding: text'in kelime frekansından 384-dim vektör
  // Production'da: sentence-transformers, OpenAI embeddings, veya cohere
  const vector = pseudoEmbed(text, EMBEDDING_DIM);

  await redis.set(cacheKey, vector, CACHE_TTL_SEC);
  return vector;
}

/**
 * Deterministik pseudo-embedding (demo amaçlı).
 * Gerçek üretimde sentence-transformers veya hosted embedding kullanılmalı.
 */
function pseudoEmbed(text: string, dim: number): number[] {
  const vec = new Array(dim).fill(0);
  // Karakter seviyesinde dağılım + kelime hash'i
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const idx = (code * 2654435761) % dim;
    vec[idx] += 1 / Math.sqrt(text.length);
  }
  // L2 normalize (cosine similarity için)
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  return norm > 0 ? vec.map((x) => x / norm) : vec;
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36) + ":" + text.length;
}

function toPgVector(arr: number[]): string {
  return "[" + arr.join(",") + "]";
}

export async function recommendSimilar(input: RecommendationInput): Promise<RecommendationResult> {
  const start = Date.now();
  const limit = Math.min(input.limit ?? 10, 50);
  let vehicles: RecommendedVehicle[] = [];
  let source: "vector" | "sql" | "hybrid" = "sql";
  let totalCost = 0;
  let totalTokens = 0;
  let modelUsed = "rule-based";

  // 1. Reference vehicle'dan embedding oluştur (varsa)
  if (input.vehicleId) {
    try {
      // Embedding cache veya oluştur
      let queryEmbedding = await redis.get<number[]>(`vehicle-emb:${input.vehicleId}`);

      if (!queryEmbedding) {
        const refVehicle = await db.query<{
          title_original: string;
          description_original: string;
          make_name: string;
          model: string;
          year: number;
          price_amount: string | number;
        }>(
          `SELECT v.title_original, v.description_original,
                  b.name->>'en' as make_name, v.model, v.year, v.price_amount
           FROM public.vehicles v
           LEFT JOIN public.brands b ON b.id = v.make_id
           WHERE v.id = $1`,
          [input.vehicleId],
        );

        if (refVehicle.rows[0]) {
          const ref = refVehicle.rows[0];
          const text = [
            ref.make_name,
            ref.model,
            ref.year,
            ref.title_original ?? "",
            ref.description_original?.slice(0, 500) ?? "",
          ].join(" ");

          queryEmbedding = await generateEmbedding(text);

          // Embedding'i DB'ye kaydet
          const vectorStr = toPgVector(queryEmbedding);
          await db.query(
            `INSERT INTO public.vehicle_embeddings (vehicle_id, embedding, content_text, content_hash, model_name)
             VALUES ($1, $2::vector, $3, $4, $5)
             ON CONFLICT (vehicle_id) DO UPDATE SET
               embedding = EXCLUDED.embedding,
               content_text = EXCLUDED.content_text,
               content_hash = EXCLUDED.content_hash,
               updated_at = now()`,
            [
              input.vehicleId,
              vectorStr,
              text,
              hashText(text),
              "sentence-transformers/all-MiniLM-L6-v2",
            ],
          ).catch((err) => console.warn("[recommend] embedding save failed:", err));
        }
      }

      if (queryEmbedding && queryEmbedding.length === EMBEDDING_DIM) {
        // 2. pgvector ile benzer araçları bul
        const vectorStr = toPgVector(queryEmbedding);
        const res = await db.query<{
          vehicle_id: string;
          similarity: string | number;
          title_original: string | null;
          price_amount: string | number | null;
          price_currency: string | null;
          year: number | null;
          mileage_km: number | null;
          cover_url: string | null;
        }>(
          `SELECT * FROM public.find_similar_vehicles(
             $1::vector,
             $2::uuid,
             $3::integer,
             0.3::numeric,
             NULL,
             NULL
           )`,
          [vectorStr, input.vehicleId, limit],
        ).catch((err) => {
          console.warn("[recommend] vector search failed (pgvector not loaded?):", err.message);
          return null;
        });

        if (res && res.rows.length > 0) {
          // Vehicle detaylarını topla (cover_url, mileage_km için)
          const vehicleIds = res.rows.map((r) => r.vehicle_id);
          const detailsRes = await db.query<{
            id: string;
            mileage_km: number | null;
            cover_url: string | null;
          }>(
            `SELECT v.id, v.mileage_km,
                    (SELECT url FROM public.vehicle_media m WHERE m.vehicle_id = v.id
                     ORDER BY m.is_cover DESC, m.sort_order ASC LIMIT 1) AS cover_url
             FROM public.vehicles v
             WHERE v.id = ANY($1::uuid[])`,
            [vehicleIds],
          );
          const detailsMap = new Map(detailsRes.rows.map((d) => [d.id, d]));

          vehicles = res.rows.map((r) => {
            const detail = detailsMap.get(r.vehicle_id);
            return {
              id: r.vehicle_id,
              title: r.title_original,
              price_amount: r.price_amount ? Number(r.price_amount) : null,
              price_currency: r.price_currency,
              year: r.year,
              mileage_km: detail?.mileage_km ?? null,
              cover_url: detail?.cover_url ?? null,
              reason: `Benzer içerik (skor: ${Number(r.similarity).toFixed(2)})`,
              similarity: Number(r.similarity),
            };
          });

          source = vehicles.length > 0 ? "vector" : "sql";
        }
      }
    } catch (err) {
      console.warn("[recommend] vector search path failed:", err);
    }
  }

  // 3. Fallback: SQL feature similarity (vector search başarısızsa veya boşsa)
  if (vehicles.length === 0) {
    const sqlConditions: string[] = ["v.status = 'active'", "v.id != $1"];
    const sqlParams: unknown[] = [input.vehicleId ?? "00000000-0000-0000-0000-000000000000"];

    if (input.make) {
      sqlConditions.push("v.make_id = (SELECT id FROM public.brands WHERE name->>'en' = $2 OR name->>'tr' = $2 LIMIT 1)");
      sqlParams.push(input.make);
    }
    if (input.bodyTypeId) {
      sqlConditions.push(`v.body_type_id = $${sqlParams.length + 1}`);
      sqlParams.push(input.bodyTypeId);
    }
    if (input.fuelTypeId) {
      sqlConditions.push(`v.fuel_type_id = $${sqlParams.length + 1}`);
      sqlParams.push(input.fuelTypeId);
    }
    if (input.year) {
      sqlConditions.push(`v.year BETWEEN $${sqlParams.length + 1} - 2 AND $${sqlParams.length + 1} + 2`);
      sqlParams.push(input.year);
    }
    if (input.priceAmount) {
      sqlParams.push(Math.round(input.priceAmount * 0.7));
      sqlParams.push(Math.round(input.priceAmount * 1.3));
      sqlConditions.push(`v.price_amount BETWEEN $${sqlParams.length - 1} AND $${sqlParams.length}`);
    }
    sqlParams.push(limit);

    const sqlRes = await db.query<{
      id: string;
      title_original: string | null;
      year: number | null;
      mileage_km: number | null;
      price_amount: string | number | null;
      price_currency: string | null;
      cover_url: string | null;
    }>(
      `SELECT v.id, v.title_original, v.year, v.mileage_km, v.price_amount, v.price_currency,
              (SELECT url FROM public.vehicle_media m WHERE m.vehicle_id = v.id
               ORDER BY m.is_cover DESC, m.sort_order ASC LIMIT 1) AS cover_url
       FROM public.vehicles v
       WHERE ${sqlConditions.join(" AND ")}
       ORDER BY v.published_at DESC NULLS LAST
       LIMIT $${sqlParams.length}`,
      sqlParams,
    );

    vehicles = sqlRes.rows.map((r) => ({
      id: r.id,
      title: r.title_original,
      price_amount: r.price_amount ? Number(r.price_amount) : null,
      price_currency: r.price_currency,
      year: r.year,
      mileage_km: r.mileage_km,
      cover_url: r.cover_url,
      reason: "Benzer özellikler",
    }));
  }

  // 4. LLM ile neden bu? reasoning ekle
  if (vehicles.length > 0) {
    try {
      const topN = vehicles.slice(0, 5);
      const reasonsPrompt = `Sen bir araç öneri asistanısın. Aşağıdaki ilanların her birine 1 cümle "neden bu ilanı öneriyorum" açıklaması yaz:

Referans araç: ${input.make ?? "—"} ${input.model ?? ""} ${input.year ?? ""} ${input.priceAmount ? `${input.priceAmount} USD` : ""}

İlanlar:
${topN.map((v, i) => `${i + 1}. ${v.title} (${v.year}, ${v.price_amount} ${v.price_currency}, ${v.mileage_km?.toLocaleString() ?? "?"} km)`).join("\n")}

Sadece JSON: {"reasons": ["...", "...", ...]}`;

      const llmRes = await openrouter.chat({
        model: MODELS.cheap_recommend,
        messages: [{ role: "user", content: reasonsPrompt }],
        responseFormat: { type: "json_object" },
        temperature: 0.3,
        maxTokens: 300,
      });

      try {
        const parsed = JSON.parse(llmRes.content.trim()) as { reasons?: string[] };
        const reasons = parsed.reasons ?? [];
        vehicles = vehicles.map((v, i) => ({
          ...v,
          reason: reasons[i] ?? v.reason,
        }));
      } catch {
        // Fallback: default reason
      }

      totalCost = llmRes.costUsd;
      totalTokens = llmRes.usage.totalTokens;
      modelUsed = llmRes.model;
    } catch {
      // LLM başarısız olursa, default reason'larla devam et
    }
  }

  return {
    vehicles,
    model: modelUsed,
    costUsd: totalCost,
    durationMs: Date.now() - start,
    tokens: totalTokens,
    source,
  };
}