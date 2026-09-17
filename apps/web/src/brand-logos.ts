/** Car brand logo URL helpers for web */

const CDN_THUMB =
  "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb";

const SLUG_OVERRIDES: Record<string, string> = {
  "mercedes-benz": "mercedes-benz",
  mercedes: "mercedes-benz",
  vw: "volkswagen",
  "land rover": "land-rover",
  "alfa romeo": "alfa-romeo",
  "rolls-royce": "rolls-royce",
  "aston martin": "aston-martin",
};

function slugify(name: string) {
  const n = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (SLUG_OVERRIDES[n]) return SLUG_OVERRIDES[n];
  return n.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function brandLogoUrl(name: string, nameEn?: string | null): string {
  const src = nameEn && /[a-zA-Z]/.test(nameEn) ? nameEn : name;
  const slug = slugify(src);
  if (!slug) return "";
  return `${CDN_THUMB}/${slug}.png`;
}
