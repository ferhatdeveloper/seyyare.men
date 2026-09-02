// Per-agent Performance Tracking + A/B Test Framework
// Her agent call'ı için model + tier + variant loglanır
// Admin dashboard'da performans karşılaştırması görselleştirilebilir

import { db } from "./lib/db.js";
import { audit } from "./audit.js";

export interface ABTestConfig {
  experiment: string;
  variants: Record<string, { model: string; weight: number }>;
  stickyBy?: "user" | "thread";
}

export interface VariantAssignment {
  experiment: string;
  variant: string;
  model: string;
}

/**
 * A/B test variant assignment (sticky by user/thread)
 * Production'da deterministik hash, aynı kullanıcı hep aynı variant'ı görür
 */
export async function assignVariant(opts: {
  experiment: string;
  threadId?: string;
  userId?: string;
  config: ABTestConfig;
}): Promise<VariantAssignment> {
  const stickyKey = opts.config.stickyBy === "user" ? opts.userId : opts.threadId;
  if (!stickyKey) {
    // Random fallback
    return pickRandomVariant(opts.experiment, opts.config);
  }

  // Redis'te sticky assignment kontrol et
  const redis = (await import("./lib/redis.js")).redis;
  const cacheKey = `ab:${opts.experiment}:${stickyKey}`;
  const cached = await redis.client.get(cacheKey);
  if (cached) {
    const variant = cached;
    const model = opts.config.variants[variant]?.model ?? Object.values(opts.config.variants)[0].model;
    return { experiment: opts.experiment, variant, model };
  }

  // Deterministik hash → variant index
  const variant = pickRandomVariant(opts.experiment, opts.config);
  await redis.client.set(cacheKey, variant.variant, "EX", 60 * 60 * 24 * 30); // 30 gün
  return variant;
}

function pickRandomVariant(experiment: string, config: ABTestConfig): VariantAssignment {
  const entries = Object.entries(config.variants);
  const totalWeight = entries.reduce((s, [, v]) => s + v.weight, 0);

  // Basit hash → 0..totalWeight
  let hash = 0;
  for (let i = 0; i < experiment.length; i++) {
    hash = (hash << 5) - hash + experiment.charCodeAt(i);
    hash |= 0;
  }
  const random = Math.abs(hash) % totalWeight;

  let cumulative = 0;
  for (const [variantName, variantConfig] of entries) {
    cumulative += variantConfig.weight;
    if (random < cumulative) {
      return {
        experiment,
        variant: variantName,
        model: variantConfig.model,
      };
    }
  }

  const [firstName, firstConfig] = entries[0];
  return { experiment, variant: firstName, model: firstConfig.model };
}

/**
 * Per-agent performance metrics
 */
export interface AgentPerformanceMetrics {
  agent: string;
  totalCalls: number;
  successRate: number;
  avgCost: number;
  avgDuration: number;
  avgConfidence: number;
  costPerSuccess: number;
  // Variant breakdown (A/B test sonuçları)
  variants: Array<{
    variant: string;
    model: string;
    calls: number;
    successRate: number;
    avgCost: number;
  }>;
}

export async function getAgentPerformance(
  agentName: string,
  days: number = 7,
): Promise<AgentPerformanceMetrics | null> {
  const overall = await db.query<{
    total_calls: string;
    success_count: string;
    avg_cost: number;
    avg_duration: number;
    avg_confidence: number;
  }>(
    `SELECT COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE success) as success_count,
            AVG(cost_usd) as avg_cost,
            AVG(duration_ms) as avg_duration,
            AVG(confidence) as avg_confidence
     FROM public.agent_jobs
     WHERE agent = $1
       AND created_at > now() - ($2 || ' days')::interval`,
    [agentName, String(days)],
  );

  const row = overall.rows[0];
  if (!row || Number(row.total_calls) === 0) return null;

  // Variant breakdown (model bazında)
  const variants = await db.query<{
    model: string;
    calls: string;
    success_count: string;
    avg_cost: number;
  }>(
    `SELECT model,
            COUNT(*) as calls,
            COUNT(*) FILTER (WHERE success) as success_count,
            AVG(cost_usd) as avg_cost
     FROM public.agent_jobs
     WHERE agent = $1
       AND model IS NOT NULL
       AND created_at > now() - ($2 || ' days')::interval
     GROUP BY model
     ORDER BY calls DESC
     LIMIT 10`,
    [agentName, String(days)],
  );

  const totalCalls = Number(row.total_calls);
  const successCount = Number(row.success_count);

  return {
    agent: agentName,
    totalCalls,
    successRate: totalCalls > 0 ? successCount / totalCalls : 0,
    avgCost: Number(row.avg_cost ?? 0),
    avgDuration: Number(row.avg_duration ?? 0),
    avgConfidence: Number(row.avg_confidence ?? 0),
    costPerSuccess: successCount > 0 ? Number(row.avg_cost ?? 0) * totalCalls / successCount : 0,
    variants: variants.rows.map((v) => ({
      variant: v.model,
      model: v.model,
      calls: Number(v.calls),
      successRate: Number(v.calls) > 0 ? Number(v.success_count) / Number(v.calls) : 0,
      avgCost: Number(v.avg_cost ?? 0),
    })),
  };
}

/**
 * Cost-budget aware agent selection
 * Thread başına max cost budget belirle, aşılırsa escalation yap
 */
export interface BudgetConfig {
  threadId: string;
  maxCostUsd: number;
  softLimitPct: number; // 0.8 = %80'inde soft warning
}

export const budget = {
  async getStatus(config: BudgetConfig): Promise<{
    spent: number;
    budget: number;
    pctUsed: number;
    softLimitHit: boolean;
    hardLimitHit: boolean;
    remaining: number;
  }> {
    const thread = await db.query<{ total_cost_usd: string | number }>(
      `SELECT total_cost_usd FROM public.agent_threads WHERE id = $1`,
      [config.threadId],
    );
    const spent = Number(thread.rows[0]?.total_cost_usd ?? 0);
    const pctUsed = config.maxCostUsd > 0 ? spent / config.maxCostUsd : 0;

    return {
      spent,
      budget: config.maxCostUsd,
      pctUsed,
      softLimitHit: pctUsed >= config.softLimitPct,
      hardLimitHit: pctUsed >= 1,
      remaining: Math.max(0, config.maxCostUsd - spent),
    };
  },
};

/**
 * Performance comparison — hangi model daha iyi?
 */
export async function compareModels(opts: {
  agent: string;
  metric: "cost" | "duration" | "success_rate";
  days: number;
}): Promise<Array<{ model: string; value: number; calls: number }>> {
  const res = await db.query<{ model: string; value: number; calls: string }>(
    `SELECT model,
            $2 as value,
            COUNT(*) as calls
     FROM public.agent_jobs
     WHERE agent = $1
       AND model IS NOT NULL
       AND created_at > now() - ($3 || ' days')::interval
     GROUP BY model
     ORDER BY calls DESC`,
    [opts.agent, opts.metric, String(opts.days)],
  );
  return res.rows.map((r) => ({
    model: r.model,
    value: Number(r.value ?? 0),
    calls: Number(r.calls),
  }));
}