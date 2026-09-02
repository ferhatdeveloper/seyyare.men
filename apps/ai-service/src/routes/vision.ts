import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter, type ChatMessage, type ChatContentPart } from "../services/openrouter.js";

const MAX_IMAGES = 8;

interface RecognizedVehicle {
  make: string;
  makeConfidence: number;
  model: string;
  modelConfidence: number;
  year: number | null;
  yearConfidence: number;
  bodyType: string | null;
  color: string | null;
  overallConfidence: number;
  alternativeInterpretations: Array<{
    make: string;
    model: string;
    year: number | null;
  }>;
}

const RECOGNITION_PROMPT = `You are an expert car identification system. Analyze the provided vehicle image(s) carefully.

Respond with ONLY a JSON object in this exact structure:
{
  "make": "<brand name in English — e.g. Toyota, BMW, Mercedes-Benz>",
  "makeConfidence": <0.0 to 1.0>,
  "model": "<model name — e.g. Corolla, X5, C-Class>",
  "modelConfidence": <0.0 to 1.0>,
  "year": <estimated year as integer, or null if uncertain>,
  "yearConfidence": <0.0 to 1.0>,
  "bodyType": "<sedan|suv|hatchback|coupe|convertible|wagon|van|pickup|truck|motorcycle|null>",
  "color": "<color name in English, or null>",
  "overallConfidence": <0.0 to 1.0 — your confidence overall>,
  "alternativeInterpretations": [<up to 3 alternative possibilities>],
  "notes": "<any relevant observations — damage, modifications, special edition>"
}

Important:
- Only identify vehicles you can see clearly. Set confidence < 0.5 if uncertain.
- Never guess if you cannot tell. Prefer null over wrong guesses.
- Body types: sedan, suv, hatchback, coupe, convertible, wagon, van, pickup, truck, motorcycle
- Be conservative with year estimates — only if you're reasonably sure.`;

export async function visionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/recognize
   * multipart/form-data with field "images" (1..8 files)
   * Returns: { make, model, year, confidence, bodyType, color, alternatives }
   */
  app.post("/ai/recognize", async (req, reply) => {
    if (!req.isMultipart()) {
      return reply.code(400).send({ error: "multipart_required" });
    }

    const images: { buffer: Buffer; mime: string }[] = [];
    const parts = req.parts({ limits: { fileSize: 20 * 1024 * 1024 } });

    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "images") {
        if (part.mimetype && !part.mimetype.startsWith("image/")) {
          return reply.code(400).send({ error: "only_images_allowed" });
        }
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk as Buffer);
        images.push({ buffer: Buffer.concat(chunks), mime: part.mimetype });
      }
    }

    if (images.length === 0) {
      return reply.code(400).send({ error: "no_images" });
    }
    if (images.length > MAX_IMAGES) {
      return reply.code(400).send({ error: "too_many_images", max: MAX_IMAGES });
    }

    // Hash for cache key (ilk görsel'in hash'i)
    const crypto = await import("node:crypto");
    const hash = crypto
      .createHash("sha256")
      .update(images[0].buffer)
      .digest("hex");
    const cacheKey = `vision:${hash}`;

    const cached = await cache.get<RecognizedVehicle>(cacheKey);
    if (cached) {
      return reply.send({ ...cached, cached: true });
    }

    const content: ChatContentPart[] = images.map((img) => ({
      type: "image_url",
      image_url: {
        url: `data:${img.mime};base64,${img.buffer.toString("base64")}`,
        detail: "high",
      },
    }));
    content.unshift({ type: "text", text: RECOGNITION_PROMPT });

    const messages: ChatMessage[] = [{ role: "user", content }];

    try {
      const result = await openrouter.chatWithFallback(
        {
          model: "google/gemini-2.5-flash",
          messages,
          responseFormat: { type: "json_object" },
          maxTokens: 1000,
          temperature: 0.1,
        },
        {
          model: "openai/gpt-4o-mini",
          messages,
          responseFormat: { type: "json_object" },
          maxTokens: 1000,
          temperature: 0.1,
        },
      );

      // Parse JSON
      const json = extractJson(result.content) as RecognizedVehicle;
      const recognized: RecognizedVehicle = {
        make: json.make ?? "",
        makeConfidence: clamp01(json.makeConfidence ?? 0),
        model: json.model ?? "",
        modelConfidence: clamp01(json.modelConfidence ?? 0),
        year: json.year ?? null,
        yearConfidence: clamp01(json.yearConfidence ?? 0),
        bodyType: json.bodyType ?? null,
        color: json.color ?? null,
        overallConfidence: clamp01(json.overallConfidence ?? 0),
        alternativeInterpretations: json.alternativeInterpretations ?? [],
      };

      // DB'ye logla
      const userId = (req.headers["x-user-id"] as string) ?? null;
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, payload, result, model_used, cost_usd, duration_ms, completed_at)
         VALUES ($1, 'recognize', 'completed', $2, $3, $4, $5, $6, now())`,
        [
          userId,
          JSON.stringify({ image_count: images.length }),
          JSON.stringify(recognized),
          result.model,
          result.costUsd,
          result.durationMs,
        ],
      );

      await cache.set(cacheKey, recognized, 60 * 60 * 24); // 24 saat

      return reply.send({ ...recognized, cached: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "vision_failed";
      app.log.error({ err: msg }, "vision failed");

      const userId = (req.headers["x-user-id"] as string) ?? null;
      await db.query(
        `INSERT INTO public.ai_jobs (user_id, type, status, error, completed_at)
         VALUES ($1, 'recognize', 'failed', $2, now())`,
        [userId, msg],
      );

      return reply.code(502).send({ error: "vision_failed", message: msg });
    }
  });
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function extractJson(text: string): unknown {
  // Model bazen ```json ... ``` ile sarar
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1] : text;
  return JSON.parse(raw.trim());
}