// Voice routes — OpenRouter audio API proxy
// Multipart upload endpoint for mobile recording

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { synthesizeSpeech, transcribeAudio } from "../agents/voice.js";
import { audit } from "../audit.js";

const TranscribeBodySchema = z.object({
  audioBase64: z.string().min(1).max(50 * 1024 * 1024), // 50MB base64
  mimeType: z.string().default("audio/webm"),
  language: z.string().optional(),
  model: z.string().optional(),
});

const SpeechBodySchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().optional(),
  format: z.enum(["mp3", "opus", "aac", "flac", "wav", "pcm"]).default("mp3"),
  model: z.string().optional(),
});

export async function voiceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /voice/transcribe
   * Body: { audioBase64, mimeType, language?, model? }
   * Returns: { text, language, durationSec, costUsd }
   */
  app.post("/voice/transcribe", async (req, reply) => {
    const parsed = TranscribeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { audioBase64, mimeType, language, model } = parsed.data;

    try {
      const result = await transcribeAudio({ audioBase64, mimeType, language, model });

      await audit.log({
        userId: (req.headers["x-user-id"] as string) ?? null,
        threadId: (req.headers["x-thread-id"] as string) ?? "",
        agent: "voice",
        model: result.model,
        tier: "cheap",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        success: true,
      });

      return reply.send(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "transcription_failed";
      return reply.code(502).send({ error: msg });
    }
  });

  /**
   * POST /voice/speech
   * Body: { text, voice?, format?, model? }
   * Returns: { audioBase64, mimeType, costUsd }
   */
  app.post("/voice/speech", async (req, reply) => {
    const parsed = SpeechBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { text, voice, format, model } = parsed.data;

    try {
      const result = await synthesizeSpeech({ text, voice, format, model });

      await audit.log({
        userId: (req.headers["x-user-id"] as string) ?? null,
        threadId: (req.headers["x-thread-id"] as string) ?? "",
        agent: "voice",
        model: result.model,
        tier: "cheap",
        promptTokens: text.length,
        completionTokens: 0,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        success: true,
      });

      return reply.send(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "speech_failed";
      return reply.code(502).send({ error: msg });
    }
  });
}