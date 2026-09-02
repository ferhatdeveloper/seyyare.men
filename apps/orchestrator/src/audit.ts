// Audit logger — her agent call'ı ai_jobs tablosuna + Redis metrics'e loglar
// Langfuse uyumlu format (future integration)

import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";

export interface AuditEntry {
  userId: string | null;
  threadId: string;
  agent: string;
  intent?: string;
  model: string;
  tier: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  durationMs: number;
  success: boolean;
  error?: string;
  confidence?: number;
}

export const audit = {
  async log(entry: AuditEntry): Promise<void> {
    // DB'ye yaz
    try {
      await db.query(
        `INSERT INTO public.agent_jobs (
          user_id, thread_id, agent, intent, model, tier,
          prompt_tokens, completion_tokens, cost_usd, duration_ms,
          success, error_message, confidence, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())`,
        [
          entry.userId,
          entry.threadId,
          entry.agent,
          entry.intent ?? null,
          entry.model,
          entry.tier,
          entry.promptTokens,
          entry.completionTokens,
          entry.costUsd,
          entry.durationMs,
          entry.success,
          entry.error ?? null,
          entry.confidence ?? null,
        ],
      );
    } catch (err) {
      console.error("[audit] DB log failed:", err);
    }

    // Redis metrics
    try {
      const today = new Date().toISOString().slice(0, 10);
      await redis.client.incrbyfloat(`metrics:cost:${${today}:${${today}:agent}:${${today}:entry.agent}}`, entry.costUsd);
      await redis.client.incr(`metrics:calls:${${today}:${${today}:agent}:${${today}:entry.agent}}`);
      await redis.client.incrby(`metrics:tokens:${${today}:${${today}:agent}:${${today}:entry.agent}}`, entry.promptTokens + entry.completionTokens);

      // Global
      await redis.client.incrbyfloat(`metrics:cost:${${today}:total}`, entry.costUsd);
      await redis.client.incr(`metrics:calls:${${today}:total}`);
    } catch (err) {
      console.warn("[audit] Redis metrics failed:", err);
    }
  },
};