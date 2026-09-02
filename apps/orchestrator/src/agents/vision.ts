// Vision Agent — görselden araç tanıma
// OpenRouter Agent SDK ile tool calling

import { z } from "zod";
import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

const RECOGNITION_PROMPT = `Sen bir otomotiv görsel tanıma uzmanısın. Araç fotoğraf(lar)ını analiz et.

Sadece JSON döndür:
{
  "make": "<marka — örn. Toyota, BMW, Mercedes-Benz (İngilizce)>",
  "makeConfidence": <0.0 to 1.0>,
  "model": "<model adı — örn. Corolla, X5, C-Class>",
  "modelConfidence": <0.0 to 1.0>,
  "year": <tahmini yıl integer, veya null>,
  "yearConfidence": <0.0 to 1.0>,
  "bodyType": "<sedan|suv|hatchback|coupe|convertible|wagon|van|pickup|truck|motorcycle|null>",
  "color": "<renk İngilizce veya null>",
  "overallConfidence": <0.0 to 1.0 — genel güvenin>,
  "alternativeInterpretations": [{"make": "...", "model": "...", "year": null}, ...],
  "notes": "<gözlemler>"
}

Kurallar:
- Net göremediğinde tahmin etme, confidence < 0.5 yap
- Yıl tahmininden emin değilsen null bırak
- 3'ten fazla alternatif verme`;

export interface VisionResult {
  make: string;
  makeConfidence: number;
  model: string;
  modelConfidence: number;
  year: number | null;
  bodyType: string | null;
  color: string | null;
  overallConfidence: number;
  alternatives: Array<{ make: string; model: string; year: number | null }>;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function recognizeVehicle(images: string[]): Promise<VisionResult> {
  if (images.length === 0) throw new Error("no_images");
  if (images.length > 8) throw new Error("too_many_images");

  const content: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string; detail?: "auto" | "low" | "high" } }> = [
    { type: "text", text: RECOGNITION_PROMPT },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    })),
  ];

  const result = await openrouter.chat({
    model: MODELS.cheap_vision,
    messages: [{ role: "user", content }],
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 800,
  });

  let parsed: Partial<VisionResult> & { alternatives?: unknown } = {};
  try {
    const codeBlock = result.content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = codeBlock ? codeBlock[1] : result.content;
    parsed = JSON.parse(raw.trim());
  } catch {
    parsed = {};
  }

  // DB'den marka eşle (form için make_id lazım)
  let makeId: number | null = null;
  if (parsed.make) {
    const brand = await db.query<{ id: number }>(
      `SELECT id FROM public.brands
       WHERE name->>'en' ILIKE $1 OR name->>'tr' ILIKE $1
       LIMIT 1`,
      [parsed.make],
    );
    makeId = brand.rows[0]?.id ?? null;
  }

  return {
    make: parsed.make ?? "",
    makeConfidence: parsed.makeConfidence ?? 0,
    model: parsed.model ?? "",
    modelConfidence: parsed.modelConfidence ?? 0,
    year: parsed.year ?? null,
    bodyType: parsed.bodyType ?? null,
    color: parsed.color ?? null,
    overallConfidence: parsed.overallConfidence ?? 0,
    alternatives: Array.isArray(parsed.alternatives) ? (parsed.alternatives as VisionResult["alternatives"]) : [],
    model: result.model,
    costUsd: result.costUsd,
    durationMs: result.durationMs,
    tokens: result.usage.totalTokens,
  };
}