import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CarTaxiFront,
  ChevronLeft,
  Clock,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "../components/brand";
import { Button, Chip, Field } from "../components/ui";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

type VehicleType = "ekonomi" | "konfor" | "vip";

const VEHICLE_TYPES: Array<{
  key: VehicleType;
  label: string;
  price: number;
  etaMin: number;
  etaMax: number;
}> = [
  { key: "ekonomi", label: "Ekonomi", price: 185, etaMin: 4, etaMax: 7 },
  { key: "konfor", label: "Konfor", price: 265, etaMin: 3, etaMax: 6 },
  { key: "vip", label: "VIP", price: 420, etaMin: 5, etaMax: 9 },
];

export default function TaxiDemoScreen() {
  const [pickup, setPickup] = useState("İstanbul, Kadıköy");
  const [destination, setDestination] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("ekonomi");
  const [calling, setCalling] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const selected = useMemo(
    () => VEHICLE_TYPES.find((v) => v.key === vehicleType) ?? VEHICLE_TYPES[0],
    [vehicleType],
  );

  const canCall = pickup.trim().length > 0 && destination.trim().length > 0;

  const handleCall = () => {
    if (!canCall) {
      Alert.alert("Eksik bilgi", "Lütfen varış noktasını girin.");
      return;
    }
    setCalling(true);
    setTimeout(() => {
      setCalling(false);
      Alert.alert(
        "Demo çağrı oluşturuldu",
        `${selected.label} taksi · ~${selected.etaMin}–${selected.etaMax} dk · ~${selected.price} ₺`,
        [
          { text: "Tamam" },
          {
            text: "Ana sayfa",
            onPress: () => router.replace("/(tabs)"),
          },
        ],
      );
    }, 700);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0A0A0A", "#141414", "#1A0F08"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Geri"
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <BrandMark size="sm" style={styles.headerPin} />
            <Text style={styles.headerTitle}>Taksi</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.sheet,
                { opacity: fade, transform: [{ translateY: rise }] },
              ]}
            >
              <View style={styles.badge}>
                <CarTaxiFront size={14} color={colors.flame} strokeWidth={2.2} />
                <Text style={styles.badgeText}>Demo çağrı</Text>
              </View>

              <Text style={styles.lead}>
                Nereden nereye? Tahmini ücret ve ETA anında hesaplanır.
              </Text>

              <View style={styles.fieldBlock}>
                <View style={styles.fieldIcon}>
                  <MapPin size={16} color={colors.flame} strokeWidth={2.2} />
                </View>
                <Field
                  label="Nereden"
                  value={pickup}
                  onChangeText={setPickup}
                  placeholder="Alış noktası"
                  containerStyle={styles.fieldFlex}
                />
              </View>

              <View style={styles.fieldBlock}>
                <View style={[styles.fieldIcon, styles.fieldIconDest]}>
                  <Navigation size={16} color={colors.ink} strokeWidth={2.2} />
                </View>
                <Field
                  label="Nereye"
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Varış noktası (örn. Taksim)"
                  containerStyle={styles.fieldFlex}
                />
              </View>

              <Text style={styles.sectionLabel}>Araç tipi</Text>
              <View style={styles.chipRow}>
                {VEHICLE_TYPES.map((v) => (
                  <Chip
                    key={v.key}
                    label={`${v.label} · ${v.price}₺`}
                    selected={vehicleType === v.key}
                    onPress={() => setVehicleType(v.key)}
                    style={styles.chip}
                  />
                ))}
              </View>

              <View style={styles.estimateCard}>
                <View style={styles.estimateRow}>
                  <View style={styles.estimateIcon}>
                    <Clock size={18} color={colors.flame} strokeWidth={2.2} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.estimateLabel}>Tahmini varış</Text>
                    <Text style={styles.estimateValue}>
                      {selected.etaMin}–{selected.etaMax} dakika
                    </Text>
                  </View>
                </View>
                <View style={styles.estimateDivider} />
                <View style={styles.estimateRow}>
                  <View style={styles.estimateIcon}>
                    <CarTaxiFront size={18} color={colors.flame} strokeWidth={2.2} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.estimateLabel}>Ücret tahmini</Text>
                    <Text style={styles.estimateValue}>
                      ~{selected.price.toLocaleString("tr-TR")} ₺
                    </Text>
                  </View>
                  <Text style={styles.estimateType}>{selected.label}</Text>
                </View>
              </View>

              <Button
                label="Taksi Çağır"
                variant="primary"
                loading={calling}
                disabled={!canCall}
                onPress={handleCall}
                style={styles.cta}
              />

              <Text style={styles.demoNote}>
                Bu bir demo akıştır — gerçek çağrı yapılmaz.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  flex: { flex: 1 },
  glow: {
    position: "absolute",
    bottom: -80,
    alignSelf: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255, 106, 0, 0.16)",
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerPin: {},
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxl,
  },
  sheet: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    padding: space.xl,
    ...shadow.card,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    marginBottom: space.md,
  },
  badgeText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.flameDeep,
  },
  lead: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    marginBottom: space.xl,
  },
  fieldBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  fieldIconDest: {
    backgroundColor: colors.mist,
    borderColor: colors.line,
  },
  fieldFlex: { flex: 1 },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: space.sm,
    marginTop: space.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: space.xl,
  },
  chip: { flexGrow: 0 },
  estimateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.xl,
    ...shadow.soft,
  },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  estimateIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  estimateLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  estimateValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
  },
  estimateType: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.flame,
  },
  estimateDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.md,
  },
  cta: {
    ...shadow.float,
  },
  demoNote: {
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: "center",
  },
});
