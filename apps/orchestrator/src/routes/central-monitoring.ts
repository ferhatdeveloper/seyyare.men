// Central Agent Monitoring Routes
// Admin için tüm worker'ların durumu, plan execution, mesajlaşma logu

import type { FastifyInstance } from "fastify";
import { db } from "../lib/db.js";
import { workerRegistry } from "../worker-registry.js";
import { agentMessageBus } from "../agent-protocol.js";

interface WorkerStatus {
  name: string;
  status: "active" | "paused" | "disabled";
  capabilities: string[];
  recentCalls: number;
  successRate: number;
  avgCost: number;
  avgDurationMs: number;
}

interface PlanExecution {
  planId: string;
  threadId: string;
  primaryIntent: string;
  tasks: Array<{
    id: string;
    worker: string;
    priority: string;
    status: "running" | "completed" | "failed" | "skipped";
    durationMs?: number;
    costUsd?: number;
    error?: string;
  }>;
  totalCostUsd: number;
  totalDurationMs: number;
  startedAt: number;
}

export async function centralMonitoringRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /central/workers
   * Tüm worker'ların durumu + son 24 saat performansı
   */
  app.get("/central/workers", async (_req, reply) => {
    const workers = workerRegistry.list();

    const enriched: WorkerStatus[] = await Promise.all(
      workers.map(async (w) => {
        const res = await db.query<{
          calls: string;
          success_count: string;
          avg_cost: number;
          avg_duration: number;
        }>(
          `SELECT COUNT(*) as calls,
                  COUNT(*) FILTER (WHERE success) as success_count,
                  AVG(cost_usd) as avg_cost,
                  AVG(duration_ms) as avg_duration
           FROM public.agent_jobs
           WHERE agent = $1
             AND created_at > now() - interval '24 hours'`,
          [w.name],
        );

        const row = res.rows[0];
        const calls = Number(row?.calls ?? 0);
        const success = Number(row?.success_count ?? 0);

        return {
          ...w,
          recentCalls: calls,
          successRate: calls > 0 ? success / calls : 0,
          avgCost: Number(row?.avg_cost ?? 0),
          avgDurationMs: Number(row?.avg_duration ?? 0),
        };
      }),
    );

    return reply.send({ workers: enriched });
  });

  /**
   * GET /central/plans/recent?limit=20
   * Son task plan'ları ve sonuçları
   */
  app.get<{ Querystring: { limit?: string } }>("/central/plans/recent", async (req, reply) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);

    const res = await db.query<{
      plan_id: string;
      thread_id: string;
      intent: string;
      total_cost_usd: number;
      task_count: string;
      success_count: string;
      avg_duration: number;
      created_at: Date;
    }>(
      `SELECT
         plan_data->>'planId' as plan_id,
         thread_id,
         intent,
         cost_usd as total_cost_usd,
         1 as task_count,
         1 as success_count,
         duration_ms as avg_duration,
         created_at
       FROM public.agent_jobs
       WHERE agent = 'central:intent'
         AND plan_data ? 'planId'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return reply.send({ plans: res.rows });
  });

  /**
   * GET /central/message-bus/:threadId
   * Belirli bir thread'in agent-to-agent mesajlaşma logu
   */
  app.get<{ Params: { threadId: string } }>("/central/message-bus/:threadId", async (req, reply) => {
    const channel = await agentMessageBus.getChannel(req.params.threadId);
    return reply.send({
      threadId: req.params.threadId,
      messages: channel?.messages ?? [],
      messageCount: channel?.messages.length ?? 0,
    });
  });

  /**
   * GET /central/health
   * Central Agent + tüm worker'ların sağlık durumu
   */
  app.get("/central/health", async (_req, reply) => {
    const workers = workerRegistry.list();
    const activeCount = workers.filter((w) => w.status === "active").length;
    const totalCount = workers.length;

    return reply.send({
      central_agent: "healthy",
      workers: {
        active: activeCount,
        total: totalCount,
        paused: workers.filter((w) => w.status === "paused").length,
        disabled: workers.filter((w) => w.status === "disabled").length,
      },
      capabilities: Array.from(new Set(workers.flatMap((w) => w.capabilities))),
      timestamp: Date.now(),
    });
  });

  /**
   * GET /central/metrics/summary
   * Aggregate metrics — son 24 saat
   */
  app.get("/central/metrics/summary", async (_req, reply) => {
    const res = await db.query<{
      total_calls: string;
      successful: string;
      failed: string;
      total_cost: number;
      avg_duration: number;
    }>(
      `SELECT
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE success) as successful,
         COUNT(*) FILTER (WHERE NOT success) as failed,
         SUM(cost_usd) as total_cost,
         AVG(duration_ms) as avg_duration
       FROM public.agent_jobs
       WHERE created_at > now() - interval '24 hours'`,
    );

    const row = res.rows[0];
    const totalCalls = Number(row?.total_calls ?? 0);
    const successful = Number(row?.successful ?? 0);

    // Per-agent breakdown
    const perAgentRes = await db.query<{
      agent: string;
      calls: string;
      success_count: string;
      avg_cost: number;
    }>(
      `SELECT agent,
              COUNT(*) as calls,
              COUNT(*) FILTER (WHERE success) as success_count,
              AVG(cost_usd) as avg_cost
       FROM public.agent_jobs
       WHERE created_at > now() - interval '24 hours'
       GROUP BY agent
       ORDER BY calls DESC
       LIMIT 20`,
    );

    return reply.send({
      totalCalls,
      successful,
      failed: Number(row?.failed ?? 0),
      successRate: totalCalls > 0 ? successful / totalCalls : 0,
      totalCostUsd: Number(row?.total_cost ?? 0),
      avgDurationMs: Number(row?.avg_duration ?? 0),
      perAgent: perAgentRes.rows.map((r) => ({
        agent: r.agent,
        calls: Number(r.calls),
        successCount: Number(r.success_count),
        avgCostUsd: Number(r.avg_cost),
      })),
    });
  });
}