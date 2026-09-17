import { router } from "expo-router";
import {
  CarTaxiFront,
  ChevronRight,
  Droplets,
  Gavel,
  Globe,
  KeyRound,
  MapPin,
  Newspaper,
  Search,
  Share2,
  Tag,
  Users,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark, BrandWordmark } from "./brand";
import { SoftGradient } from "./SoftGradient";
import { MARKET_CITIES, useCityStore, type SelectedCity } from "../lib/city-store";
import {
  localeNativeName,
  supportedLocales,
  type LocaleCode,
} from "../lib/locales";
import { type AppMode, useModeStore } from "../lib/mode-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

type ModeDef = {
  key: AppMode;
  Icon: typeof Search;
  titleKey: string;
  hintKey: string;
  accent: string;
  soft: string;
  go: () => void;
  replace: () => void;
};

type ExtraDef = {
  key: string;
  Icon: typeof Search;
  titleKey: string;
  hintKey: string;
  go: () => void;
};

const PRIMARY: ModeDef[] = [
  {
    key: "buy",
    Icon: Search,
    titleKey: "hub.buy",
    hintKey: "modeSelect.hintBuy",
    accent: colors.flame,
    soft: colors.flameSoft,
    go: () => router.push("/(tabs)/search"),
    replace: () => router.replace("/(tabs)/search"),
  },
  {
    key: "rent",
    Icon: KeyRound,
    titleKey: "hub.rent",
    hintKey: "modeSelect.hintRent",
    accent: "#2A4A3A",
    soft: "#E8F2EC",
    go: () => router.push("/(tabs)/rentals"),
    replace: () => router.replace("/(tabs)/rentals"),
  },
  {
    key: "sell",
    Icon: Tag,
    titleKey: "hub.sell",
    hintKey: "modeSelect.hintSell",
    accent: "#4A2A12",
    soft: "#FFF1E6",
    go: () => router.push("/(tabs)/sell"),
    replace: () => router.replace("/(tabs)/sell"),
  },
  {
    key: "ride",
    Icon: CarTaxiFront,
    titleKey: "hub.ride",
    hintKey: "modeSelect.hintRide",
    accent: colors.ink,
    soft: "#F0F0F0",
    go: () => router.push("/taxi"),
    replace: () => router.replace("/taxi"),
  },
];

const EXTRAS: ExtraDef[] = [
  {
    key: "auctions",
    Icon: Gavel,
    titleKey: "home.auctions",
    hintKey: "modeSelect.hintAuctions",
    go: () => router.push("/auctions"),
  },
  {
    key: "wallet",
    Icon: Wallet,
    titleKey: "hub.pay",
    hintKey: "modeSelect.hintWallet",
    go: () => router.push("/wallet"),
  },
  {
    key: "wash",
    Icon: Droplets,
    titleKey: "hub.wash",
    hintKey: "modeSelect.hintWash",
    go: () => router.push("/car-wash"),
  },
  {
    key: "shared",
    Icon: Users,
    titleKey: "hub.sharedRide",
    hintKey: "modeSelect.hintShared",
    go: () => router.push("/shared-ride"),
  },
  {
    key: "guide",
    Icon: Newspaper,
    titleKey: "hub.guide",
    hintKey: "modeSelect.hintGuide",
    go: () => router.push("/guide"),
  },
  {
    key: "social",
    Icon: Share2,
    titleKey: "hub.socialAgency",
    hintKey: "modeSelect.hintSocial",
    go: () => router.push("/social-agency"),
  },
];

type Props = {
  variant?: "full" | "home";
  style?: StyleProp<ViewStyle>;
  onPicked?: (mode: AppMode) => void;
};

export function ModeSelect({ variant = "full", style, onPicked }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const choose = useModeStore((s) => s.choose);
  const city = useCityStore((s) => s.city);
  const setCity = useCityStore((s) => s.setCity);
  const isFull = variant === "full";
  const [prefsOpen, setPrefsOpen] = useState<"lang" | "city" | null>(null);

  const currentLocale = (
    supportedLocales.includes(i18n.language as LocaleCode)
      ? i18n.language
      : "tr"
  ) as LocaleCode;

  const pickMode = async (mode: ModeDef) => {
    await choose(mode.key);
    onPicked?.(mode.key);
    if (isFull) mode.replace();
    else mode.go();
  };

  const openExtra = async (extra: ExtraDef) => {
    await choose("buy");
    onPicked?.("buy");
    if (isFull) {
      if (extra.key === "auctions") router.replace("/auctions");
      else if (extra.key === "wallet") router.replace("/wallet");
      else if (extra.key === "wash") router.replace("/car-wash");
      else if (extra.key === "shared") router.replace("/shared-ride");
      else if (extra.key === "guide") router.replace("/guide");
      else router.replace("/(tabs)");
      return;
    }
    extra.go();
  };

  const body = (
    <>
      <SoftGradient
        colors={["#0A0A0A", "#0A0A0A"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <View style={styles.topPrefs}>
          <Pressable
            style={[styles.topChip, prefsOpen === "lang" && styles.topChipOn]}
            onPress={() => setPrefsOpen((v) => (v === "lang" ? null : "lang"))}
            hitSlop={4}
          >
            <Globe
              size={15}
              color={prefsOpen === "lang" ? colors.flame : colors.white}
              strokeWidth={2.3}
            />
            <Text style={styles.topChipText} numberOfLines={1}>
              {localeNativeName[currentLocale]}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.topChip, prefsOpen === "city" && styles.topChipOn]}
            onPress={() => setPrefsOpen((v) => (v === "city" ? null : "city"))}
            hitSlop={4}
          >
            <MapPin
              size={15}
              color={prefsOpen === "city" ? colors.flame : colors.white}
              strokeWidth={2.3}
            />
            <Text style={styles.topChipText} numberOfLines={1}>
              {city === "all" ? t("common.all") : city}
            </Text>
          </Pressable>
        </View>
      </View>

      {prefsOpen === "lang" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionRow}
        >
          {supportedLocales.map((loc) => {
            const selected = currentLocale === loc;
            return (
              <Pressable
                key={loc}
                style={[styles.optionChip, selected && styles.optionChipOn]}
                onPress={() => {
                  void i18n.changeLanguage(loc);
                  setPrefsOpen(null);
                }}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextOn]}>
                  {localeNativeName[loc]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {prefsOpen === "city" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionRow}
        >
          <Pressable
            style={[styles.optionChip, city === "all" && styles.optionChipOn]}
            onPress={() => {
              void setCity("all");
              setPrefsOpen(null);
            }}
          >
            <Text style={[styles.optionChipText, city === "all" && styles.optionChipTextOn]}>
              {t("common.all")}
            </Text>
          </Pressable>
          {MARKET_CITIES.map((c) => {
            const selected = city === c;
            return (
              <Pressable
                key={c}
                style={[styles.optionChip, selected && styles.optionChipOn]}
                onPress={() => {
                  void setCity(c as SelectedCity);
                  setPrefsOpen(null);
                }}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextOn]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={[styles.brandBlock, !isFull && styles.brandBlockHome]}>
        <BrandMark size={isFull ? 88 : 72} />
        <BrandWordmark script="latin" size={isFull ? 34 : 28} tone="light" />
        <Text style={styles.brandTag}>{t("modeSelect.tagline")}</Text>
      </View>

      <Text style={[styles.headline, !isFull && styles.headlineHome]}>
        {t("modeSelect.title")}
      </Text>
      <Text style={[styles.sub, !isFull && styles.subHome]}>
        {t("modeSelect.subtitle")}
      </Text>

      <Text style={styles.carouselLabel}>{t("modeSelect.primaryServices")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselRow}
        style={styles.carousel}
        decelerationRate="fast"
        snapToInterval={168}
      >
        {PRIMARY.map((m) => (
          <Pressable
            key={m.key}
            style={({ pressed }) => [styles.slideCard, pressed && styles.pressed]}
            onPress={() => void pickMode(m)}
          >
            <View style={[styles.slideIcon, { backgroundColor: m.soft }]}>
              <m.Icon
                size={30}
                color={m.accent === colors.ink ? colors.ink : m.accent}
                strokeWidth={2.4}
              />
            </View>
            <Text style={styles.slideTitle}>{t(m.titleKey)}</Text>
            <Text style={styles.slideHint} numberOfLines={2}>
              {t(m.hintKey)}
            </Text>
            <View style={styles.slideGo}>
              <ChevronRight size={16} color={colors.white} strokeWidth={2.4} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.carouselLabel}>{t("modeSelect.moreServices")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselRow}
        style={styles.carousel}
        decelerationRate="fast"
        snapToInterval={148}
      >
        {EXTRAS.map((e) => (
          <Pressable
            key={e.key}
            style={({ pressed }) => [styles.extraSlide, pressed && styles.pressed]}
            onPress={() => void openExtra(e)}
          >
            <View style={styles.extraIcon}>
              <e.Icon size={26} color={colors.flame} strokeWidth={2.4} />
            </View>
            <Text style={styles.extraTitle} numberOfLines={1}>
              {t(e.titleKey)}
            </Text>
            <Text style={styles.extraHint} numberOfLines={2}>
              {t(e.hintKey)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isFull ? (
        <Pressable
          style={styles.skip}
          onPress={() => {
            void choose("buy");
            router.replace("/(tabs)");
          }}
        >
          <Text style={styles.skipText}>{t("modeSelect.browseListings")}</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (isFull) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, flex: 1 }, style]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.rootHome, { paddingTop: insets.top + 12 }, style]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.ink,
    overflow: "hidden",
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingBottom: space.xxl,
    flexGrow: 1,
  },
  rootHome: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: space.xl,
    marginBottom: space.sm,
  },
  topBarSpacer: { flex: 1 },
  topPrefs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "78%",
  },
  topChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  topChipOn: {
    borderColor: "rgba(255,106,0,0.55)",
    backgroundColor: "rgba(255,106,0,0.14)",
  },
  topChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
    flexShrink: 1,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: space.lg,
    gap: 8,
    width: "100%",
    paddingHorizontal: space.xl,
  },
  brandBlockHome: {
    marginBottom: space.md,
  },
  brandTag: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.white,
    letterSpacing: -0.6,
    marginBottom: 6,
    textAlign: "center",
    paddingHorizontal: space.xl,
  },
  headlineHome: {
    fontSize: 24,
    lineHeight: 30,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.62)",
    marginBottom: space.lg,
    textAlign: "center",
    alignSelf: "center",
    maxWidth: 320,
    paddingHorizontal: space.xl,
  },
  subHome: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: space.md,
  },
  carouselLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    marginBottom: 10,
    letterSpacing: 0.3,
    paddingHorizontal: space.xl,
  },
  carousel: {
    marginBottom: space.lg,
  },
  carouselRow: {
    paddingHorizontal: space.xl,
    gap: 12,
  },
  slideCard: {
    width: 156,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 14,
    minHeight: 168,
    ...shadow.card,
  },
  slideIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  slideTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  slideHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
    marginBottom: 12,
    flexGrow: 1,
  },
  slideGo: {
    alignSelf: "flex-start",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
  },
  extraSlide: {
    width: 136,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.xl,
    padding: 14,
    minHeight: 148,
  },
  extraIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,106,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  extraTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
    marginBottom: 4,
  },
  extraHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(255,255,255,0.52)",
  },
  optionRow: {
    paddingHorizontal: space.xl,
    gap: 8,
    marginBottom: space.md,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  optionChipOn: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  optionChipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.white,
  },
  optionChipTextOn: {
    color: colors.white,
    fontFamily: fonts.bodySemi,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  skip: {
    marginTop: space.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  skipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameMid,
  },
});
