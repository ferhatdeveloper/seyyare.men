import { router } from "expo-router";
import {
  Car,
  Clock,
  Droplets,
  MapPin,
  Sparkles,
} from "lucide-react-native";
import { useMemo, useState } from "react";
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

import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { useCurrencyStore } from "../lib/currency-store";
import { TAXI_METHODS, type PayMethodId } from "../lib/payment-methods";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

type WashPackage = "exterior" | "full" | "detail";
type VehicleSize = "sedan" | "suv" | "van";

const PACKAGES: Array<{
  key: WashPackage;
  price: number;
  etaMin: number;
}> = [
  { key: "exterior", price: 25_000, etaMin: 35 },
  { key: "full", price: 45_000, etaMin: 55 },
  { key: "detail", price: 85_000, etaMin: 90 },
];

const SIZES: VehicleSize[] = ["sedan", "suv", "van"];

const SLOTS = ["Bugün · 14:00", "Bugün · 17:00", "Yarın · 10:00", "Yarın · 16:00"];

const SIZE_MULTIPLIER: Record<VehicleSize, number> = {
  sedan: 1,
  suv: 1.25,
  van: 1.4,
};

export default function CarWashScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [pkg, setPkg] = useState<WashPackage>("full");
  const [size, setSize] = useState<VehicleSize>("sedan");
  const [slot, setSlot] = useState(SLOTS[0]);
  const [address, setAddress] = useState("Erbil, Ankawa");
  const [note, setNote] = useState("");
  const [pay, setPay] = useState<PayMethodId>("fastpay");
  const [submitting, setSubmitting] = useState(false);

  const selected = PACKAGES.find((p) => p.key === pkg) ?? PACKAGES[1];
  const total = useMemo(
    () => Math.round(selected.price * SIZE_MULTIPLIER[size]),
    [selected.price, size],
  );

  const requestWash = () => {
    if (!address.trim()) {
      Alert.alert(t("wash.addressRequired"));
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        t("wash.requestedTitle"),
        t("wash.requestedBody", {
          package: t(`wash.packages.${pkg}`),
          amount: formatListing(total, "IQD"),
          slot,
        }),
        [
          { text: t("common.done") },
          { text: t("tabs.home"), onPress: () => router.replace("/(tabs)") },
        ],
      );
    }, 600);
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("wash.title")}
        subtitle={t("wash.subtitle")}
        onBack={() => router.back()}
        right={<Droplets size={18} color={colors.flame} strokeWidth={2} />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Droplets size={22} color={colors.white} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>{t("wash.doorToDoor")}</Text>
            <Text style={styles.heroSub}>{t("wash.heroHint")}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t("wash.package")}</Text>
        <View style={styles.pkgRow}>
          {PACKAGES.map((p) => {
            const on = pkg === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.pkgCard, on && styles.pkgCardOn]}
                onPress={() => setPkg(p.key)}
                activeOpacity={0.9}
              >
                <Text style={[styles.pkgName, on && styles.pkgNameOn]}>
                  {t(`wash.packages.${p.key}`)}
                </Text>
                <Text style={[styles.pkgPrice, on && styles.pkgPriceOn]}>
                  {formatListing(p.price, "IQD")}
                </Text>
                <View style={styles.pkgEta}>
                  <Clock size={11} color={on ? colors.white : colors.inkFaint} />
                  <Text style={[styles.pkgEtaText, on && styles.pkgEtaOn]}>
                    ~{p.etaMin} {t("wash.min")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>{t("wash.vehicleSize")}</Text>
        <View style={styles.chipRow}>
          {SIZES.map((s) => (
            <Chip
              key={s}
              label={t(`wash.sizes.${s}`)}
              selected={size === s}
              onPress={() => setSize(s)}
              icon={
                <Car
                  size={14}
                  color={size === s ? colors.white : colors.flame}
                  strokeWidth={2}
                />
              }
            />
          ))}
        </View>

        <Text style={styles.section}>{t("wash.when")}</Text>
        <View style={styles.chipRow}>
          {SLOTS.map((s) => (
            <Chip key={s} label={s} selected={slot === s} onPress={() => setSlot(s)} />
          ))}
        </View>

        <Text style={styles.section}>{t("wash.address")}</Text>
        <View style={styles.field}>
          <MapPin size={16} color={colors.flame} strokeWidth={2.2} />
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder={t("wash.addressPlaceholder")}
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        <Text style={styles.section}>{t("wash.note")}</Text>
        <TextInput
          style={styles.note}
          value={note}
          onChangeText={setNote}
          placeholder={t("wash.notePlaceholder")}
          placeholderTextColor={colors.inkFaint}
          multiline
        />

        <Text style={styles.section}>{t("wallet.payMethod")}</Text>
        <View style={styles.chipRow}>
          {TAXI_METHODS.slice(0, 5).map((m) => (
            <Chip
              key={m.id}
              label={m.brand}
              selected={pay === m.id}
              onPress={() => setPay(m.id)}
            />
          ))}
        </View>

        <View style={styles.summary}>
          <Sparkles size={16} color={colors.flame} strokeWidth={2.2} />
          <View style={styles.flex}>
            <Text style={styles.summaryLabel}>{t("wash.total")}</Text>
            <Text style={styles.summaryHint}>
              {t(`wash.packages.${pkg}`)} · {t(`wash.sizes.${size}`)} · {slot}
            </Text>
          </View>
          <Text style={styles.summaryPrice}>{formatListing(total, "IQD")}</Text>
        </View>

        <Button
          label={t("wash.request")}
          variant="primary"
          loading={submitting}
          onPress={requestWash}
          style={styles.cta}
        />
        <Text style={styles.demoNote}>{t("wash.demoNote")}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.sm,
  },
  flex: { flex: 1 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: space.lg,
    marginBottom: space.sm,
    ...shadow.soft,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.white,
  },
  heroSub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 17,
  },
  section: {
    marginTop: space.md,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  pkgRow: { flexDirection: "row", gap: 8 },
  pkgCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 4,
  },
  pkgCardOn: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  pkgName: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  pkgNameOn: { color: colors.white },
  pkgPrice: {
    fontFamily: fonts.displayMed,
    fontSize: 14,
    color: colors.flameDeep,
  },
  pkgPriceOn: { color: colors.white },
  pkgEta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  pkgEtaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  pkgEtaOn: { color: "rgba(255,255,255,0.85)" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  note: {
    minHeight: 72,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: "top",
  },
  summary: {
    marginTop: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.flameSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    padding: space.md,
  },
  summaryLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  summaryHint: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  summaryPrice: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.flameDeep,
  },
  cta: { marginTop: space.md },
  demoNote: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: space.sm,
  },
});
