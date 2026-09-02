// Support Agent — kullanıcı destek, hesap problemleri, triyaj
// Triage (Haiku) → Specialist (Sonnet) escalation

import { openrouter, MODELS } from "../openrouter.js";

export interface SupportInput {
  message: string;
  locale: string;
  userId?: string | null;
  context?: {
    screen?: string;
    recentAction?: string;
    errorMessage?: string;
  };
}

export interface SupportResult {
  reply: string;
  intent: "account" | "billing" | "technical" | "content" | "general" | "escalate";
  confidence: number;
  needsHuman: boolean;
  relatedDocs: string[];
  suggestedActions: string[];
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

const TRIAGE_PROMPT = `Sen bir kullanıcı destek triyaj agent'ısın. Mesajı kategorize et:

INTENTS:
- account: hesap, giriş, şifre, profil
- billing: ödeme, fatura, iade
- technical: bug, hata, performans
- content: ilan, fotoğraf, içerik moderasyonu
- general: genel sorular
- escalate: acil / geri ödeme talebi / hesap silme gibi insan müdahalesi gerekli

Sadece JSON:
{
  "intent": "<>",
  "confidence": <0.0-1.0>,
  "needsHuman": <boolean — escalate gerekli mi?>
}`;

export async function handleSupport(input: SupportInput): Promise<SupportResult> {
  // 1. Triage (Haiku)
  const triage = await openrouter.chat({
    model: MODELS.cheap_triage,
    messages: [
      { role: "system", content: TRIAGE_PROMPT },
      { role: "user", content: input.message },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 200,
  });

  let triageParsed: { intent?: string; confidence?: number; needsHuman?: boolean } = {};
  try {
    const codeBlock = triage.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : triage.content;
    triageParsed = JSON.parse(raw.trim());
  } catch {
    triageParsed = { intent: "general", confidence: 0.5, needsHuman: false };
  }

  const validIntents: SupportResult["intent"][] = ["account", "billing", "technical", "content", "general", "escalate"];
  const intent: SupportResult["intent"] = validIntents.includes(triageParsed.intent as SupportResult["intent"])
    ? (triageParsed.intent as SupportResult["intent"])
    : "general";

  // 2. Reply generation (Sonnet)
  const replyPrompt = `Sen Seyyare.men'in müşteri destek asistanısın. Kullanıcıya kısa, net ve yardımcı bir yanıt ver.

KATEGORİ: ${intent}
KULLANICI MESAJI: "${input.message}"
${input.context?.screen ? `EKRAN: ${input.context.screen}` : ""}
${input.context?.errorMessage ? `HATA: ${input.context.errorMessage}` : ""}
${input.context?.recentAction ? `SON İŞLEM: ${input.context.recentAction}` : ""}

Kurallar:
- Dil: ${input.locale} (Kürtçe ise Badini/Sorani scriptine dikkat)
- Maks 4-5 cümle
- Çözüm öner varsa adım adım yaz
- Eğer bilmediğin bir şeyse "Bu konuda sizi bir uzmana yönlendireyim" de
- Pazarlama dili kullanma
- "AI" olduğunu belli etme, "destek ekibi" tonu kullan`;

  const reply = await openrouter.chat({
    model: MODELS.premium_support,
    messages: [{ role: "user", content: replyPrompt }],
    temperature: 0.4,
    maxTokens: 400,
  });

  return {
    reply: reply.content.trim(),
    intent,
    confidence: clamp01(triageParsed.confidence ?? 0.5),
    needsHuman: triageParsed.needsHuman ?? intent === "escalate",
    relatedDocs: [],
    suggestedActions: [],
    model: reply.model,
    costUsd: triage.costUsd + reply.costUsd,
    durationMs: triage.durationMs + reply.durationMs,
    tokens: triage.usage.totalTokens + reply.usage.totalTokens,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}