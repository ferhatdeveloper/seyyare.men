import type { FastifyInstance } from "fastify";
import { db } from "../lib/db.js";

interface MarketStats {
  totalVehicles: number;
  totalRentals: number;
  totalUsers: number;
  newListingsLast7Days: number;
  newListingsTrend: number; // %
  avgPriceChange: number; // % son 30 gün
  topMakes: Array<{ make: string; count: number; avgPrice: number }>;
  topCountries: Array<{ country: string; count: number }>;
  aiUsage: {
    totalCalls: number;
    totalCostUsd: number;
    byType: Record<string, { calls: number; costUsd: number }>;
  };
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /ai/admin/analytics
   * Admin dashboard için piyasa + AI kullanım istatistikleri
   */
  app.get("/ai/admin/analytics", async (_req, reply) => {
    // Toplam istatistikler
    const totalsRes = await db.query<{
      total_vehicles: string;
      total_rentals: string;
      total_users: string;
      new_last_7d: string;
      prev_7d: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM public.vehicles WHERE status = 'active') as total_vehicles,
         (SELECT COUNT(*) FROM public.rentals WHERE status = 'active') as total_rentals,
         (SELECT COUNT(*) FROM public.users) as total_users,
         (SELECT COUNT(*) FROM public.vehicles WHERE published_at > now() - interval '7 days') as new_last_7d,
         (SELECT COUNT(*) FROM public.vehicles WHERE published_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') as prev_7d`,
    );

    const totals = totalsRes.rows[0];

    // Trend
    const newLast7 = Number(totals.new_last_7d);
    const prev7 = Number(totals.prev_7d);
    const newListingsTrend =
      prev7 > 0 ? Math.round(((newLast7 - prev7) / prev7) * 100) : 0;

    // Fiyat trendi (son 30 gün)
    const priceChangeRes = await db.query<{ recent_avg: number; previous_avg: number }>(
      `SELECT
         (SELECT AVG(price_amount)::numeric FROM public.vehicles WHERE published_at > now() - interval '30 days' AND status = 'active') as recent_avg,
         (SELECT AVG(price_amount)::numeric FROM public.vehicles WHERE published_at BETWEEN now() - interval '60 days' AND now() - interval '30 days' AND status = 'active') as previous_avg`,
    );
    const recentAvg = Number(priceChangeRes.rows[0]?.recent_avg ?? 0);
    const previousAvg = Number(priceChangeRes.rows[0]?.previous_avg ?? 0);
    const avgPriceChange =
      previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

    // En popüler markalar (son 30 gün)
    const topMakesRes = await db.query<{ make: string; count: number; avg_price: number }>(
      `SELECT COALESCE(b.name->>'en', b.name->>'tr', 'Unknown') as make,
              COUNT(*) as count,
              AVG(v.price_amount)::numeric as avg_price
       FROM public.vehicles v
       JOIN public.brands b ON b.id = v.make_id
       WHERE v.status = 'active' AND v.published_at > now() - interval '30 days'
       GROUP BY b.id, b.name
       ORDER BY count DESC
       LIMIT 10`,
    );

    // Ülke dağılımı
    const topCountriesRes = await db.query<{ country: string; count: number }>(
      `SELECT country_code as country, COUNT(*) as count
       FROM public.vehicles
       WHERE status = 'active' AND country_code IS NOT NULL
       GROUP BY country_code
       ORDER BY count DESC
       LIMIT 10`,
    );

    // AI kullanım istatistikleri
    const aiUsageRes = await db.query<{
      type: string;
      calls: string;
      cost: number;
    }>(
      `SELECT type, COUNT(*) as calls, COALESCE(SUM(cost_usd), 0) as cost
       FROM public.ai_jobs
       WHERE created_at > now() - interval '30 days'
       GROUP BY type`,
    );

    const byType: Record<string, { calls: number; costUsd: number }> = {};
    let totalCalls = 0;
    let totalCost = 0;
    for (const row of aiUsageRes.rows) {
      const calls = Number(row.calls);
      const cost = Number(row.cost);
      byType[row.type] = { calls, costUsd: cost };
      totalCalls += calls;
      totalCost += cost;
    }

    const stats: MarketStats = {
      totalVehicles: Number(totals.total_vehicles),
      totalRentals: Number(totals.total_rentals),
      totalUsers: Number(totals.total_users),
      newListingsLast7Days: newLast7,
      newListingsTrend,
      avgPriceChange,
      topMakes: topMakesRes.rows.map((r) => ({
        make: r.make,
        count: Number(r.count),
        avgPrice: Number(r.avg_price),
      })),
      topCountries: topCountriesRes.rows.map((r) => ({
        country: r.country,
        count: Number(r.count),
      })),
      aiUsage: {
        totalCalls,
        totalCostUsd: totalCost,
        byType,
      },
    };

    return reply.send(stats);
  });

  /**
   * GET /ai/admin/ai-cost-trend?days=30
   */
  app.get<{ Querystring: { days?: string } }>("/ai/admin/ai-cost-trend", async (req, reply) => {
    const days = Number(req.query.days ?? 30);
    const res = await db.query<{ day: Date; calls: number; cost: number }>(
      `SELECT DATE(created_at) as day,
              COUNT(*) as calls,
              COALESCE(SUM(cost_usd), 0) as cost
       FROM public.ai_jobs
       WHERE created_at > now() - ($1 || ' days')::interval
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [String(days)],
    );

    return reply.send({
      days,
      data: res.rows.map((r) => ({
        day: r.day,
        calls: Number(r.calls),
        costUsd: Number(r.cost),
      })),
    });
  });
}