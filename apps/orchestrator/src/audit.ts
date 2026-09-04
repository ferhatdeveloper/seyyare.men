// Audit logger — her agent call'ı ai_jobs tablosuna + Redis metrics'e + Langfuse'a loglar

import { db } from "./lib/db.js";
import { redis } from "./lib/redis.js";
import { langfuse } from "./langfuse.js";

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
  traceId?: string; // Langfuse trace correlation
  spanId?: string;
}

export const audit = {
  async log(entry: AuditEntry): Promise<void> {
    // 1. Langfuse'a gönder (varsa)
    if (entry.traceId) {
      langfuse.trackGeneration({
        traceId: entry.traceId,
        spanId: entry.spanId,
        name: `${entry.agent}.${entry.intent ?? "call"}`,
        model: entry.model,
        input: { threadId: entry.threadId, agent: entry.agent },
        output: entry.error ? { error: entry.error } : { success: true },
        promptTokens: entry.promptTokens,
        completionTokens: entry.completionTokens,
        costUsd: entry.costUsd,
        durationMs: entry.durationMs,
        metadata: {
          tier: entry.tier,
          intent: entry.intent,
          userId: entry.userId ?? undefined,
          confidence: entry.confidence,
        },
        level: entry.success ? "INFO" : "ERROR",
        error: entry.error,
      });
    }

    // 2. DB'ye yaz (audit trail)
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

    // 3. Redis metrics (per-agent + global, günlük TTL)
    try {
      const today = new Date().toISOString().slice(0, 10);
      const perAgentKey = `metrics:${today}:agent:${entry.agent}`;
      const globalKey = `metrics:${today}:total`;

      await redis.client
        .multi()
        .incrbyfloat(`${perAgentKey}:cost`, entry.costUsd)
        .incr(`${perAgentKey}:calls`)
        .incrby(`${perAgentKey}:tokens`, entry.promptTokens + entry.completionTokens)
        .expire(perAgentKey, 60 * 60 * 24 * 30)
        .incrbyfloat(`${globalKey}:cost`, entry.costUsd)
        .incr(`${globalKey}:calls`)
        .expire(globalKey, 60 * 60 * 24 * 30)
        .exec();
    } catch (err) {
      console.warn("[audit] Redis metrics failed:", err);
    }
  },

  /**
   * Son 7 günlük agent metrics'lerini Redis'ten hızlıca çek
   */
  async recentMetrics(days: number = 7): Promise<{
    byAgent: Record<string, { cost: number; calls: number; tokens: number }>;
    total: { cost: number; calls: number };
  }> {
    const byAgent: Record<string, { cost: number; calls: number; tokens: number }> = {};
    let totalCost = 0;
    let totalCalls = 0;

    try {
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().slice(0, 10);
        const globalKey = `metrics:${dateStr}:total`;

        const costStr = await redis.client.get(`${globalKey}:cost`);
        const callsStr = await redis.client.get(`${globalKey}:calls`);
        const dayCost = Number(costStr ?? 0);
        const dayCalls = Number(callsStr ?? 0);
        totalCost += dayCost;
        totalCalls += dayCalls;
      }
    } catch (err) {
      console.warn("[audit] recentMetrics Redis failed:", err);
    }

    return {
      byAgent,
      total: { cost: totalCost, calls: totalCalls },
    };
  },
};