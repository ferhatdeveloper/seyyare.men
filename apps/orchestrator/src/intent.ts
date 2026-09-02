// Gelişmiş Intent Classifier
// - Multi-intent detection (bir mesajda birden fazla niyet)
// - Context-aware (thread history'den niyet çıkarımı)
// - Few-shot prompting
// - Confidence-gated secondary intent routing

import { openrouter, MODELS } from "./openrouter.js";
import type { ThreadState } from "./checkpointer.js";

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
  | "compare_vehicles"
  | "modify_listing"
  | "general_chat";

const ALL_INTENTS: Intent[] = [
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
  "compare_vehicles",
  "modify_listing",
  "general_chat",
];

const FEW_SHOT_EXAMPLES = `
ÖRNEKLER:

Kullanıcı: "BMW X5 2020 model İstanbul'da ne kadar?"
→ Primary: search_vehicles, Secondary: [], Entities: {make:"BMW", model:"X5", year:2020, location:"Istanbul"}

Kullanıcı: "Bu arabanın fotoğrafını çektim, ilan vermek istiyorum"
→ Primary: create_listing, Secondary: [check_damage], Entities: {hasImage:true}

Kullanıcı: "Şu ilana benzer başka araçlar göster"
→ Primary: recommend_similar, Secondary: [], Entities: {vehicleId:"context"}

Kullanıcı: "Bu aracı kiralayabilir miyim? Hafta sonu için"
→ Primary: rent_vehicle, Secondary: [], Entities: {period:"weekend"}

Kullanıcı: "Satıcı ile 25000'e anlaştık, sözleşme hazırla"
→ Primary: negotiate_price, Secondary: [], Entities: {agreedAmount:25000, agreed:true}

Kullanıcı: "İlan başlığımı 6 dile çevir"
→ Primary: translate_content, Secondary: [], Entities: {targetLanguages:6}

Kullanıcı: "Bu ilan gerçek mi? Şüpheli duruyor"
→ Primary: fraud_check, Secondary: [], Entities: {vehicleId:"context", suspicious:true}

Kullanıcı: "Aynı anda hem ilan vermek hem de benzer ilanları görmek istiyorum"
→ Primary: create_listing, Secondary: [recommend_similar], Entities: {}

Kullanıcı: "Şifremi unuttum"
→ Primary: support_help, Secondary: [], Entities: {topic:"password_reset"}
`;

const INTENT_PROMPT = `Sen çok dilli bir araç platformu için gelişmiş intent classifier'sın. Kullanıcının mesajını analiz et ve PRIMARY + SECONDARY intent'leri tespit et. Bağlam bilgisini de kullan.

INTENTS:
- create_listing: kullanıcı araç satmak/ilan vermek istiyor
- search_vehicles: kullanıcı araç aramak istiyor (filtre/spec araması)
- view_vehicle: kullanıcı belirli bir ilana bakıyor
- negotiate_price: kullanıcı fiyat pazarlığı yapıyor
- rent_vehicle: kullanıcı araç kiralamak istiyor
- translate_content: kullanıcı çeviri istiyor (genellikle 1-to-N dil çevirisi)
- check_damage: kullanıcı hasar tespiti istiyor
- recommend_similar: kullanıcı benzer ilanlar istiyor
- fraud_check: kullanıcı ilan doğrulama/şüpheli durum bildirimi
- support_help: kullanıcı yardım/destek istiyor (hesap, ödeme, bug)
- compare_vehicles: kullanıcı 2+ aracı yan yana karşılaştırmak istiyor
- modify_listing: kullanıcı mevcut ilanını düzenlemek istiyor
- general_chat: diğer her şey (selamlama, genel soru)

${FEW_SHOT_EXAMPLES}

Sadece JSON döndür:
{
  "primary": {"intent": "<yukarıdakilerden biri>", "confidence": <0.0-1.0>},
  "secondary": [{"intent": "<>", "confidence": <0.0-1.0>}, ...],
  "reasoning": "<TR 1 cümle>",
  "contextUsed": "<thread'in hangi bilgisini kullandın, yoksa 'yok'>",
  "extractedEntities": {
    "make": "...",
    "model": "...",
    "year": ...,
    "price": ...,
    "location": "...",
    "vehicleId": "...",
    "userId": "...",
    "agreedAmount": ...,
    "hasImage": true/false,
    "period": "weekend|week|month|...",
    "topic": "..."
  }
}

Kurallar:
- PRIMARY her zaman TEK bir niyet olmalı (en yüksek confidence)
- SECONDARY boş olabilir veya 1-2 niyet içerebilir (confidence > 0.6 olanlar)
- Aynı anda birden fazla işlem istiyorsa multi-intent kullan
- Eğer kullanıcı belirsizse general_chat kullan
- Dil: locale'e göre yanıt ver
- THREAD CONTEXT: önceki mesajlar önemli, "aynı", "o", "şu" gibi referansları çöz`;

export interface IntentResult {
  primary: { intent: Intent; confidence: number };
  secondary: Array<{ intent: Intent; confidence: number }>;
  reasoning: string;
  contextUsed: string;
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

  // Context: son 4 mesajı al
  const recentMessages = opts.thread.messages.slice(-4);
  const contextBlock = recentMessages.length > 0
    ? `\n\nTHREAD GEÇMİŞİ:\n${recentMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}`
    : "";

  // Önceki intent'i de context olarak ekle
  const intentHistory = opts.thread.intent
    ? `\nÖnceki niyet: ${opts.thread.intent}`
    : "";

  const messages = [
    {
      role: "system" as const,
      content: INTENT_PROMPT + `\n\nDil: ${opts.locale}. ${intentHistory}.`,
    },
    { role: "user" as const, content: userMessage + contextBlock },
  ];

  const result = await openrouter.chat({
    model: MODELS.cheap_intent,
    messages,
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 500,
  });

  let parsed: {
    primary?: { intent?: string; confidence?: number };
    secondary?: Array<{ intent?: string; confidence?: number }>;
    reasoning?: string;
    contextUsed?: string;
    extractedEntities?: Record<string, unknown>;
  } = {};
  try {
    const codeBlock = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : result.content;
    parsed = JSON.parse(raw.trim());
  } catch {
    parsed = { primary: { intent: "general_chat", confidence: 0.3 } };
  }

  const primaryIntent = sanitizeIntent(parsed.primary?.intent);
  const secondaryIntents = (parsed.secondary ?? [])
    .map((s) => ({
      intent: sanitizeIntent(s.intent),
      confidence: clamp01(s.confidence ?? 0.5),
    }))
    .filter((s) => s.intent !== primaryIntent && s.confidence >= 0.5)
    .slice(0, 3);

  return {
    primary: {
      intent: primaryIntent,
      confidence: clamp01(parsed.primary?.confidence ?? 0.5),
    },
    secondary: secondaryIntents,
    reasoning: parsed.reasoning ?? "",
    contextUsed: parsed.contextUsed ?? "",
    entities: parsed.extractedEntities ?? {},
    model: result.model,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    tokens: result.usage.totalTokens,
  };
}

function sanitizeIntent(intent: string | undefined): Intent {
  if (!intent) return "general_chat";
  return ALL_INTENTS.includes(intent as Intent) ? (intent as Intent) : "general_chat";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export { ALL_INTENTS };
export type { Intent as IntentType };