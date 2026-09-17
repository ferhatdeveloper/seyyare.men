import AsyncStorage from "@react-native-async-storage/async-storage";

/** AsyncStorage key for persisted saved vehicle searches */
export const SAVED_SEARCHES_KEY = "seyyare.saved_searches";

export type SavedSearchParams = {
  q?: string;
  make?: string;
  makeId?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  city?: string;
  condition?: string;
  sortBy?: string;
  sortDir?: string;
};

export type SavedSearch = {
  id: string;
  title: string;
  subtitle: string;
  params: SavedSearchParams;
  createdAt: string;
};

function paramEntries(params: SavedSearchParams): Array<[string, string]> {
  return Object.entries(params).filter(
    (e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0,
  );
}

export function buildSearchShareMessage(params: SavedSearchParams, title?: string): string {
  const qs = new URLSearchParams(paramEntries(params)).toString();
  const link = qs ? `https://seyyare.men/search?${qs}` : "https://seyyare.men/search";
  const label = title?.trim() || "Kayıtlı arama";
  return `${label} — Seyyare\n${link}`;
}

export function buildSavedSearchTitle(params: SavedSearchParams): string {
  if (params.make) return params.make;
  if (params.q) return params.q;
  if (params.city) return params.city;
  return "Arama";
}

export function buildSavedSearchSubtitle(params: SavedSearchParams): string {
  const parts: string[] = [];
  if (params.minYear || params.maxYear) {
    parts.push(
      [params.minYear, params.maxYear].filter(Boolean).join("–") ||
        (params.minYear ? `${params.minYear}+` : `–${params.maxYear}`),
    );
  }
  if (params.maxPrice) {
    const n = Number(params.maxPrice);
    parts.push(
      Number.isFinite(n) ? `≤ ${n.toLocaleString("tr-TR")} ₺` : `max ${params.maxPrice}`,
    );
  } else if (params.minPrice) {
    const n = Number(params.minPrice);
    parts.push(
      Number.isFinite(n) ? `≥ ${n.toLocaleString("tr-TR")} ₺` : `min ${params.minPrice}`,
    );
  }
  if (params.city && params.city !== params.make) parts.push(params.city);
  if (params.condition && params.condition !== "all") parts.push(params.condition);
  return parts.length > 0 ? parts.join(" · ") : "Filtreli arama";
}

async function readAll(): Promise<SavedSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: SavedSearch[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items));
}

function sameParams(a: SavedSearchParams, b: SavedSearchParams): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const ka = k as keyof SavedSearchParams;
    if ((a[ka] ?? "") !== (b[ka] ?? "")) return false;
  }
  return true;
}

export const savedSearchesStore = {
  list: readAll,

  async save(params: SavedSearchParams): Promise<SavedSearch> {
    const cleaned: SavedSearchParams = {};
    for (const [k, v] of paramEntries(params)) {
      cleaned[k as keyof SavedSearchParams] = v;
    }
    const items = await readAll();
    const existing = items.find((s) => sameParams(s.params, cleaned));
    if (existing) return existing;

    const next: SavedSearch = {
      id: `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: buildSavedSearchTitle(cleaned),
      subtitle: buildSavedSearchSubtitle(cleaned),
      params: cleaned,
      createdAt: new Date().toISOString(),
    };
    await writeAll([next, ...items]);
    return next;
  },

  async remove(id: string): Promise<void> {
    const items = await readAll();
    await writeAll(items.filter((s) => s.id !== id));
  },
};
