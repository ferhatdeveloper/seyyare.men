// A/B Testing Routes — tier1 vs tier2 kalite karşılaştırması için HTTP endpoints
// Admin dashboard'ında A/B test sonuçları gösterilir

import type { FastifyInstance } from "fastify";
import { db } from "../lib/db.js";

interface ABTestConfig {
  experiment: string;
  variants: Record<string, { model: string; weight: number }>;
  stickyBy: "user" | "thread";
  description?: string;
  status: "draft" | "active" | "completed";
  startedAt?: number;
}

interface VariantResult {
  experiment: string;
  variant: string;
  model: string;
  totalCalls: number;
  successfulCalls: number;
  avgCostUsd: number;
  avgDurationMs: number;
  avgConfidence: number;
  successRate: number;
  qualityScore: number; // 0-1, composite metric
}

export async function abTestingRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/experiments
   * Aktif A/B testlerini listele
   */
  app.get("/admin/experiments", async (_req, reply) => {
    // Redis'te aktif testler
    const experiments = [
      {
        id: "pricing_tier_comparison",
        description: "Haiku vs Sonnet — pricing agent kalite testi",
        status: "active",
        variants: {
          control: { model: "anthropic/claude-3-5-haiku", weight: 50 },
          treatment: { model: "anthropic/claude-3.5-sonnet", weight: 50 },
        },
        stickyBy: "user",
        startedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      },
      {
        id: "vision_tier_comparison",
        description: "Gemini Flash vs GPT-4o-mini — vision kalite",
        status: "active",
        variants: {
          control: { model: "google/gemini-2.5-flash", weight: 50 },
          treatment: { model: "openai/gpt-4o-mini", weight: 50 },
        },
        stickyBy: "user",
        startedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      },
    ];

    return reply.send({ experiments });
  });

  /**
   * GET /admin/experiments/:id/results
   * Belirli bir A/B testinin sonuçları
   */
  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/admin/experiments/:id/results",
    async (req, reply) => {
      const days = Number(req.query.days ?? 14);

      // DB'den agent bazında metrikleri çek
      const res = await db.query<{
        model: string;
        calls: string;
        success_count: string;
        avg_cost: number;
        avg_duration: number;
        avg_confidence: number;
      }>(
        `SELECT
           model,
           COUNT(*) as calls,
           COUNT(*) FILTER (WHERE success) as success_count,
           AVG(cost_usd) as avg_cost,
           AVG(duration_ms) as avg_duration,
           AVG(confidence) as avg_confidence
         FROM public.agent_jobs
         WHERE created_at > now() - ($1 || ' days')::interval
           AND model IS NOT NULL
           AND success IS NOT NULL
         GROUP BY model
         ORDER BY calls DESC`,
        [String(days)],
      );

      const results: VariantResult[] = res.rows.map((r) => {
        const calls = Number(r.calls);
        const success = Number(r.success_count);
        const successRate = calls > 0 ? success / calls : 0;
        const confidence = Number(r.avg_confidence ?? 0);

        // Quality score: başarı oranı + güven + hız dengesi
        const speedScore = 1 - Math.min(1, Number(r.avg_duration) / 5000);
        const qualityScore = successRate * 0.5 + confidence * 0.3 + speedScore * 0.2;

        return {
          experiment: req.params.id,
          variant: r.model,
          model: r.model,
          totalCalls: calls,
          successfulCalls: success,
          avgCostUsd: Number(r.avg_cost ?? 0),
          avgDurationMs: Number(r.avg_duration ?? 0),
          avgConfidence: confidence,
          successRate,
          qualityScore,
        };
      });

      // Kalite-karşılaştırma istatistikleri
      const total = results.reduce(
        (s, r) => ({
          calls: s.calls + r.totalCalls,
          cost: s.cost + r.avgCostUsd * r.totalCalls,
        }),
        { calls: 0, cost: 0 },
      );

      return reply.send({
        experiment: req.params.id,
        days,
        totalCalls: total.calls,
        totalCost: total.cost,
        variants: results,
        recommendation: computeRecommendation(results),
      });
    },
  );

  /**
   * POST /admin/experiments/:id/assign
   * Bir thread/user için variant ata
   */
  app.post<{
    Params: { id: string };
    Body: {
      userId?: string;
      threadId?: string;
      config: ABTestConfig;
    };
  }>("/admin/experiments/:id/assign", async (req, reply) => {
    const { assignVariant } = await import("../ab-testing.js");
    const result = await assignVariant({
      experiment: req.params.id,
      userId: req.body.userId,
      threadId: req.body.threadId,
      config: req.body.config as any,
    });
    return reply.send(result);
  });

  /**
   * POST /admin/experiments/:id/conclude
   * A/B testini bitir, kazanan variant'ı kaydet
   */
  app.post<{ Params: { id: string }; Body: { winner: string } }>(
    "/admin/experiments/:id/conclude",
    async (req, reply) => {
      // Production'da: Redis'e kaydet, default model'i güncelle
      const { redis } = await import("../lib/redis.js");
      await redis.set(
        `experiment:${req.params.id}:winner`,
        req.body.winner,
        60 * 60 * 24 * 365,
      );
      return reply.send({
        experiment: req.params.id,
        winner: req.body.winner,
        concludedAt: new Date().toISOString(),
      });
    },
  );

  /**
   * GET /admin/cache/stats
   * Cache hit/miss oranları
   */
  app.get("/admin/cache/stats", async (_req, reply) => {
    const { cache } = await import("../cache.js");
    return reply.send(cache.getStats());
  });

  /**
   * POST /admin/cache/clear
   * Tüm cache'i temizle
   */
  app.post("/admin/cache/clear", async (_req, reply) => {
    const { cache } = await import("../cache.js");
    const cleared = await cache.invalidateByPattern("*");
    return reply.send({ cleared });
  });

  /**
   * GET /admin/langfuse/traces
   * Son 50 trace (Langfuse yoksa Redis'ten fallback)
   */
  app.get("/admin/langfuse/traces", async (_req, reply) => {
    const { langfuse } = await import("../langfuse.js");
    const traces = await langfuse.getRecentTraces(50);
    return reply.send({ traces });
  });

  /**
   * GET /admin/langfuse/traces/:id
   * Belirli bir trace'in event'leri
   */
  app.get<{ Params: { id: string } }>("/admin/langfuse/traces/:id", async (req, reply) => {
    const { langfuse } = await import("../langfuse.js");
    const trace = await langfuse.getTrace(req.params.id);
    if (!trace) return reply.code(404).send({ error: "not_found" });
    return reply.send(trace);
  });
}

/**
 * A/B test sonuçlarından öneri oluştur
 */
function computeRecommendation(results: VariantResult[]): {
  winner: string | null;
  reason: string;
  confidence: number;
} {
  if (results.length === 0) {
    return { winner: null, reason: "Yeterli veri yok", confidence: 0 };
  }

  // En az 30 çağrısı olan variant'ları değerlendir
  const significant = results.filter((r) => r.totalCalls >= 30);
  if (significant.length < 2) {
    return {
      winner: significant[0]?.variant ?? results[0].variant,
      reason: "İstatistiksel anlamlılık için yeterli veri yok (min 30 çağrı/variant gerekli)",
      confidence: 0.3,
    };
  }

  // Quality score'a göre sırala
  const sorted = [...significant].sort((a, b) => b.qualityScore - a.qualityScore);
  const winner = sorted[0];
  const runnerUp = sorted[1];

  // Basit istatistiksel test: %5 fark = anlamlı
  const diff = winner.qualityScore - runnerUp.qualityScore;
  const isSignificant = diff > 0.05;

  return {
    winner: winner.variant,
    reason: isSignificant
      ? `${winner.variant} %${(diff * 100).toFixed(1)} daha iyi quality score (avg confidence ${(winner.avgConfidence * 100).toFixed(0)}%, success rate ${(winner.successRate * 100).toFixed(0)}%)`
      : "Fark istatistiksel olarak anlamlı değil, daha fazla veri gerekli",
    confidence: isSignificant ? 0.8 : 0.4,
  };
}