import type { FastifyInstance } from "fastify";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter, type ChatContentPart, type ChatMessage } from "../services/openrouter.js";

interface DamageItem {
  part: string;
  severity: "minor" | "moderate" | "severe";
  type: "scratch" | "dent" | "rust" | "crack" | "paint_damage" | "other";
  confidence: number;
  description: string;
}

interface DamageReport {
  damages: DamageItem[];
  overallScore: number; // 0-10 (10 = pristine)
  estimatedRepairCost: { min: number; max: number; currency: string };
  recommendation: "excellent" | "good" | "fair" | "poor";
  notes: string;
}

const DAMAGE_PROMPT = `Sen bir otomotiv eksperi olarak araç fotoğraflarındaki hasarları tespit ediyorsun. Çoklu açıdan çekilmiş araç fotoğraflarını analiz et.

Sadece JSON döndür:
{
  "damages": [
    {
      "part": "<parça adı İngilizce — örn. front_bumper, driver_door, hood, rear_quarter_panel>",
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
- Sadece net gördüğün hasarları raporla, tahmin yürütme
- Confidence < 0.5 olan tespitleri dahil etme
- overallScore: hasarsız=10, küçük çizikler=8-9, göze batan hasar=4-6, ciddi yapısal=0-3
- Tahmini onarım maliyetini piyasa ortalamalarına göre ver`;

export async function damageRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/damage-detect
   * multipart/form-data with field "images" (2..12 files)
   * Returns: damage report JSON
   */
  app.post("/ai/damage-detect", async (req, reply) => {
    if (!req.isMultipart()) {
      return reply.code(400).send({ error: "multipart_required" });
    }

    const images: { buffer: Buffer; mime: string }[] = [];
    const parts = req.parts({ limits: { fileSize: 20 * 1024 * 1024 } });

    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "images") {
        if (!part.mimetype?.startsWith("image/")) {
          return reply.code(400).send({ error: "only_images_allowed" });
        }
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk as Buffer);
        images.push({ buffer: Buffer.concat(chunks), mime: part.mimetype });
      }
    }

    if (images.length < 2) {
      return reply.code(400).send({ error: "min_2_images_required" });
    }
    if (images.length > 12) {
      return reply.code(400).send({ error: "too_many_images", max: 12 });
    }

    const crypto = await import("node:crypto");
    const hash = crypto.createHash("sha256");
    for (const img of images) hash.update(img.buffer);
    const cacheKey = `damage:${hash.digest("hex")}`;

    const cached = await cache.get<DamageReport>(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    const content: ChatContentPart[] = images.map((img) => ({
      type: "image_url",
      image_url: {
        url: `data:${img.mime};base64,${img.buffer.toString("base64")}`,
        detail: "high",
      },
    }));
    content.unshift({ type: "text", text: DAMAGE_PROMPT });

    const messages: ChatMessage[] = [{ role: "user", content }];

    try {
      const result = await openrouter.chat({
        model: "anthropic/claude-3.5-sonnet",
        messages,
        responseFormat: { type: "json_object" },
        temperature: 0.1,
        maxTokens: 1500,
      });

      const json = extractJson(result.content) as DamageReport;
      const report: DamageReport = {
        damages: json.damages ?? [],
        overallScore: clamp010(json.overallScore ?? 5),
        estimatedRepairCost: {
          min: json.estimatedRepairCost?.min ?? 0,
          max: json.estimatedRepairCost?.max ?? 0,
          currency: json.estimatedRepairCost?.currency ?? "USD",
        },
        recommendation: json.recommendation ?? "good",
        notes: json.notes ?? "",
      };

      await cache.set(cacheKey, report, 60 * 60 * 24);
      const userId = (req.headers["x-user-id"] as string) ?? null;
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, duration_ms, completed_at)
         VALUES ($1, 'damage_detect', 'completed', $2, $3, $4, $5, $6, now())`,
        [
          userId,
          JSON.stringify({ image_count: images.length }),
          JSON.stringify(report),
          result.model,
          result.costUsd,
          result.durationMs,
        ],
      );

      return reply.send({ ...report, cached: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "damage_failed";
      return reply.code(502).send({ error: msg });
    }
  });
}

function clamp010(n: number): number {
  return Math.max(0, Math.min(10, n));
}

function extractJson(text: string): unknown {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1] : text;
  return JSON.parse(raw.trim());
}