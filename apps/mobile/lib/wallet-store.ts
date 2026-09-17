import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { api } from "./api";
import { auth } from "./auth";
import { readWalletSnapshot, writeWalletSnapshot } from "./offline-snapshot";

const BALANCE_KEY = "seyyare.wallet_balance_iqd";

/** İlan yayınlama ücreti (IQD) — bakiye yetersizse yayınlanamaz */
export const LISTING_FEE_IQD = 25_000;

/** Öne çıkarma paketleri (IQD) */
export const BOOST_FEES_IQD = {
  app: 15_000,
  social: 35_000,
  both: 45_000,
} as const;

export type BoostChannel = keyof typeof BOOST_FEES_IQD;

export const TOP_UP_PACKAGES_IQD = [25_000, 50_000, 100_000, 250_000] as const;

interface WalletState {
  balanceIqd: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  topUp: (amountIqd: number) => Promise<void>;
  /** İlan ücreti düş; yetersizse false. remote=true → sunucu debit başarılı */
  chargeListingFee: () => Promise<
    | { ok: true; fee: number; remote: boolean }
    | { ok: false; need: number }
  >;
  chargeBoost: (
    channel: BoostChannel,
  ) => Promise<{ ok: true; fee: number } | { ok: false; need: number }>;
  canAffordListing: () => boolean;
}

async function persist(balance: number) {
  try {
    await SecureStore.setItemAsync(BALANCE_KEY, String(balance));
  } catch {
    /* ignore */
  }
  void writeWalletSnapshot(balance);
}

async function readLocalBalance(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(BALANCE_KEY);
    const n = raw != null ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function parseBalance(payload: unknown): number | null {
  if (payload == null) return null;
  if (typeof payload === "number" && Number.isFinite(payload) && payload >= 0) {
    return Math.floor(payload);
  }
  if (typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    const raw = row.balance_iqd ?? row.balance ?? row.get_wallet_balance;
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      return Math.floor(raw);
    }
    if (typeof raw === "string" && Number.isFinite(Number(raw))) {
      return Math.max(0, Math.floor(Number(raw)));
    }
  }
  return null;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balanceIqd: 0,
  hydrated: false,

  hydrate: async () => {
    const local = await readLocalBalance();

    try {
      const loggedIn = await auth.isAuthenticated();
      if (loggedIn) {
        const remote = await api.rpc<unknown>("get_wallet_balance", {});
        const bal = parseBalance(remote);
        if (bal != null) {
          set({ balanceIqd: bal, hydrated: true });
          await persist(bal);
          return;
        }
      }
    } catch {
      /* fall through to offline snapshot / SecureStore */
    }

    const snap = await readWalletSnapshot();
    const balance = snap != null ? snap : local;
    set({ balanceIqd: balance, hydrated: true });
    if (balance > 0) await persist(balance);
  },

  topUp: async (amountIqd) => {
    const amount = Math.max(0, Math.floor(amountIqd));

    try {
      const loggedIn = await auth.isAuthenticated();
      if (loggedIn) {
        const remote = await api.rpc<unknown>("wallet_top_up", {
          p_amount_iqd: amount,
        });
        const bal = parseBalance(remote);
        if (bal != null) {
          set({ balanceIqd: bal });
          await persist(bal);
          return;
        }
      }
    } catch {
      /* local fallback */
    }

    const next = get().balanceIqd + amount;
    set({ balanceIqd: next });
    await persist(next);
  },

  chargeListingFee: async () => {
    const fee = LISTING_FEE_IQD;

    try {
      const loggedIn = await auth.isAuthenticated();
      if (loggedIn) {
        const remote = await api.rpc<unknown>("charge_listing_fee", {});
        if (remote != null && typeof remote === "object") {
          const row = remote as Record<string, unknown>;
          if (row.ok === true || row.ok === "true") {
            const bal = parseBalance(row) ?? get().balanceIqd - fee;
            set({ balanceIqd: bal });
            await persist(bal);
            return { ok: true as const, fee: Number(row.fee ?? fee), remote: true };
          }
          if (row.ok === false || row.ok === "false") {
            const need = Number(row.need ?? fee - get().balanceIqd);
            return { ok: false as const, need: Math.max(0, need) };
          }
        }
        // Scalar new-balance response
        const bal = parseBalance(remote);
        if (bal != null) {
          set({ balanceIqd: bal });
          await persist(bal);
          return { ok: true as const, fee, remote: true };
        }
      }
    } catch {
      /* local fallback */
    }

    const current = get().balanceIqd;
    if (current < fee) {
      return { ok: false as const, need: fee - current };
    }
    const next = current - fee;
    set({ balanceIqd: next });
    await persist(next);
    return { ok: true as const, fee, remote: false };
  },

  chargeBoost: async (channel) => {
    const fee = BOOST_FEES_IQD[channel];
    const current = get().balanceIqd;
    if (current < fee) {
      return { ok: false as const, need: fee - current };
    }
    const next = current - fee;
    set({ balanceIqd: next });
    await persist(next);
    return { ok: true as const, fee };
  },

  canAffordListing: () => get().balanceIqd >= LISTING_FEE_IQD,
}));
