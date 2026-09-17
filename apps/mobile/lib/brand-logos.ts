/** Car brand logo helpers — multi-CDN fallbacks (English slug) */

const CDN_THUMB =
  "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb";
const CDN_OPT =
  "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized";
const CDN_GITHUB =
  "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb";

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
  "rolls royce": "rolls-royce",
  "aston martin": "aston-martin",
  "great wall": "great-wall",
  ssangyong: "ssangyong",
  "ssang yong": "ssangyong",
  mini: "mini",
  "citroën": "citroen",
  citroen: "citroen",
  "škoda": "skoda",
  skoda: "skoda",
  togg: "togg",
  "byd auto": "byd",
  "jetour": "jetour",
  "hongqi": "hongqi",
  "changan": "changan",
  "haval": "haval",
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
  const slug = n.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return slug;
}

/** Prefer English name for CDN slug (localized labels break Latin slugs). */
export function brandLogoLookupName(
  name: string,
  nameEn?: string | null,
): string {
  if (nameEn && /[a-zA-Z]/.test(nameEn)) return nameEn;
  if (/[a-zA-Z]/.test(name)) return name;
  return nameEn || name;
}

export function brandLogoUrl(name: string, nameEn?: string | null): string {
  const slug = brandSlug(brandLogoLookupName(name, nameEn));
  if (!slug) return "";
  return `${CDN_THUMB}/${slug}.png`;
}

/** Ordered candidates for BrandLogo onError chain */
export function brandLogoCandidates(
  name: string,
  preferred?: string | null,
  nameEn?: string | null,
): string[] {
  const slug = brandSlug(brandLogoLookupName(name, nameEn));
  const list: string[] = [];
  if (preferred && /^https?:\/\//i.test(preferred)) list.push(preferred);
  if (slug) {
    list.push(`${CDN_THUMB}/${slug}.png`);
    list.push(`${CDN_OPT}/${slug}.png`);
    list.push(`${CDN_GITHUB}/${slug}.png`);
  }
  return [...new Set(list)];
}

export type BrandRef = {
  id: number;
  name: string;
  name_en?: string | null;
  logo_url?: string | null;
};

/** Enrich brand list with logo URLs */
export function withBrandLogos<
  T extends { name: string; name_en?: string | null; logo_url?: string | null },
>(brands: T[]): Array<T & { logo_url: string; name_en: string }> {
  return brands.map((b) => {
    const name_en = b.name_en || ( /[a-zA-Z]/.test(b.name) ? b.name : "");
    const fromApi =
      b.logo_url && /^https?:\/\//i.test(b.logo_url) ? b.logo_url : null;
    return {
      ...b,
      name_en,
      logo_url: fromApi || brandLogoUrl(b.name, name_en) || "",
    };
  });
}
