/**
 * Hatwan Exchange (https://hatwanexchange.com) günlük kur.
 * Ana sayfa Inertia `data-page` props.currencies içinden okunur.
 *
 * USD satırı: IQD / 100 USD (Erbil piyasa gösterimi).
 * Örn. sale=158850 → 1 USD = 1588.5 IQD
 */

const HATWAN_URL = "https://hatwanexchange.com/";

export type AppCurrency = "IQD" | "USD";

export interface HatwanUsdQuote {
  /** IQD per 100 USD — alış */
  buyPer100: number;
  /** IQD per 100 USD — satış */
  salePer100: number;
  updatedAt: string;
  fetchedAt: string;
  source: "hatwanexchange.com";
}

export interface HatwanCurrencyRow {
  currency_code: string;
  buy: number;
  sale: number;
  updated_at: string;
  name?: string;
}

function decodeDataPage(html: string): unknown {
  const m = html.match(/data-page="([^"]+)"/);
  if (!m) throw new Error("Hatwan: data-page bulunamadı");
  const decoded = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return JSON.parse(decoded);
}

export async function fetchHatwanCurrencies(): Promise<HatwanCurrencyRow[]> {
  const res = await fetch(HATWAN_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "SeyyareMobile/1.0",
    },
  });
  if (!res.ok) throw new Error(`Hatwan HTTP ${res.status}`);
  const html = await res.text();
  const page = decodeDataPage(html) as {
    props?: { currencies?: HatwanCurrencyRow[] };
  };
  const list = page.props?.currencies;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Hatwan: currencies boş");
  }
  return list;
}

export async function fetchHatwanUsdQuote(): Promise<HatwanUsdQuote> {
  const list = await fetchHatwanCurrencies();
  const usd = list.find((c) => c.currency_code === "USD");
  if (!usd) throw new Error("Hatwan: USD satırı yok");
  return {
    buyPer100: Number(usd.buy),
    salePer100: Number(usd.sale),
    updatedAt: String(usd.updated_at ?? ""),
    fetchedAt: new Date().toISOString(),
    source: "hatwanexchange.com",
  };
}

/** 1 USD = kaç IQD (orta / alış / satış) */
export function iqdPerUsd(
  quote: HatwanUsdQuote,
  side: "buy" | "sale" | "mid" = "mid",
): number {
  const per100 =
    side === "buy"
      ? quote.buyPer100
      : side === "sale"
        ? quote.salePer100
        : (quote.buyPer100 + quote.salePer100) / 2;
  return per100 / 100;
}

/**
 * Fiyatı görüntü para birimine çevir.
 * Listing para birimi bilinmiyorsa IQD varsayılır (Irak pazarı).
 */
export function convertAmount(
  amount: number,
  from: AppCurrency,
  to: AppCurrency,
  quote: HatwanUsdQuote | null,
  side: "buy" | "sale" | "mid" = "mid",
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  if (!quote) return amount;
  const rate = iqdPerUsd(quote, side);
  if (rate <= 0) return amount;
  if (from === "USD" && to === "IQD") return amount * rate;
  if (from === "IQD" && to === "USD") return amount / rate;
  return amount;
}

export function normalizeCurrency(code?: string | null): AppCurrency {
  const c = (code ?? "IQD").toUpperCase();
  if (c === "USD" || c === "US$" || c === "$") return "USD";
  return "IQD";
}

export function formatMoney(
  amount: number,
  currency: AppCurrency,
  locale = "en",
): string {
  const maxFrac = currency === "USD" ? 0 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    const n = Math.round(amount).toLocaleString(locale);
    return `${n} ${currency}`;
  }
}

/** Fallback — ağ yokken (yaklaşık Erbil piyasa) */
export const FALLBACK_HATWAN_USD: HatwanUsdQuote = {
  buyPer100: 158500,
  salePer100: 158750,
  updatedAt: "fallback",
  fetchedAt: new Date(0).toISOString(),
  source: "hatwanexchange.com",
};
