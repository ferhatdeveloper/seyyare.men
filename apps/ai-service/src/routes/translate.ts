import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter } from "../services/openrouter.js";

const SUPPORTED_LOCALES = ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"] as const;
const LOCALE_NAMES: Record<string, string> = {
  tr: "Türkçe",
  en: "English",
  ar: "Arabic",
  fa: "Persian/Farsi",
  "ku-bad": "Kurdish (Badini, Latin script)",
  "ku-sor": "Kurdish (Sorani, Arabic script)",
};

const TranslateSchema = z.object({
  text: z.string().min(1).max(8000),
  sourceLocale: z.enum(SUPPORTED_LOCALES).default("en"),
  targetLocales: z.array(z.enum(SUPPORTED_LOCALES)).min(1).max(6),
  context: z.enum(["vehicle_title", "vehicle_description", "chat", "ui", "general"]).default("general"),
});

const BatchTranslateSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(100),
  sourceLocale: z.enum(SUPPORTED_LOCALES).default("en"),
  targetLocales: z.array(z.enum(SUPPORTED_LOCALES)).min(1).max(6),
  context: z.enum(["vehicle_title", "vehicle_description", "chat", "ui", "general"]).default("general"),
});

interface TranslationResult {
  source: string;
  target: string;
  text: string;
  model: string;
  costUsd: number;
}

export async function translateRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/translate
   * Body: { text, sourceLocale, targetLocales[], context }
   * Returns: { translations: [{ targetLocale, text, model, costUsd }] }
   */
  app.post("/ai/translate", async (req, reply) => {
    const parsed = TranslateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { text, sourceLocale, targetLocales, context } = parsed.data;

    const results = await Promise.all(
      targetLocales
        .filter((t) => t !== sourceLocale)
        .map((targetLocale) =>
          translateOne(text, sourceLocale, targetLocale, context).then(
            (text) => ({ sourceLocale, targetLocale, text }),
          ),
        ),
    );

    // DB'ye logla
    const userId = (req.headers["x-user-id"] as string) ?? null;
    for (const r of results) {
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, completed_at)
         VALUES ($1, 'translate', 'completed', $2, $3, $4, $5, now())`,
        [
          userId,
          JSON.stringify({ from: r.sourceLocale, to: r.targetLocale, context }),
          JSON.stringify({ length: r.text.length }),
          "meta-llama/llama-3.3-70b-instruct:free",
          0,
          0,
        ],
      );
    }

    return reply.send({
      sourceLocale,
      translations: results,
    });
  });

  /**
   * POST /ai/translate/batch
   * Body: { items: [{id, text}], sourceLocale, targetLocales[], context }
   */
  app.post("/ai/translate/batch", async (req, reply) => {
    const parsed = BatchTranslateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { items, sourceLocale, targetLocales, context } = parsed.data;

    const out: Array<{ id: string; translations: Record<string, string> }> = [];
    for (const item of items) {
      const tr: Record<string, string> = {};
      for (const target of targetLocales) {
        if (target === sourceLocale) {
          tr[target] = item.text;
          continue;
        }
        tr[target] = await translateOne(item.text, sourceLocale, target, context);
      }
      out.push({ id: item.id, translations: tr });
    }

    return reply.send({ sourceLocale, targetLocales, items: out });
  });
}

async function translateOne(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  context: string,
): Promise<string> {
  const cacheKey = `translate:${sourceLocale}:${targetLocale}:${context}:${hashText(text)}`;
  const cached = await cache.get<string>(cacheKey);
  if (cached) return cached;

  const sourceName = LOCALE_NAMES[sourceLocale];
  const targetName = LOCALE_NAMES[targetLocale];

  const contextHint = {
    vehicle_title: "This is a vehicle listing title. Keep it concise and attractive.",
    vehicle_description:
      "This is a vehicle listing description. Translate naturally while preserving all technical details.",
    chat: "This is a chat message between users. Keep the tone friendly.",
    ui: "This is a UI string. Keep it short and clear.",
    general: "Translate naturally.",
  }[context];

  const prompt = `Translate the following text from ${sourceName} to ${targetName}.
${contextHint}

CRITICAL RULES:
- Preserve ALL numbers, model names, brands, and technical specs EXACTLY
- For Kurdish: use ${targetLocale === "ku-bad" ? "Kirmancki/Badini Latin script" : "Sorani Arabic script"} — never mix
- Output ONLY the translation, no explanations, no quotes, no preamble

Text:
"""
${text}
"""`;

  try {
    const result = await openrouter.chat({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in automotive content across multiple languages.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      maxTokens: Math.min(4000, text.length * 4),
    });

    const translated = result.content.trim().replace(/^["']|["']$/g, "");
    await cache.set(cacheKey, translated, 60 * 60 * 24 * 7); // 7 gün
    return translated;
  } catch (err) {
    app.log.error({ err: (err as Error).message }, "translate failed");
    return text; // Fallback: orijinal metni döndür
  }
}

function hashText(text: string): string {
  // Basit, hızlı hash
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36) + ":" + text.length;
}