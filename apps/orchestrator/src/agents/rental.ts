// Rental Agent — dinamik kiralama fiyatı
// Rule-based + LLM açıklama

import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

export interface RentalInput {
  rentalId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface RentalFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RentalResult {
  rentalId: string;
  startDate: string;
  endDate: string;
  days: number;
  baseAmount: number;
  finalAmount: number;
  currency: string;
  factors: RentalFactor[];
  totalMultiplier: number;
  breakdown: Array<{ label: string; amount: number }>;
  confidence: number;
  explanation: string;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

export async function quoteRental(input: RentalInput): Promise<RentalResult> {
  // 1. Rental bilgisi
  const rentalRes = await db.query<{
    daily_rate_amount: string | number;
    daily_rate_currency: string;
    min_days: number;
    max_days: number;
  }>(
    `SELECT daily_rate_amount, daily_rate_currency, min_days, max_days
     FROM public.rentals WHERE id = $1`,
    [input.rentalId],
  );

  const rental = rentalRes.rows[0];
  if (!rental) throw new Error("rental_not_found");

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (days < rental.min_days || days > rental.max_days) {
    throw new Error(`invalid_days: ${days} (min ${rental.min_days}, max ${rental.max_days})`);
  }

  // 2. Occupancy (son 60 gün)
  const occRes = await db.query<{ occupancy: number }>(
    `SELECT COUNT(*)::float / 60 as occupancy
     FROM public.rental_availability
     WHERE rental_id = $1 AND date > current_date - 60 AND status = 'booked'`,
    [input.rentalId],
  );
  const occupancy = occRes.rows[0]?.occupancy ?? 0;

  // 3. Faktörler
  const factors: RentalFactor[] = [];
  const baseRate = Number(rental.daily_rate_currency);
  const baseAmount = Number(rental.daily_rate_amount) * days;
  const currency = rental.daily_rate_currency;

  // Hafta sonu
  const weekendDays = countWeekendDays(start, end);
  if (weekendDays > 0) {
    factors.push({ factor: "weekend_premium", impact: 0.15, description: `${weekendDays} hafta sonu günü (+%15)` });
  }

  // Sezon
  const month = start.getMonth() + 1;
  if (month >= 6 && month <= 8) {
    factors.push({ factor: "summer_season", impact: 0.1, description: "Yaz sezonu (+%10)" });
  } else if (month === 12 || month <= 2) {
    factors.push({ factor: "winter_season", impact: -0.05, description: "Kış sezonu (-%5)" });
  }

  // Tatil
  const holidays = ["01-01", "04-23", "05-19", "07-15", "10-29", "08-30"];
  const ds = `${String(month).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  if (holidays.includes(ds)) {
    factors.push({ factor: "national_holiday", impact: 0.2, description: "Resmi tatil (+%20)" });
  }

  // Talep
  if (occupancy > 0.7) {
    factors.push({ factor: "high_demand", impact: 0.12, description: `Yüksek talep (${Math.round(occupancy * 100)}% doluluk, +%12)` });
  } else if (occupancy < 0.2) {
    factors.push({ factor: "low_demand", impact: -0.1, description: `Düşük talep (-%10)` });
  }

  // Lead time
  const daysAhead = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysAhead > 30) {
    factors.push({ factor: "early_bird", impact: -0.08, description: `Erken rezervasyon (-%8)` });
  } else if (daysAhead < 3 && daysAhead >= 0) {
    factors.push({ factor: "last_minute", impact: 0.08, description: "Son dakika (+%8)" });
  }

  // Haftalık
  if (days >= 7) {
    factors.push({ factor: "weekly_discount", impact: -0.1, description: "Haftalık kiralama (-%10)" });
  }

  // Toplam
  const totalMultiplier = factors.reduce((acc, f) => acc * (1 + f.impact), 1);
  const finalAmount = Math.round(baseAmount * totalMultiplier);
  const breakdown = [{ label: `${days} gün × ${baseAmount / days} ${currency}`, amount: baseAmount }];
  for (const f of factors) {
    breakdown.push({ label: f.factor, amount: Math.round(baseAmount * f.impact) });
  }

  // 4. LLM açıklama
  const prompt = `Sen bir araç kiralama fiyat analistisin. Bu teklifi müşteriye 2-3 cümlede açıkla:

Araç kiralama: ${days} gün, ${baseAmount.toLocaleString()} ${currency} temel fiyat.
Çarpanlar: ${factors.map((f) => `${f.factor} (${(f.impact * 100).toFixed(0)}%)`).join(", ") || "yok"}
Toplam: ${finalAmount.toLocaleString()} ${currency} (çapraz ${(totalMultiplier * 100).toFixed(0)}%).

Cevabını Türkçe, samimi ve net yaz. "Bu fiyat şunlardan etkilendi..." gibi başla.`;

  const explainResult = await openrouter.chat({
    model: MODELS.cheap_pricing,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    maxTokens: 200,
  });

  return {
    rentalId: input.rentalId,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    baseAmount,
    finalAmount,
    currency,
    factors,
    totalMultiplier,
    breakdown,
    confidence: Math.min(1, 0.6 + occupancy * 0.4),
    explanation: explainResult.content.trim(),
    model: explainResult.model,
    costUsd: explainResult.costUsd,
    durationMs: explainResult.durationMs,
    tokens: explainResult.usage.totalTokens,
  };
}

function countWeekendDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day === 5 || day === 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}