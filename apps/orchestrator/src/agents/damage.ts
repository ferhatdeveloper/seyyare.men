// Damage Detection Agent — multi-photo hasar analizi
// Multi-layer pipeline: vision → severity judge → cost research

import { openrouter, MODELS } from "../openrouter.js";

const DAMAGE_PROMPT = `Sen bir otomotiv eksperi olarak araç fotoğraflarındaki hasarları tespit ediyorsun.

Sadece JSON döndür:
{
  "damages": [
    {
      "part": "<parça — İngilizce: front_bumper, driver_door, hood, rear_quarter_panel, vb.>",
      "severity": "minor|moderate|severe",
      "type": "scratch|dent|rust|crack|paint_damage|other",
      "confidence": <0.0 to 1.0>,
      "description": "<kısa Türkçe açıklama>"
    }
  ],
  "overallScore": <0-10, 10=hasarsız>,
  "estimatedRepairCost": {"min": <USD>, "max": <USD>, "currency": "USD"},
  "recommendation": "excellent|good|fair|poor",
  "notes": "<genel değerlendirme, 2-3 cümle Türkçe>"
}

Kurallar:
- Sadece net gördüğün hasarları raporla
- Confidence < 0.5 olan tespitleri dahil etme
- overallScore: hasarsız=10, küçük çizikler=8-9, göze batan=4-6, ciddi yapısal=0-3
- Onarım maliyetini piyasa ortalamalarına göre ver`;

export interface DamageItem {
  part: string;
  severity: "minor" | "moderate" | "severe";
  type: "scratch" | "dent" | "rust" | "crack" | "paint_damage" | "other";
  confidence: number;
  description: string;
}

export interface DamageResult {
  damages: DamageItem[];
  overallScore: number;
  estimatedRepairCost: { min: number; max: number; currency: string };
  recommendation: "excellent" | "good" | "fair" | "poor";
  notes: string;
  humanInLoopRequired: boolean;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function detectDamage(images: string[]): Promise<DamageResult> {
  if (images.length < 2) throw new Error("min_2_images_required");
  if (images.length > 12) throw new Error("too_many_images");

  const content = [
    { type: "text" as const, text: DAMAGE_PROMPT },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    })),
  ];

  const result = await openrouter.chat({
    model: MODELS.premium_damage,
    messages: [{ role: "user" as const, content }],
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 1500,
  });

  let parsed: Partial<DamageResult> & { damages?: unknown; estimatedRepairCost?: unknown } = {};
  try {
    const codeBlock = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : result.content;
    parsed = JSON.parse(raw.trim());
  } catch {
    parsed = {};
  }

  const damages = Array.isArray(parsed.damages) ? (parsed.damages as DamageItem[]) : [];
  const hilRequired = damages.some((d) => d.confidence < 0.65);

  return {
    damages,
    overallScore: clamp010(parsed.overallScore ?? 5),
    estimatedRepairCost: (parsed.estimatedRepairCost as DamageResult["estimatedRepairCost"]) ?? { min: 0, max: 0, currency: "USD" },
    recommendation: parsed.recommendation ?? "good",
    notes: parsed.notes ?? "",
    humanInLoopRequired: hilRequired,
    model: result.model,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    tokens: result.usage.totalTokens,
  };
}

function clamp010(n: number): number {
  return Math.max(0, Math.min(10, n));
}