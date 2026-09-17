import { SoftGradient as LinearGradient } from "../components/SoftGradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Car, CarTaxiFront, ChevronLeft, KeyRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark, BrandWordmark } from "../components/brand";
import { Button } from "../components/ui/Button";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const SERVICES = [
  {
    key: "sell",
    label: "Satış",
    hint: "Al · sat",
    Icon: Car,
  },
  {
    key: "rent",
    label: "Kiralama",
    hint: "Günlük · uzun dönem",
    Icon: KeyRound,
  },
  {
    key: "taxi",
    label: "Taksi",
    hint: "Yakında",
    Icon: CarTaxiFront,
  },
] as const;

export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.ink, "#141414", colors.paper]}
        locations={[0, 0.4, 0.78]}
        style={styles.heroWash}
      />

      <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Geri"
          style={styles.back}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <BrandMark size="lg" style={styles.logo} />
            <BrandWordmark script="latin" size={34} tone="light" />
            <Text style={styles.tagline}>{t("app.tagline")}</Text>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.sectionTitle}>{t("profile.about")}</Text>
            <Text style={styles.copy}>
              Seyyare; araç satış, kiralama ve yakında taksi çağırma ile tek
              uygulama altında güvenli bir mobilite pazarıdır.
            </Text>

            <View style={styles.serviceRow}>
              {SERVICES.map((s) => {
                const Icon = s.Icon;
                return (
                  <View key={s.key} style={styles.serviceTile}>
                    <View style={styles.serviceIcon}>
                      <Icon size={20} color={colors.flame} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.serviceLabel}>{s.label}</Text>
                    <Text style={styles.serviceHint}>{s.hint}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.version}>Sürüm 0.1.0</Text>

            <Button
              label={t("common.back")}
              variant="ink"
              onPress={() => router.back()}
              style={styles.backBtn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    height: 380,
  },
  back: {
    marginLeft: space.xl,
    marginTop: space.sm,
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingBottom: space.section },
  brand: {
    alignItems: "center",
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    paddingHorizontal: space.xl,
  },
  logo: {
    marginBottom: 12,
  },
  tagline: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
    minHeight: 360,
    ...shadow.soft,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: space.sm,
  },
  copy: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
    marginBottom: space.xxl,
  },
  serviceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: space.xxl,
  },
  serviceTile: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
    textAlign: "center",
  },
  serviceHint: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: "center",
  },
  version: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: "center",
    marginBottom: space.xl,
  },
  backBtn: { alignSelf: "stretch" },
});
