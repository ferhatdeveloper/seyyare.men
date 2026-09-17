import { router } from "expo-router";
import { Bell, Globe, MapPin } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  localeNativeName,
  supportedLocales,
  type LocaleCode,
} from "../../lib/locales";
import {
  type AppCurrency,
  useCurrencyStore,
} from "../../lib/currency-store";
import { iqdPerUsd } from "../../lib/hatwan-rates";
import { colors, fonts, radius, space } from "../../lib/theme";
import { BrandMark } from "./BrandMark";
import { BrandWordmark } from "./BrandWordmark";

const LOCALE_SHORT: Record<LocaleCode, string> = {
  tr: "TR",
  en: "EN",
  ar: "AR",
  fa: "FA",
  "ku-bad": "KU",
  "ku-sor": "کورد",
};

type Props = {
  /** Extra actions after the default icons */
  right?: ReactNode;
  /** Extra content under the brand row (page title, search, etc.) */
  below?: ReactNode;
  style?: ViewStyle;
  /** When false, caller already handled top safe area */
  safeTop?: boolean;
  /** Default: konum + dil + bildirim */
  showActions?: boolean;
};

/** Sabit marka şeridi — logo + konum/dil/bildirim tüm sayfalarda */
export function AppHeader({
  right,
  below,
  style,
  safeTop = true,
  showActions = true,
}: Props) {
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const display = useCurrencyStore((s) => s.display);
  const quote = useCurrencyStore((s) => s.quote);
  const setDisplay = useCurrencyStore((s) => s.setDisplay);
  const refreshRates = useCurrencyStore((s) => s.refreshRates);
  const currentLocale = (supportedLocales.includes(i18n.language as LocaleCode)
    ? i18n.language
    : "tr") as LocaleCode;

  useEffect(() => {
    void refreshRates(false);
  }, [refreshRates]);

  const changeLocale = (locale: LocaleCode) => {
    void i18n.changeLanguage(locale);
    setLangOpen(false);
  };

  const changeCurrency = (c: AppCurrency) => {
    void setDisplay(c);
    setFxOpen(false);
  };

  const mid = quote ? iqdPerUsd(quote, "mid") : null;

  const body = (
    <View style={[styles.wrap, !safeTop && styles.wrapNoSafe, style]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <BrandMark size={30} tone="dark" />
          <View style={styles.copy}>
            <BrandWordmark script="latin" size={15} tone="light" />
            <Text style={styles.tagline} numberOfLines={1}>
              {t("app.tagline")}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {showActions ? (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                hitSlop={8}
                onPress={() => {}}
                accessibilityLabel="Konum"
              >
                <MapPin size={15} color={colors.flame} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.langBtn}
                hitSlop={8}
                onPress={() => setFxOpen(true)}
                accessibilityLabel={t("currency.label")}
              >
                <Text style={styles.langCode}>{display}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.langBtn}
                hitSlop={8}
                onPress={() => setLangOpen(true)}
                accessibilityLabel={t("auth.selectLanguage")}
              >
                <Globe size={13} color={colors.white} strokeWidth={2.2} />
                <Text style={styles.langCode}>{LOCALE_SHORT[currentLocale]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                hitSlop={8}
                onPress={() => router.push("/notifications")}
                accessibilityLabel={t("profile.notifications")}
              >
                <Bell size={15} color={colors.white} strokeWidth={2} />
              </TouchableOpacity>
            </>
          ) : null}
          {right}
        </View>
      </View>
      {below}
    </View>
  );

  return (
    <>
      {safeTop ? (
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {body}
        </SafeAreaView>
      ) : (
        body
      )}

      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={styles.langBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.langSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.langSheetTitle}>{t("auth.selectLanguage")}</Text>
            {supportedLocales.map((loc) => {
              const selected = loc === currentLocale;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[styles.langOption, selected && styles.langOptionActive]}
                  onPress={() => changeLocale(loc)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.langOptionCode, selected && styles.langOptionCodeActive]}>
                    {LOCALE_SHORT[loc]}
                  </Text>
                  <Text style={[styles.langOptionName, selected && styles.langOptionNameActive]}>
                    {localeNativeName[loc]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={fxOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFxOpen(false)}
      >
        <Pressable style={styles.langBackdrop} onPress={() => setFxOpen(false)}>
          <Pressable style={styles.langSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.langSheetTitle}>{t("currency.label")}</Text>
            {mid ? (
              <Text style={styles.fxRate}>
                {t("currency.hatwanMid", {
                  rate: mid.toLocaleString("en-US", { maximumFractionDigits: 1 }),
                })}
              </Text>
            ) : null}
            <Text style={styles.fxSource}>{t("currency.hatwanSource")}</Text>
            {(["IQD", "USD"] as AppCurrency[]).map((c) => {
              const selected = c === display;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.langOption, selected && styles.langOptionActive]}
                  onPress={() => changeCurrency(c)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.langOptionCode, selected && styles.langOptionCodeActive]}>
                    {c}
                  </Text>
                  <Text style={[styles.langOptionName, selected && styles.langOptionNameActive]}>
                    {c === "IQD" ? t("currency.iqd") : t("currency.usd")}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.fxRefresh}
              onPress={() => void refreshRates(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.fxRefreshText}>{t("currency.refresh")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.ink,
  },
  wrap: {
    backgroundColor: colors.ink,
    paddingHorizontal: space.lg,
    paddingTop: 2,
    paddingBottom: space.sm,
  },
  wrapNoSafe: {
    paddingTop: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
  },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 9,
    lineHeight: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
    marginLeft: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  langBtn: {
    height: 32,
    paddingHorizontal: 7,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  langCode: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.3,
  },
  langBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  langSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.section,
  },
  langSheetTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    marginBottom: space.md,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 6,
    backgroundColor: colors.mist,
  },
  langOptionActive: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.35)",
  },
  langOptionCode: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
    width: 40,
  },
  langOptionCodeActive: { color: colors.flameDeep },
  langOptionName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  langOptionNameActive: {
    fontFamily: fonts.bodySemi,
    color: colors.flameDeep,
  },
  fxRate: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  fxSource: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: space.md,
  },
  fxRefresh: {
    marginTop: space.sm,
    paddingVertical: 12,
    alignItems: "center",
  },
  fxRefreshText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flame,
  },
});
