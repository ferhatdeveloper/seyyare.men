import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { resources, supportedLocales, defaultLocale, type LocaleCode } from "./locales";

const deviceLocales = Localization.getLocales();
const deviceLocale = deviceLocales[0]?.languageTag?.toLowerCase().replace("_", "-") ?? "tr";

const initialLocale: LocaleCode =
  (supportedLocales.find((l) => deviceLocale.startsWith(l)) as LocaleCode) ?? defaultLocale;

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: defaultLocale,
  defaultNS: "common",
  ns: ["common"],
  compatibilityJSON: "v4",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
});

export default i18n;
export { supportedLocales, defaultLocale };
export type { LocaleCode };