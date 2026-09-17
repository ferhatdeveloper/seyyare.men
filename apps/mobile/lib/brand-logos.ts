/** Car brand logo helpers — filippofilip95/car-logos-dataset via jsDelivr */

const CDN =
  "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb";

/** Explicit slug overrides when name → slug is not 1:1 */
const SLUG_OVERRIDES: Record<string, string> = {
  "mercedes-benz": "mercedes-benz",
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  vw: "volkswagen",
  "land rover": "land-rover",
  "range rover": "land-rover",
  "alfa romeo": "alfa-romeo",
  "rolls-royce": "rolls-royce",
  "aston martin": "aston-martin",
  "great wall": "great-wall",
  "ssangyong": "ssangyong",
  "mini": "mini",
  "citroën": "citroen",
  citroen: "citroen",
  "škoda": "skoda",
  skoda: "skoda",
  togg: "togg", // may 404 — BrandLogo falls back to initial
};

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function brandSlug(name: string): string {
  const n = normalizeName(name);
  if (SLUG_OVERRIDES[n]) return SLUG_OVERRIDES[n];
  return n.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function brandLogoUrl(name: string): string {
  return `${CDN}/${brandSlug(name)}.png`;
}

export type BrandRef = {
  id: number;
  name: string;
  logo_url?: string | null;
};

/** Enrich brand list with logo URLs */
export function withBrandLogos<T extends { name: string }>(brands: T[]): Array<T & { logo_url: string }> {
  return brands.map((b) => ({
    ...b,
    logo_url: brandLogoUrl(b.name),
  }));
}
