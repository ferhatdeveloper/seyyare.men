import tr from "../locales/tr/common.json";
import en from "../locales/en/common.json";
import ar from "../locales/ar/common.json";
import fa from "../locales/fa/common.json";
import kuBad from "../locales/ku-bad/common.json";
import kuSor from "../locales/ku-sor/common.json";

export const supportedLocales = ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"] as const;
export type LocaleCode = (typeof supportedLocales)[number];
export const defaultLocale: LocaleCode = "tr";

export const isRTL = (locale: LocaleCode): boolean =>
  locale === "ar" || locale === "fa" || locale === "ku-sor";

export const localeNativeName: Record<LocaleCode, string> = {
  tr: "Türkçe",
  en: "English",
  ar: "العربية",
  fa: "فارسی",
  "ku-bad": "Kurmancî (Badînî)",
  "ku-sor": "کوردی (سۆرانی)",
};

export const resources = {
  tr: { common: tr },
  en: { common: en },
  ar: { common: ar },
  fa: { common: fa },
  "ku-bad": { common: kuBad },
  "ku-sor": { common: kuSor },
};