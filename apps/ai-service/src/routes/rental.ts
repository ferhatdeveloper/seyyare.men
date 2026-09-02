import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { cache } from "../lib/cache.js";
import { openrouter } from "../services/openrouter.js";

const RentalPriceSchema = z.object({
  rentalId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface PriceFactor {
  factor: string;
  impact: number; // -1.0 ile +1.0 arası
  description: string;
}

interface RentalPriceQuote {
  rentalId: string;
  startDate: string;
  endDate: string;
  days: number;
  baseAmount: number;
  currency: string;
  factors: PriceFactor[];
  totalMultiplier: number;
  finalAmount: number;
  breakdown: Array<{ label: string; amount: number }>;
  confidence: number;
  model: string;
}

export async function rentalRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /ai/rental-price?rentalId=...&startDate=...&endDate=...
   * Dinamik kiralama fiyatı hesapla
   */
  app.get("/ai/rental-price", async (req, reply) => {
    const q = z
      .object({
        rentalId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .safeParse(req.query);

    if (!q.success) {
      return reply.code(400).send({ error: "validation_error", details: q.error.flatten() });
    }
    const { rentalId, startDate, endDate } = q.data;

    const cacheKey = `rental-price:${rentalId}:${startDate}:${endDate}`;
    const cached = await cache.get<RentalPriceQuote>(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    // Rental bilgilerini çek
    const rentalRes = await db.query<{
      daily_rate_amount: string | number;
      daily_rate_currency: string;
      weekly_rate_amount: string | number | null;
      monthly_rate_amount: string | number | null;
      min_days: number;
      max_days: number;
    }>(
      `SELECT daily_rate_amount, daily_rate_currency, weekly_rate_amount, monthly_rate_amount,
              min_days, max_days
       FROM public.rentals WHERE id = $1`,
      [rentalId],
    );

    const rental = rentalRes.rows[0];
    if (!rental) return reply.code(404).send({ error: "rental_not_found" });

    const baseRate = Number(rental.daily_rate_amount);
    const currency = rental.daily_rate_currency;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < rental.min_days || days > rental.max_days) {
      return reply.code(400).send({
        error: "invalid_days",
        min: rental.min_days,
        max: rental.max_days,
        requested: days,
      });
    }

    // Geçmiş doluluk oranı (son 60 gün)
    const occupancyRes = await db.query<{ occupancy: number }>(
      `SELECT COUNT(*)::float / GREATEST(60, 1) as occupancy
       FROM public.rental_availability
       WHERE rental_id = $1 AND date > current_date - 60 AND status = 'booked'`,
      [rentalId],
    );
    const occupancy = occupancyRes.rows[0]?.occupancy ?? 0;

    // Faktörleri hesapla
    const factors: PriceFactor[] = [];

    // 1. Hafta sonu primi
    const weekendDays = countWeekendDays(start, end);
    if (weekendDays > 0) {
      factors.push({
        factor: "weekend_premium",
        impact: 0.15,
        description: `${weekendDays} hafta sonu günü (+%15 çarpan)`,
      });
    }

    // 2. Sezon (yaz ayları Haziran-Ağustos için +%10)
    const month = start.getMonth() + 1;
    if (month >= 6 && month <= 8) {
      factors.push({
        factor: "summer_season",
        impact: 0.1,
        description: "Yaz sezonu (+%10 çarpan)",
      });
    } else if (month === 12 || month <= 2) {
      factors.push({
        factor: "winter_season",
        impact: -0.05,
        description: "Kış sezonu (-%5 çarpan, düşük talep)",
      });
    }

    // 3. Tatil/özel günler (1 Ocak, 23 Nisan, 19 Mayıs, 15 Temmuz, 29 Ekim, arefe günleri)
    const holidays = ["01-01", "04-23", "05-19", "07-15", "10-29", "08-30"];
    const dateStr = `${String(month).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    if (holidays.includes(dateStr)) {
      factors.push({
        factor: "national_holiday",
        impact: 0.2,
        description: "Resmi tatil dönemi (+%20 çarpan)",
      });
    }

    // 4. Talep (doluluk oranı)
    if (occupancy > 0.7) {
      factors.push({
        factor: "high_demand",
        impact: 0.12,
        description: `Yüksek talep (son 60 gün %${(occupancy * 100).toFixed(0)} doluluk, +%12)`,
      });
    } else if (occupancy < 0.2) {
      factors.push({
        factor: "low_demand",
        impact: -0.1,
        description: `Düşük talep (%${(occupancy * 100).toFixed(0)} doluluk, -%10)`,
      });
    }

    // 5. Erken rezervasyon indirimi (>14 gün öncesi için -%5)
    const daysAhead = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysAhead > 30) {
      factors.push({
        factor: "early_bird",
        impact: -0.08,
        description: `Erken rezervasyon (${daysAhead} gün öncesi, -%8)`,
      });
    } else if (daysAhead < 3) {
      factors.push({
        factor: "last_minute",
        impact: 0.08,
        description: "Son dakika rezervasyonu (+%8)",
      });
    }

    // 6. Haftalık indirim (7+ gün)
    if (days >= 7 && rental.weekly_rate_amount) {
      factors.push({
        factor: "weekly_discount",
        impact: -0.1,
        description: "Haftalık kiralama indirimi (-%10)",
      });
    }

    // Toplam çarpan
    const totalMultiplier = factors.reduce((acc, f) => acc * (1 + f.impact), 1);
    const finalAmount = Math.round(baseRate * days * totalMultiplier);

    // Breakdown
    const breakdown: Array<{ label: string; amount: number }> = [
      { label: `${days} gün × ${baseRate.toLocaleString()} ${currency}`, amount: baseRate * days },
    ];
    for (const f of factors) {
      const adj = Math.round(baseRate * days * f.impact);
      breakdown.push({ label: f.factor, amount: adj });
    }

    const quote: RentalPriceQuote = {
      rentalId,
      startDate,
      endDate,
      days,
      baseAmount: baseRate * days,
      currency,
      factors,
      totalMultiplier,
      finalAmount,
      breakdown,
      confidence: Math.min(1, 0.6 + occupancy * 0.4),
      model: "rule-based+v1",
    };

    await cache.set(cacheKey, quote, 60 * 30); // 30 dakika
    return reply.send({ ...quote, cached: false });
  });

  /**
   * POST /ai/rental-price/quote
   * Body: { rentalId, startDate, endDate }
   * Same as GET, body-based version
   */
  app.post("/ai/rental-price/quote", async (req, reply) => {
    const parsed = RentalPriceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    // GET versiyonuna yönlendir
    const url = `/ai/rental-price?rentalId=${parsed.data.rentalId}&startDate=${parsed.data.startDate}&endDate=${parsed.data.endDate}`;
    return reply.redirect(307, url);
  });
}

function countWeekendDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 5 || day === 6) count++; // Cuma veya Cumartesi (Müslüman ülkeler için Cuma-Cumartesi)
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}