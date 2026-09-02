// Admin Routes — agent performance, cost tracking, A/B testing
// Faz 12: Observability

import type { FastifyInstance } from "fastify";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

interface AgentMetrics {
  agent: string;
  totalCalls: number;
  totalCost: number;
  avgCost: number;
  avgDuration: number;
  successRate: number;
  avgConfidence: number;
}

interface DailyCost {
  day: string;
  costUsd: number;
  calls: number;
}

interface OrchestratorStats {
  totalThreads: number;
  activeThreads: number;
  totalCost7d: number;
  totalCalls7d: number;
  agents: AgentMetrics[];
  dailyCosts: DailyCost[];
  costByModel: Array<{ model: string; calls: number; cost: number }>;
  costByIntent: Array<{ intent: string; calls: number; cost: number }>;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/orchestrator/stats
   * Son 7 günlük orchestrator istatistikleri
   */
  app.get("/admin/orchestrator/stats", async (_req, reply) => {
    // Thread istatistikleri
    const threadsRes = await db.query<{ total: number; active: number }>(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status = 'active') as active
       FROM public.agent_threads`
    );
    const threads = threadsRes.rows[0];

    // Agent metrics
    const agentsRes = await db.query<{
      agent: string;
      total_calls: string;
      total_cost: number;
      avg_cost: number;
      avg_duration: number;
      success_count: string;
      avg_confidence: number;
    }>(
      `SELECT agent,
              COUNT(*) as total_calls,
              SUM(cost_usd) as total_cost,
              AVG(cost_usd) as avg_cost,
              AVG(duration_ms) as avg_duration,
              COUNT(*) FILTER (WHERE success) as success_count,
              AVG(confidence) as avg_confidence
       FROM public.agent_jobs
       WHERE created_at > now() - interval '7 days'
       GROUP BY agent
       ORDER BY total_calls DESC`
    );

    // Daily cost
    const dailyRes = await db.query<{ day: string; cost: number; calls: string }>(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as day,
              SUM(cost_usd) as cost,
              COUNT(*) as calls
       FROM public.agent_jobs
       WHERE created_at > now() - interval '7 days'
       GROUP BY day
       ORDER BY day`
    );

    // By model
    const modelRes = await db.query<{ model: string; calls: string; cost: number }>(
      `SELECT model,
              COUNT(*) as calls,
              SUM(cost_usd) as cost
       FROM public.agent_jobs
       WHERE created_at > now() - interval '7 days'
         AND model IS NOT NULL
       GROUP BY model
       ORDER BY cost DESC
       LIMIT 10`
    );

    // By intent
    const intentRes = await db.query<{ intent: string; calls: string; cost: number }>(
      `SELECT intent,
              COUNT(*) as calls,
              SUM(cost_usd) as cost
       FROM public.agent_jobs
       WHERE created_at > now() - interval '7 days'
         AND intent IS NOT NULL
       GROUP BY intent
       ORDER BY cost DESC`
    );

    const stats: OrchestratorStats = {
      totalThreads: Number(threads?.total ?? 0),
      activeThreads: Number(threads?.active ?? 0),
      totalCost7d: agentsRes.rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0),
      totalCalls7d: agentsRes.rows.reduce((s, r) => s + Number(r.total_calls), 0),
      agents: agentsRes.rows.map((r) => {
        const calls = Number(r.total_calls);
        const success = Number(r.success_count);
        return {
          agent: r.agent,
          totalCalls: calls,
          totalCost: Number(r.total_cost ?? 0),
          avgCost: Number(r.avg_cost ?? 0),
          avgDuration: Number(r.avg_duration ?? 0),
          successRate: calls > 0 ? success / calls : 0,
          avgConfidence: Number(r.avg_confidence ?? 0),
        };
      }),
      dailyCosts: dailyRes.rows.map((r) => ({
        day: r.day,
        costUsd: Number(r.cost ?? 0),
        calls: Number(r.calls),
      })),
      costByModel: modelRes.rows.map((r) => ({
        model: r.model,
        calls: Number(r.calls),
        cost: Number(r.cost ?? 0),
      })),
      costByIntent: intentRes.rows.map((r) => ({
        intent: r.intent,
        calls: Number(r.calls),
        cost: Number(r.cost ?? 0),
      })),
    };

    return reply.send(stats);
  });

  /**
   * GET /admin/orchestrator/recent?limit=50
   * Son agent call'ları (debug için)
   */
  app.get<{ Querystring: { limit?: string } }>("/admin/orchestrator/recent", async (req, reply) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 500);

    const res = await db.query<{
      id: string;
      user_id: string | null;
      thread_id: string | null;
      agent: string;
      intent: string | null;
      model: string | null;
      tier: string | null;
      cost_usd: number;
      duration_ms: number;
      success: boolean;
      error_message: string | null;
      confidence: number | null;
      created_at: Date;
    }>(
      `SELECT id, user_id, thread_id, agent, intent, model, tier,
              cost_usd, duration_ms, success, error_message, confidence, created_at
       FROM public.agent_jobs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return reply.send({ calls: res.rows });
  });

  /**
   * GET /admin/orchestrator/cost-trend?days=30
   * Günlük AI maliyet trendi
   */
  app.get<{ Querystring: { days?: string } }>("/admin/orchestrator/cost-trend", async (req, reply) => {
    const days = Math.min(Number(req.query.days ?? 30), 90);
    const res = await db.query<{ day: string; cost: number; calls: string; tokens: number }>(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as day,
              SUM(cost_usd) as cost,
              COUNT(*) as calls,
              SUM(prompt_tokens + completion_tokens) as tokens
       FROM public.agent_jobs
       WHERE created_at > now() - ($1 || ' days')::interval
       GROUP BY day
       ORDER BY day`,
      [String(days)],
    );

    return reply.send({
      days,
      data: res.rows.map((r) => ({
        day: r.day,
        costUsd: Number(r.cost ?? 0),
        calls: Number(r.calls),
        tokens: Number(r.tokens ?? 0),
      })),
    });
  });

  /**
   * POST /admin/orchestrator/cache/clear
   * Redis cache temizleme (debug)
   */
  app.post("/admin/orchestrator/cache/clear", async (req, reply) => {
    const body = req.body as { pattern?: string } | null;
    const pattern = body?.pattern ?? "thread:*";
    const keys = await redis.client.keys(pattern);
    if (keys.length > 0) await redis.client.del(keys);
    return reply.send({ cleared: keys.length, pattern });
  });
}