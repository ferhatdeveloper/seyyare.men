// Translation Agent — 6 dilde paralel çeviri (Tier 1: free model)

import { openrouter, MODELS } from "../openrouter.js";
import { redis } from "../lib/redis.js";

const SUPPORTED_LOCALES = ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_NAMES: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
  ar: "Arabic (MSA)",
  fa: "Persian/Farsi",
  "ku-bad": "Kurdish (Badini, Latin script)",
  "ku-sor": "Kurdish (Sorani, Arabic script)",
};

const CONTEXT_HINTS = {
  vehicle_title: "Bu bir araç ilan başlığı. Kısa ve çekici tut.",
  vehicle_description: "Bu bir araç ilan açıklaması. Tüm teknik detayları koru.",
  chat: "Bu bir kullanıcı mesajı. Samimi ton.",
  ui: "Bu bir UI metni. Kısa ve net.",
  general: "Doğal çeviri yap.",
} as const;

export interface TranslationRequest {
  text: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  context?: keyof typeof CONTEXT_HINTS;
}

export interface TranslationItem {
  sourceLocale: Locale;
  targetLocale: Locale;
  text: string;
}

export interface TranslationResult {
  sourceLocale: Locale;
  translations: TranslationItem[];
  totalCostUsd: number;
  totalDurationMs: number;
  totalTokens: number;
}

export async function translateBatch(req: TranslationRequest): Promise<TranslationResult> {
  const context = req.context ?? "general";
  const targetLocales = req.targetLocales.filter((t) => t !== req.sourceLocale);

  const start = Date.now();
  const translations = await Promise.all(
    targetLocales.map((tl) => translateOne(req.text, req.sourceLocale, tl, context)),
  );

  let totalCost = 0;
  let totalDuration = 0;
  let totalTokens = 0;

  // Maliyet takibi için sonuçları say
  for (const _ of translations) {
    // Her biri aslında parallel çalışıyor, sonuçta cost zaten metinde
    totalCost += 0; // free model: Llama 3.3 70B
    totalDuration += Date.now() - start;
  }

  return {
    sourceLocale: req.sourceLocale,
    translations: translations.map((text, i) => ({
      sourceLocale: req.sourceLocale,
      targetLocale: targetLocales[i],
      text,
    })),
    totalCostUsd: 0,
    totalDurationMs: Date.now() - start,
    totalTokens: 0,
  };
}

async function translateOne(
  text: string,
  source: Locale,
  target: Locale,
  context: keyof typeof CONTEXT_HINTS,
): Promise<string> {
  const cacheKey = `translate:${source}:${target}:${context}:${hashText(text)}`;
  const cached = await redis.get<string>(cacheKey);
  if (cached) return cached;

  const sourceName = LOCALE_NAMES[source];
  const targetName = LOCALE_NAMES[target];

  const prompt = `Translate the following text from ${sourceName} to ${targetName}.
${CONTEXT_HINTS[context]}

CRITICAL RULES:
- Preserve ALL numbers, model names, brands, and technical specs EXACTLY
- For Kurdish: use ${target === "ku-bad" ? "Kirmancki/Badini Latin script" : "Sorani Arabic script"}
- Output ONLY the translation, no explanations, no quotes

Text:
"""
${text}
"""`;

  try {
    const result = await openrouter.chat({
      model: MODELS.free_translate,
      messages: [
        {
          role: "system",
          content: "You are a professional translator specializing in automotive content.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      maxTokens: Math.min(4000, text.length * 4),
    });

    const translated = result.content.trim().replace(/^["']|["']$/g, "");
    await redis.set(cacheKey, translated, 60 * 60 * 24 * 7); // 7 gün cache
    return translated;
  } catch (err) {
    console.warn(`[translate] ${source}->${target} failed:`, err);
    return text; // Fallback: orijinal metni döndür
  }
}

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36) + ":" + text.length;
}

export { SUPPORTED_LOCALES };
export type { Locale };