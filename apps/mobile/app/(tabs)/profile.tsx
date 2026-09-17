import { router, useFocusEffect } from "expo-router";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import {
  Bell,
  Bookmark,
  CarTaxiFront,
  ChevronRight,
  Cpu,
  Droplets,
  Gavel,
  Globe,
  Heart,
  Info,
  LayoutGrid,
  Megaphone,
  Server,
  Share2,
  Store,
  Users,
  Wallet,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useApiBaseStore } from "../../lib/api-base-store";
import { auth, type StoredUser, type UserGender } from "../../lib/auth";
import {
  type AppCurrency,
  useCurrencyStore,
} from "../../lib/currency-store";
import { iqdPerUsd } from "../../lib/hatwan-rates";
import { localeNativeName, supportedLocales, type LocaleCode } from "../../lib/locales";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [currentLocale, setCurrentLocale] = useState<LocaleCode>(
    i18n.language as LocaleCode,
  );
  const displayCurrency = useCurrencyStore((s) => s.display);
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplay);
  const quote = useCurrencyStore((s) => s.quote);
  const refreshRates = useCurrencyStore((s) => s.refreshRates);
  const midRate = quote ? iqdPerUsd(quote, "mid") : null;
  const gateway = useApiBaseStore((s) => s.gateway);
  const override = useApiBaseStore((s) => s.override);
  const setOverride = useApiBaseStore((s) => s.setOverride);
  const resetOverride = useApiBaseStore((s) => s.resetOverride);
  const [apiDraft, setApiDraft] = useState(gateway);

  useEffect(() => {
    void auth.getUser().then(setUser);
  }, []);

  useEffect(() => {
    setApiDraft(gateway);
  }, [gateway]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, []),
  );

  const changeLocale = (locale: LocaleCode) => {
    void i18n.changeLanguage(locale);
    setCurrentLocale(locale);
  };

  const saveApiAddress = async () => {
    const next = apiDraft.trim();
    if (!next) {
      await resetOverride();
      return;
    }
    await setOverride(next);
    Alert.alert(t("profile.apiAddress"), t("profile.apiAddressSaved"));
  };

  const initial = (user?.email ?? user?.phone ?? "U").charAt(0).toUpperCase();

  return (
    <Screen edges={["top"]}>
      <StatusBar style="light" />
      <ScreenHeader title={t("profile.title")} subtitle={t("app.tagline")} large />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.accountBlock}>
          {user ? (
            <View style={styles.userCard}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
              <View style={styles.userMeta}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.email ?? user.phone}
                </Text>
                <Badge
                  label={user.role === "dealer" ? "Dealer" : "User"}
                  tone={user.role === "dealer" ? "viridian" : "mist"}
                  style={styles.roleBadge}
                />
              </View>
            </View>
          ) : (
            <View style={styles.guestCard}>
              <Text style={styles.guestTitle}>Giriş yap, favorilerini kaydet</Text>
              <Text style={styles.guestSub}>
                İlanlarını takip et, aramalarını sakla.
              </Text>
              <View style={styles.guestActions}>
                <Button
                  label={t("auth.login")}
                  variant="primary"
                  style={styles.guestBtn}
                  onPress={() => router.push("/auth/login")}
                />
                <Button
                  label={t("auth.register")}
                  variant="soft"
                  style={styles.guestBtn}
                  onPress={() => router.push("/auth/register")}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.genderSection}>
          <View style={styles.apiHeader}>
            <Server size={18} color={colors.flame} strokeWidth={2} />
            <Text style={[styles.genderTitle, styles.apiTitle]}>{t("profile.apiAddress")}</Text>
          </View>
          <Text style={styles.genderHint}>{t("profile.apiAddressHint")}</Text>
          <TextInput
            value={apiDraft}
            onChangeText={setApiDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={t("profile.apiAddressPlaceholder")}
            placeholderTextColor={colors.inkFaint}
            style={styles.apiInput}
          />
          {override ? (
            <Text style={styles.apiOverrideNote} numberOfLines={1}>
              override · {override}
            </Text>
          ) : null}
          <View style={styles.apiActions}>
            <Button
              label={t("common.save")}
              variant="primary"
              style={styles.apiBtn}
              onPress={() => void saveApiAddress()}
            />
            <Button
              label={t("profile.apiAddressReset")}
              variant="soft"
              style={styles.apiBtn}
              onPress={() => void resetOverride()}
            />
          </View>
        </View>

        {user ? (
          <View style={styles.genderSection}>
            <Text style={styles.genderTitle}>{t("gender.label")}</Text>
            <Text style={styles.genderHint}>{t("gender.hint")}</Text>
            <View style={styles.genderChips}>
              {(
                [
                  ["female", t("gender.female")],
                  ["male", t("gender.male")],
                  ["unspecified", t("gender.unspecified")],
                ] as Array<[UserGender, string]>
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={user.gender === value}
                  onPress={async () => {
                    const next = await auth.updateUser({ gender: value });
                    if (next) setUser(next);
                  }}
                  style={
                    user.gender === value
                      ? styles.localeChipActive
                      : styles.localeChip
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.genderSection}>
          <Text style={styles.genderTitle}>{t("currency.label")}</Text>
          <Text style={styles.genderHint}>{t("currency.hatwanSource")}</Text>
          {midRate ? (
            <Text style={styles.genderHint}>
              {t("currency.hatwanMid", {
                rate: midRate.toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                }),
              })}
            </Text>
          ) : null}
          <View style={styles.genderChips}>
            {(["IQD", "USD"] as AppCurrency[]).map((c) => (
              <Chip
                key={c}
                label={c === "IQD" ? t("currency.iqd") : t("currency.usd")}
                selected={displayCurrency === c}
                onPress={() => void setDisplayCurrency(c)}
                style={
                  displayCurrency === c
                    ? styles.localeChipActive
                    : styles.localeChip
                }
              />
            ))}
            <Chip
              label={t("currency.refresh")}
              onPress={() => void refreshRates(true)}
              style={styles.localeChip}
            />
          </View>
        </View>

        <SectionHeader title={t("profile.sectionAccount")} />
        <View style={styles.menu}>
          <MenuItem
            icon={<LayoutGrid size={20} color={colors.flame} strokeWidth={2} />}
            label={t("modeSelect.changeMode")}
            onPress={() => router.push("/(tabs)/services")}
          />
          <MenuItem
            icon={<Heart size={20} color={colors.flame} strokeWidth={2} />}
            label={t("profile.favorites")}
            onPress={() => router.push("/favorites")}
          />
          <MenuItem
            icon={<Bookmark size={20} color={colors.inkMuted} strokeWidth={2} />}
            label={t("profile.savedSearches")}
            onPress={() => router.push("/saved-searches")}
          />
          <MenuItem
            icon={<Bell size={20} color={colors.inkMuted} strokeWidth={2} />}
            label={t("profile.notifications")}
            last
            onPress={() => router.push("/notifications")}
          />
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title={t("profile.sectionServices")} />
        </View>
        <View style={styles.menu}>
          <MenuItem
            icon={<Wallet size={20} color={colors.flame} strokeWidth={2} />}
            label={t("hub.pay")}
            onPress={() => router.push("/wallet")}
          />
          <MenuItem
            icon={<Gavel size={20} color={colors.flame} strokeWidth={2} />}
            label={t("auction.title")}
            onPress={() => router.push("/auctions")}
          />
          <MenuItem
            icon={<Droplets size={20} color={colors.flame} strokeWidth={2} />}
            label={t("hub.wash")}
            onPress={() => router.push("/car-wash")}
          />
          <MenuItem
            icon={<Users size={20} color={colors.flame} strokeWidth={2} />}
            label={t("hub.sharedRide")}
            last
            onPress={() => router.push("/shared-ride")}
          />
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title={t("profile.sectionBusiness")} />
        </View>
        <View style={styles.menu}>
          <MenuItem
            icon={<Store size={20} color={colors.flame} strokeWidth={2} />}
            label={t("partner.title")}
            onPress={() => router.push("/partner")}
          />
          <MenuItem
            icon={<Megaphone size={20} color={colors.flame} strokeWidth={2} />}
            label={t("hub.boost")}
            onPress={() => router.push("/boost")}
          />
          <MenuItem
            icon={<Share2 size={20} color={colors.flame} strokeWidth={2} />}
            label={t("hub.socialAgency")}
            onPress={() => router.push("/social-agency")}
          />
          <MenuItem
            icon={<CarTaxiFront size={20} color={colors.flame} strokeWidth={2} />}
            label={t("driver.title")}
            last
            onPress={() => router.push("/driver")}
          />
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title={t("profile.sectionMore")} />
        </View>
        <View style={styles.menu}>
          <MenuItem
            icon={<Cpu size={20} color={colors.viridian} strokeWidth={2} />}
            label="Agent Inspector"
            accent
            onPress={() => router.push("/agents")}
          />
          <MenuItem
            icon={<Info size={20} color={colors.inkMuted} strokeWidth={2} />}
            label={t("profile.about")}
            last
            onPress={() => router.push("/about")}
          />
        </View>

        <View style={styles.localeSection}>
          <View style={styles.localeHeader}>
            <Globe size={18} color={colors.flame} strokeWidth={2} />
            <Text style={styles.localeTitle}>{t("profile.language")}</Text>
          </View>
          <View style={styles.localeChips}>
            {supportedLocales.map((loc) => (
              <Chip
                key={loc}
                label={localeNativeName[loc]}
                selected={currentLocale === loc}
                onPress={() => changeLocale(loc)}
                style={
                  currentLocale === loc
                    ? styles.localeChipActive
                    : styles.localeChip
                }
              />
            ))}
          </View>
        </View>

        {user ? (
          <Button
            label={t("auth.logout")}
            variant="danger"
            style={styles.logoutBtn}
            onPress={async () => {
              await auth.clear();
              setUser(null);
            }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  accent,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, last && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, accent && styles.menuIconAccent]}>{icon}</View>
      <Text style={[styles.menuLabel, accent && styles.menuLabelAccent]}>{label}</Text>
      <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: space.section + 8 },

  accountBlock: {
    paddingHorizontal: space.xl,
    marginBottom: space.xl,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.flame,
    marginRight: space.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.flameDeep,
  },
  userMeta: { flex: 1, minWidth: 0 },
  userName: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  roleBadge: { alignSelf: "flex-start" },

  guestCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  guestTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  guestSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 4,
    marginBottom: space.md,
  },
  guestActions: {
    flexDirection: "row",
    gap: space.sm,
  },
  guestBtn: { flex: 1 },

  genderSection: {
    marginHorizontal: space.xl,
    marginBottom: space.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.soft,
  },
  genderTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
  genderHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: space.md,
    lineHeight: 16,
  },
  genderChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  apiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  apiTitle: {
    marginBottom: 0,
    marginLeft: space.sm,
  },
  apiInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.mist,
    marginBottom: space.sm,
  },
  apiOverrideNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.viridianDeep,
    marginBottom: space.sm,
  },
  apiActions: {
    flexDirection: "row",
    gap: space.sm,
  },
  apiBtn: { flex: 1 },

  sectionGap: {
    marginTop: space.xl,
  },
  menu: {
    marginHorizontal: space.xl,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconAccent: { backgroundColor: colors.flameSoft },
  menuLabel: {
    flex: 1,
    marginLeft: space.md,
    fontFamily: fonts.bodyMed,
    fontSize: 15,
    color: colors.ink,
  },
  menuLabelAccent: {
    fontFamily: fonts.bodySemi,
    color: colors.viridianDeep,
  },

  localeSection: {
    marginTop: space.xxl,
    paddingHorizontal: space.xl,
  },
  localeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.md,
  },
  localeTitle: {
    marginLeft: space.sm,
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  localeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  localeChip: {},
  localeChipActive: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },

  logoutBtn: {
    marginHorizontal: space.xl,
    marginTop: space.section,
  },
});
