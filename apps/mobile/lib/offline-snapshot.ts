import AsyncStorage from "@react-native-async-storage/async-storage";

import type { VehicleListItem } from "../components/VehicleCard";

/** AsyncStorage key prefix for last-successful hub payloads */
export const OFFLINE_SNAPSHOT_PREFIX = "seyyare.offline_v1";

const KEYS = {
  vehicles: `${OFFLINE_SNAPSHOT_PREFIX}.vehicles`,
  favorites: `${OFFLINE_SNAPSHOT_PREFIX}.favorites`,
  wallet: `${OFFLINE_SNAPSHOT_PREFIX}.wallet_balance_iqd`,
} as const;

type FavoritesRow = { vehicle?: VehicleListItem | null };

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore persist errors */
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Persist last successful vehicle feed / search results. */
export async function writeVehiclesSnapshot(
  vehicles: VehicleListItem[],
): Promise<void> {
  if (!Array.isArray(vehicles) || vehicles.length === 0) return;
  await writeJson(KEYS.vehicles, vehicles);
}

/** Read cached vehicle feed; null when missing or invalid. */
export async function readVehiclesSnapshot(): Promise<VehicleListItem[] | null> {
  const rows = await readJson<VehicleListItem[]>(KEYS.vehicles);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows;
}

/**
 * Persist favorites (API row shape or bare vehicles).
 * Guests may still read a prior snapshot without auth.
 */
export async function writeFavoritesSnapshot(
  rows: FavoritesRow[] | VehicleListItem[],
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const vehicles: VehicleListItem[] = rows.flatMap((row) => {
    if (row && typeof row === "object" && "vehicle" in row) {
      const v = (row as FavoritesRow).vehicle;
      return v ? [v] : [];
    }
    if (row && typeof row === "object" && "id" in row) {
      return [row as VehicleListItem];
    }
    return [];
  });

  if (vehicles.length === 0) return;
  await writeJson(KEYS.favorites, vehicles);
}

export async function readFavoritesSnapshot(): Promise<VehicleListItem[] | null> {
  const rows = await readJson<VehicleListItem[]>(KEYS.favorites);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows;
}

/** Persist wallet balance after a successful hydrate / remote read. */
export async function writeWalletSnapshot(balanceIqd: number): Promise<void> {
  if (!Number.isFinite(balanceIqd) || balanceIqd < 0) return;
  await writeJson(KEYS.wallet, Math.floor(balanceIqd));
}

export async function readWalletSnapshot(): Promise<number | null> {
  const raw = await readJson<unknown>(KEYS.wallet);
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && Number.isFinite(Number(raw))) {
    return Math.max(0, Math.floor(Number(raw)));
  }
  return null;
}
