export type Vehicle = {
  id: string;
  make_id?: number | null;
  make_name?: string | null;
  model: string;
  year: number;
  mileage_km: number | null;
  price_amount: number | string;
  price_currency: string;
  city: string | null;
  title_original: string | null;
  cover_url: string | null;
  featured?: boolean;
};

export type Brand = {
  id: number;
  name: string;
  name_en?: string | null;
  logo_url?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchFeaturedVehicles(limit = 24): Promise<Vehicle[]> {
  const url =
    `${API_BASE}/api/vehicles?status=eq.active` +
    `&select=id,make_id,model,year,mileage_km,price_amount,price_currency,city,title_original,cover_url,featured` +
    `&order=featured.desc,published_at.desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as Vehicle[];
}

export async function fetchReferenceBrands(locale = "tr"): Promise<Brand[]> {
  const res = await fetch(`${API_BASE}/api/rpc/list_reference_data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as { brands?: Brand[] };
  return Array.isArray(data?.brands) ? data.brands : [];
}

export function formatPrice(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  if (currency === "IQD") {
    return `${Math.round(n).toLocaleString("tr-TR")} IQD`;
  }
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

export function formatKm(km: number | null): string {
  if (km == null) return "—";
  return `${km.toLocaleString("tr-TR")} km`;
}
