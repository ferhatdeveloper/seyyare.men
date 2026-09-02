import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { openrouter } from "../services/openrouter.js";

const AssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const AssistantRequestSchema = z.object({
  messages: z.array(AssistantMessageSchema).min(1).max(20),
  locale: z.enum(["tr", "en", "ar", "fa", "ku-bad", "ku-sor"]).default("tr"),
  context: z
    .object({
      userId: z.string().uuid().optional(),
      recentSearches: z.array(z.string()).optional(),
      favorites: z.array(z.string()).optional(),
    })
    .optional(),
});

interface SearchContext {
  matches: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    year: number;
    mileage: number;
    summary: string;
  }>;
}

interface AssistantReply {
  reply: string;
  suggestedFilters?: Record<string, unknown>;
  matchedVehicles?: SearchContext["matches"];
  usage: { tokens: number; costUsd: number };
}

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/assistant
   * Body: { messages: [{role, content}], locale, context: {userId, recentSearches, favorites} }
   * Returns: { reply, suggestedFilters?, matchedVehicles?, usage }
   */
  app.post("/ai/assistant", async (req, reply) => {
    const parsed = AssistantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { messages, locale, context } = parsed.data;

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // RAG: veritabanından ilgili ilanları çek
    const searchContext = await fetchRelevantVehicles(lastUserMsg, locale);

    const localeName = {
      tr: "Türkçe",
      en: "English",
      ar: "Arabic",
      fa: "Persian",
      "ku-bad": "Kurdish (Badini)",
      "ku-sor": "Kurdish (Sorani)",
    }[locale];

    const systemPrompt = `Sen Seyyare.men'in AI araç asistanısın. Kullanıcılara araç arama, karşılaştırma ve satın alma konusunda yardımcı oluyorsun.

KURALLAR:
- ${localeName} dilinde yanıt ver
- Samimi, kısa ve net ol (max 4-5 cümle)
- Spesifik araç önerileri yapabiliyorsan yap, mümkünse araç adı + fiyat aralığı ver
- Kullanıcının sorgusuna göre filtre önerileri sunabilirsin
- Eğer kullanıcının sorusu belirsizse, max 1-2 net soru sor
- Fiyat, kilometre, yıl gibi spesifik rakamları her zaman belirt
- Pazarlama dili kullanma, gerçekçi ol
- Sahte/uygunsuz içerik üretme

${searchContext ? `\nİLGİLİ İLANLAR:\n${JSON.stringify(searchContext.matches, null, 2)}\n` : ""}

${context?.recentSearches?.length ? `\nKULLANICININ SON ARAMALARI: ${context.recentSearches.join(", ")}` : ""}`;

    try {
      const result = await openrouter.chat({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.4,
        maxTokens: 800,
      });

      const reply_text = result.content;

      const out: AssistantReply = {
        reply: reply_text,
        suggestedFilters: extractFilters(lastUserMsg),
        matchedVehicles: searchContext?.matches.slice(0, 5),
        usage: {
          tokens: result.usage.totalTokens,
          costUsd: result.costUsd,
        },
      };

      const userId = (req.headers["x-user-id"] as string) ?? null;
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, duration_ms, completed_at)
         VALUES ($1, 'assistant', 'completed', $2, $3, $4, $5, $6, now())`,
        [
          userId,
          JSON.stringify({ message_count: messages.length, locale }),
          JSON.stringify({ reply: reply_text.slice(0, 500) }),
          result.model,
          result.costUsd,
          result.durationMs,
        ],
      );

      return reply.send(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "assistant_failed";
      return reply.code(502).send({ error: msg });
    }
  });
}

async function fetchRelevantVehicles(query: string, locale: string): Promise<SearchContext | null> {
  // Basit keyword extraction (geliştirilebilir)
  const tokens = query.toLowerCase().match(/[a-zığüşöçâêîû\-]{3,}/g) ?? [];
  if (tokens.length === 0) return null;

  try {
    const res = await db.query<{
      id: string;
      title_original: string;
      price_amount: string | number;
      price_currency: string;
      year: number;
      mileage_km: number;
      make: string;
      model: string;
    }>(
      `SELECT v.id, v.title_original, v.price_amount, v.price_currency, v.year, v.mileage_km,
              COALESCE(b.name->>$1, b.name->>'en') as make,
              v.model
       FROM public.vehicles v
       LEFT JOIN public.brands b ON b.id = v.make_id
       WHERE v.status = 'active'
         AND (
           v.search_tsv @@ plainto_tsquery('simple', $2)
           OR v.title_original ILIKE '%' || $2 || '%'
           OR v.make_custom ILIKE '%' || $2 || '%'
           OR b.name->>'en' ILIKE '%' || $2 || '%'
           OR b.name->>'tr' ILIKE '%' || $2 || '%'
         )
       ORDER BY v.published_at DESC NULLS LAST
       LIMIT 10`,
      [locale, tokens.slice(0, 3).join(" ")],
    );

    return {
      matches: res.rows.map((r) => ({
        id: r.id,
        title: r.title_original,
        price: Number(r.price_amount),
        currency: r.price_currency,
        year: r.year,
        mileage: r.mileage_km ?? 0,
        summary: `${r.year} ${r.make} ${r.model} — ${r.price_amount} ${r.price_currency}`,
      })),
    };
  } catch {
    return null;
  }
}

function extractFilters(query: string): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  const lower = query.toLowerCase();

  // Marka
  const brands = ["toyota", "bmw", "mercedes", "audi", "volkswagen", "ford", "honda", "hyundai", "tesla"];
  for (const b of brands) {
    if (lower.includes(b)) filters.make = b;
  }

  // Yıl aralığı
  const yearMatch = lower.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (yearMatch) filters.yearRange = [Number(yearMatch[1]), Number(yearMatch[2])];

  // Fiyat
  const priceMatch = lower.match(/(?:altında|under|below|az)\s*(\d+)\s*(?:bin|k|tl|usd|eur|\$|€|₺)?/i);
  if (priceMatch) filters.maxPrice = Number(priceMatch[1]) * (priceMatch[1].length <= 3 ? 1000 : 1);

  // Yakıt
  if (/dizel|diesel/i.test(lower)) filters.fuel = "diesel";
  else if (/benzin|gasoline/i.test(lower)) filters.fuel = "gasoline";
  else if (/elektrik|electric/i.test(lower)) filters.fuel = "electric";
  else if (/hibrit|hybrid/i.test(lower)) filters.fuel = "hybrid";

  // Vites
  if (/otomatik|automatic/i.test(lower)) filters.transmission = "automatic";
  else if (/manuel|manual/i.test(lower)) filters.transmission = "manual";

  return Object.keys(filters).length > 0 ? filters : undefined;
}