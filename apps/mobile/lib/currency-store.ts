import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import {
  type AppCurrency,
  type HatwanUsdQuote,
  FALLBACK_HATWAN_USD,
  convertAmount,
  fetchHatwanUsdQuote,
  formatMoney,
  normalizeCurrency,
} from "./hatwan-rates";

const PREF_KEY = "seyyare.display_currency";
const RATE_KEY = "seyyare.hatwan_usd_quote";
const DAY_MS = 24 * 60 * 60 * 1000;

interface CurrencyState {
  display: AppCurrency;
  quote: HatwanUsdQuote | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  setDisplay: (c: AppCurrency) => Promise<void>;
  hydrate: () => Promise<void>;
  refreshRates: (force?: boolean) => Promise<void>;
  /** Listing fiyatını seçili para biriminde formatla */
  formatListing: (
    amount: number | string | null | undefined,
    listingCurrency?: string | null,
    locale?: string,
  ) => string;
}

async function loadCachedQuote(): Promise<HatwanUsdQuote | null> {
  try {
    const raw = await SecureStore.getItemAsync(RATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HatwanUsdQuote;
  } catch {
    return null;
  }
}

function isFresh(quote: HatwanUsdQuote | null): boolean {
  if (!quote?.fetchedAt) return false;
  const t = Date.parse(quote.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DAY_MS;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  display: "IQD",
  quote: null,
  loading: false,
  error: null,
  hydrated: false,

  setDisplay: async (c) => {
    set({ display: c });
    try {
      await SecureStore.setItemAsync(PREF_KEY, c);
    } catch {
      /* ignore */
    }
  },

  hydrate: async () => {
    try {
      const pref = await SecureStore.getItemAsync(PREF_KEY);
      const display =
        pref === "USD" || pref === "IQD" ? pref : ("IQD" as AppCurrency);
      const cached = await loadCachedQuote();
      set({
        display,
        quote: cached ?? FALLBACK_HATWAN_USD,
        hydrated: true,
      });
      if (!isFresh(cached)) {
        void get().refreshRates(true);
      }
    } catch {
      set({
        quote: FALLBACK_HATWAN_USD,
        hydrated: true,
      });
    }
  },

  refreshRates: async (force = false) => {
    const { quote, loading } = get();
    if (loading) return;
    if (!force && isFresh(quote)) return;
    set({ loading: true, error: null });
    try {
      const next = await fetchHatwanUsdQuote();
      set({ quote: next, loading: false, error: null });
      try {
        await SecureStore.setItemAsync(RATE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Kur alınamadı",
        quote: get().quote ?? FALLBACK_HATWAN_USD,
      });
    }
  },

  formatListing: (amount, listingCurrency, locale = "en") => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "—";
    const from = normalizeCurrency(listingCurrency);
    const { display, quote } = get();
    const converted = convertAmount(n, from, display, quote, "mid");
    return formatMoney(converted, display, locale);
  },
}));

export type { AppCurrency, HatwanUsdQuote };
