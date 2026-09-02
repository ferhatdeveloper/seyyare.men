// Search Agent — doğal dil → SQL filter decomposition + RAG retrieval
// Hibrit: PostgreSQL full-text + structured filters

import { z } from "zod";
import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

const QUERY_PARSER_PROMPT = `Sen bir araç arama sorgu parser'ısın. Kullanıcının doğal dildeki sorgusunu PostgREST/PostgreSQL filtrelerine dönüştür.

Desteklenen filtreler:
- q: genel arama metni (marka, model, anahtar kelime)
- makeIds: marka id listesi (boş bırakırsan boş array)
- bodyTypeIds: kasa tipi id listesi (sedan=1, hatchback=2, suv=3, pickup=4, coupe=5, convertible=6, wagon=7, van=8, minivan=9, truck=10, motorcycle=11)
- fuelTypeIds: yakıt id (gasoline=1, diesel=2, lpg=3, hybrid=4, electric=5, cng=6)
- transmissionIds: vites id (manual=1, automatic=2, cvt=3, semi_auto=4)
- minYear, maxYear: yıl aralığı
- minPrice, maxPrice: fiyat aralığı (USD)
- minMileage, maxMileage: km aralığı
- condition: "new" | "like_new" | "used" | "damaged"
- countryCode: ülke kodu (TR, IQ, DE, US, SA, AE, GB, FR, NL, SE)
- sortBy: "created_at" | "price" | "year" | "mileage" | "distance"
- sortDir: "asc" | "desc"

Sadece JSON döndür:
{
  "filters": { ... },
  "reasoning": "<TR 1 cümle ne anladın>"
}

Eğer sorgu belirsizse boş filters döndür.`;

export interface SearchFilters {
  q?: string;
  makeIds?: number[];
  bodyTypeIds?: number[];
  fuelTypeIds?: number[];
  transmissionIds?: number[];
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  condition?: "new" | "like_new" | "used" | "damaged";
  countryCode?: string;
  sortBy?: "created_at" | "price" | "year" | "mileage" | "distance";
  sortDir?: "asc" | "desc";
}

export interface SearchResult {
  filters: SearchFilters;
  reasoning: string;
  vehicles: Array<{
    id: string;
    title: string | null;
    year: number | null;
    mileage_km: number | null;
    price_amount: number | null;
    price_currency: string | null;
    country_code: string | null;
    city: string | null;
    cover_url: string | null;
  }>;
  totalCount: number;
  model: string;
  costUsd: number;
  durationMs: number;
}

export async function searchVehicles(opts: {
  query: string;
  locale: string;
  pageSize?: number;
  pageOffset?: number;
}): Promise<SearchResult> {
  // 1. LLM ile sorgu parse
  const parseResult = await openrouter.chat({
    model: MODELS.cheap_search,
    messages: [
      { role: "system", content: QUERY_PARSER_PROMPT },
      { role: "user", content: `Kullanıcı sorgusu: "${opts.query}"\nDil: ${opts.locale}` },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 500,
  });

  let parsed: { filters?: SearchFilters; reasoning?: string } = { filters: {} };
  try {
    const codeBlock = parseResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : parseResult.content;
    parsed = JSON.parse(raw.trim());
  } catch {
    parsed = { filters: { q: opts.query } };
  }

  const filters: SearchFilters = parsed.filters ?? { q: opts.query };
  const pageSize = opts.pageSize ?? 20;
  const pageOffset = opts.pageOffset ?? 0;

  // 2. PostgREST RPC ile ara
  const rpcArgs = {
    p_q: filters.q ?? null,
    p_make_ids: filters.makeIds ?? null,
    p_body_type_ids: filters.bodyTypeIds ?? null,
    p_fuel_type_ids: filters.fuelTypeIds ?? null,
    p_transmission_ids: filters.transmissionIds ?? null,
    p_color_ids: null,
    p_country_code: filters.countryCode ?? null,
    p_city: null,
    p_min_year: filters.minYear ?? null,
    p_max_year: filters.maxYear ?? null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_min_mileage: filters.minMileage ?? null,
    p_max_mileage: filters.maxMileage ?? null,
    p_condition_filter: filters.condition ?? null,
    p_lat: null,
    p_lng: null,
    p_radius_km: null,
    p_locale: opts.locale,
    p_sort_by: filters.sortBy ?? "created_at",
    p_sort_dir: filters.sortDir ?? "desc",
    p_page_size: pageSize,
    p_page_offset: pageOffset,
  };

  const res = await db.query<{
    id: string;
    title: string | null;
    year: number | null;
    mileage_km: number | null;
    price_amount: string | number | null;
    price_currency: string | null;
    country_code: string | null;
    city: string | null;
    cover_url: string | null;
  }>(
    `SELECT * FROM public.search_vehicles(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    )`,
    [
      rpcArgs.p_q,
      rpcArgs.p_make_ids,
      rpcArgs.p_body_type_ids,
      rpcArgs.p_fuel_type_ids,
      rpcArgs.p_transmission_ids,
      rpcArgs.p_color_ids,
      rpcArgs.p_country_code,
      rpcArgs.p_city,
      rpcArgs.p_min_year,
      rpcArgs.p_max_year,
      rpcArgs.p_min_price,
      rpcArgs.p_max_price,
      rpcArgs.p_min_mileage,
      rpcArgs.p_max_mileage,
      rpcArgs.p_condition_filter,
      rpcArgs.p_lat,
      rpcArgs.p_lng,
      rpcArgs.p_radius_km,
      rpcArgs.p_locale,
      rpcArgs.p_sort_by,
      rpcArgs.p_sort_dir,
      rpcArgs.p_page_size,
      rpcArgs.p_page_offset,
    ],
  );

  return {
    filters,
    reasoning: parsed.reasoning ?? "",
    vehicles: res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year,
      mileage_km: r.mileage_km,
      price_amount: r.price_amount ? Number(r.price_amount) : null,
      price_currency: r.price_currency,
      country_code: r.country_code,
      city: r.city,
      cover_url: r.cover_url,
    })),
    totalCount: res.rows.length,
    model: parseResult.model,
    costUsd: parseResult.costUsd,
    durationMs: parseResult.durationMs,
  };
}