// Intent Classifier — kullanıcı niyetini anla, hangi agent'lara yönlendir
// Tier 1: cheap_intent (Gemini Flash)

import { openrouter, MODELS } from "../openrouter.js";
import type { ThreadState } from "../checkpointer.js";

export type Intent =
  | "create_listing"
  | "search_vehicles"
  | "view_vehicle"
  | "negotiate_price"
  | "rent_vehicle"
  | "translate_content"
  | "check_damage"
  | "recommend_similar"
  | "fraud_check"
  | "support_help"
  | "general_chat";

const INTENT_PROMPT = `Sen bir araç platformu için intent classifier'sın. Kullanıcının mesajını analiz et ve uygun niyeti seç.

INTENTS:
- create_listing: kullanıcı araç satmak/ilan vermek istiyor
- search_vehicles: kullanıcı araç aramak istiyor
- view_vehicle: kullanıcı belirli bir ilana bakıyor
- negotiate_price: kullanıcı fiyat pazarlığı yapıyor
- rent_vehicle: kullanıcı araç kiralamak istiyor
- translate_content: kullanıcı çeviri istiyor
- check_damage: kullanıcı hasar tespiti istiyor
- recommend_similar: kullanıcı benzer ilanlar istiyor
- fraud_check: kullanıcı ilan doğrulama istiyor
- support_help: kullanıcı yardım/destek istiyor
- general_chat: diğer her şey

Sadece JSON döndür:
{
  "intent": "<yukarıdakilerden biri>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<1 cümle>",
  "extractedEntities": {
    "make": "...",
    "model": "...",
    "year": ...,
    "price": ...,
    "location": "...",
    "vehicleId": "..."
  }
}

Kullanıcının dili: locale bilgisine göre yanıt ver.`;

export interface IntentResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
  entities: Record<string, unknown>;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function classifyIntent(opts: {
  text: string;
  locale: string;
  thread: ThreadState;
  images?: string[];
}): Promise<IntentResult> {
  const userMessage = [
    opts.text,
    opts.images ? `[${opts.images.length} görsel yüklendi]` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const contextHint = opts.thread.intent
    ? `Önceki niyet: ${opts.thread.intent}. Bağlam içinde değerlendir.`
    : "";

  const messages = [
    {
      role: "system" as const,
      content: INTENT_PROMPT + `\n\nDil: ${opts.locale}. ${contextHint}`,
    },
    { role: "user" as const, content: userMessage },
  ];

  const result = await openrouter.chat({
    model: MODELS.cheap_intent,
    messages,
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 300,
  });

  let parsed: { intent?: string; confidence?: number; reasoning?: string; extractedEntities?: Record<string, unknown> } = {};
  try {
    const codeBlock = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : result.content;
    parsed = JSON.parse(raw.trim());
  } catch {
    parsed = { intent: "general_chat", confidence: 0.3 };
  }

  const validIntents: Intent[] = [
    "create_listing",
    "search_vehicles",
    "view_vehicle",
    "negotiate_price",
    "rent_vehicle",
    "translate_content",
    "check_damage",
    "recommend_similar",
    "fraud_check",
    "support_help",
    "general_chat",
  ];

  const intent: Intent = validIntents.includes(parsed.intent as Intent)
    ? (parsed.intent as Intent)
    : "general_chat";

  return {
    intent,
    confidence: clamp01(parsed.confidence ?? 0.5),
    reasoning: parsed.reasoning ?? "",
    entities: parsed.extractedEntities ?? {},
    model: result.model,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    tokens: result.usage.totalTokens,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}