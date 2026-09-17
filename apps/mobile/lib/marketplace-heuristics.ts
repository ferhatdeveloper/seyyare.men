/** Shared marketplace UX heuristics (trust + valuation + chauffeur). */

export function isResponsiveDealer(opts: {
  verified?: boolean | null;
  rating_avg?: number | null;
}): boolean {
  if (opts.verified) return true;
  const r = opts.rating_avg;
  return typeof r === "number" && Number.isFinite(r) && r >= 4.5;
}

/**
 * Simple "good deal" signal: listing price below a demo market mid
 * for the same make / year-age band (~12% under fair mid).
 */
export function isGoodDeal(opts: {
  price_amount?: number | string | null;
  year?: number | null;
  make_name?: string | null;
}): boolean {
  const price = Number(opts.price_amount);
  if (!Number.isFinite(price) || price <= 0) return false;

  const year = opts.year ?? 2020;
  const age = Math.max(0, new Date().getFullYear() - year);
  let mid = 85_000_000 - age * 5_500_000;
  mid = Math.max(12_000_000, mid);

  const premium = new Set([
    "BMW",
    "Mercedes-Benz",
    "Audi",
    "Porsche",
    "Land Rover",
    "Tesla",
  ]);
  if (opts.make_name && premium.has(opts.make_name)) {
    mid *= 1.35;
  }

  return price < mid * 0.88;
}

/** Default chauffeur add-on when daily rate unknown (IQD). */
export const CHAUFFEUR_DAILY_FEE_IQD = 75_000;

export function chauffeurDailyFee(dailyRate?: number | null): number {
  const rate = Number(dailyRate);
  if (Number.isFinite(rate) && rate > 0) {
    return Math.max(50_000, Math.round(rate * 0.15));
  }
  return CHAUFFEUR_DAILY_FEE_IQD;
}
