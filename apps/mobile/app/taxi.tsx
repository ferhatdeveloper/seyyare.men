import { SoftGradient as LinearGradient } from "../components/SoftGradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CarTaxiFront,
  ChevronLeft,
  Clock,
  MapPin,
  Navigation,
  Plane,
  Users,
  UserRound,
  Wallet,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BrandMark } from "../components/brand";
import { MapPlaceholder } from "../components/MapPlaceholder";
import { Button, Chip, Field } from "../components/ui";
import { api } from "../lib/api";
import { orchestrator } from "../lib/clients";
import {
  TAXI_METHODS,
  getPayMethod,
  isPayMethodId,
  type PayMethodId,
} from "../lib/payment-methods";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

type VehicleType = "ekonomi" | "konfor" | "vip";
type RideMode = "city" | "shared" | "airport";

type MatchedDriver = {
  id: string;
  name: string;
  etaMin: number;
  distanceM: number;
  source: "rpc" | "dispatch" | "demo";
};

/** Baghdad city-center defaults when coords are unknown */
const BAGHDAD = { lat: 33.3152, lng: 44.3661 };
const BAGHDAD_DROPOFF = { lat: 33.3123, lng: 44.4 };

const VEHICLE_TYPES: Array<{
  key: VehicleType;
  label: string;
  price: number;
  sharedPrice: number;
  airportPrice: number;
  etaMin: number;
  etaMax: number;
}> = [
  { key: "ekonomi", label: "Ekonomi", price: 185, sharedPrice: 95, airportPrice: 420, etaMin: 4, etaMax: 7 },
  { key: "konfor", label: "Konfor", price: 265, sharedPrice: 140, airportPrice: 580, etaMin: 3, etaMax: 6 },
  { key: "vip", label: "VIP", price: 420, sharedPrice: 220, airportPrice: 890, etaMin: 5, etaMax: 9 },
];

function resolveMode(raw?: string): RideMode {
  if (raw === "airport" || raw === "shared") return raw;
  return "city";
}

function priceFor(mode: RideMode, v: (typeof VEHICLE_TYPES)[number]) {
  if (mode === "airport") return v.airportPrice;
  if (mode === "shared") return v.sharedPrice;
  return v.price;
}

/** Parse "lat,lng" from free text; otherwise Baghdad defaults. */
function coordsFromLabel(label: string, fallback: { lat: number; lng: number }) {
  const m = label.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return fallback;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fallback;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return fallback;
  return { lat, lng };
}

function etaFromDistanceM(distanceM: number, fallbackMin: number): number {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return fallbackMin;
  // ~25 km/h city crawl → minutes; clamp 2–15
  return Math.min(15, Math.max(2, Math.round(distanceM / 420)));
}

function newDemoRideId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // UUID-shaped fallback for orchestrator z.uuid() validation
  const s = `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return s;
}

function demoDriver(etaMin: number): MatchedDriver {
  return {
    id: "demo-driver-1",
    name: "Ahmed K.",
    etaMin,
    distanceM: 920,
    source: "demo",
  };
}

async function enqueueOrchestratorDispatch(payload: {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
}): Promise<boolean> {
  try {
    const res = await fetch(`${orchestrator.url}/rides/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok || res.status === 202;
  } catch {
    return false;
  }
}

async function findNearbyDriver(
  lat: number,
  lng: number,
  fallbackEta: number,
): Promise<MatchedDriver | null> {
  try {
    const rows = await api.rpc<
      Array<{
        user_id?: string;
        distance_m?: number;
        display_name?: string;
        eta_min?: number;
      }>
    >("nearby_drivers", {
      lat,
      lng,
      radius_m: 5000,
      p_limit: 5,
    });
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first?.user_id) return null;
    const distanceM = Number(first.distance_m ?? 920);
    return {
      id: String(first.user_id),
      name: first.display_name?.trim() || `Sürücü ${String(first.user_id).slice(0, 6)}`,
      etaMin: Number(first.eta_min) || etaFromDistanceM(distanceM, fallbackEta),
      distanceM,
      source: "rpc",
    };
  } catch {
    return null;
  }
}

export default function TaxiDemoScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; pay?: string }>();
  const initialMode = resolveMode(params.mode);
  const initialPay: PayMethodId = isPayMethodId(params.pay) ? params.pay : "cash";

  const [mode, setMode] = useState<RideMode>(initialMode);
  const [pickup, setPickup] = useState(
    initialMode === "airport" ? "Erbil International Airport" : "Erbil, Downtown",
  );
  const [destination, setDestination] = useState(
    initialMode === "airport" ? "Erbil, Ankawa" : "",
  );
  const [vehicleType, setVehicleType] = useState<VehicleType>("ekonomi");
  const [payMethod, setPayMethod] = useState<PayMethodId>(initialPay);
  const [calling, setCalling] = useState(false);
  const [matched, setMatched] = useState<MatchedDriver | null>(null);
  const [rideId, setRideId] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  useEffect(() => {
    const next = resolveMode(params.mode);
    setMode(next);
    if (next === "airport") {
      setPickup("Erbil International Airport");
      setDestination((d) => (d.trim() ? d : "Erbil, Ankawa"));
    }
    if (isPayMethodId(params.pay)) {
      setPayMethod(params.pay);
    }
  }, [params.mode, params.pay]);

  const selected = useMemo(
    () => VEHICLE_TYPES.find((v) => v.key === vehicleType) ?? VEHICLE_TYPES[0],
    [vehicleType],
  );

  const price = priceFor(mode, selected);
  const canCall = pickup.trim().length > 0 && destination.trim().length > 0;

  const modeLabel =
    mode === "airport"
      ? t("ride.modes.airport")
      : mode === "shared"
        ? t("ride.modes.shared")
        : t("ride.modes.city");

  const applyMode = (next: RideMode) => {
    setMode(next);
    if (next === "airport") {
      setPickup("Erbil International Airport");
      if (!destination.trim()) setDestination("Erbil, Ankawa");
    }
  };

  const showMatchSuccess = (driver: MatchedDriver, id: string | null) => {
    const payLabel = getPayMethod(payMethod).brand;
    Alert.alert(
      t("ride.matchedTitle"),
      `${driver.name} · ~${driver.etaMin} ${t("ride.minutes")} · ${modeLabel} · ${selected.label} · ~${price.toLocaleString("tr-TR")} IQD · ${payLabel}${id ? `\n#${id.slice(0, 8)}` : ""}`,
      [
        { text: t("common.done") },
        {
          text: t("ride.goHome"),
          onPress: () => router.replace("/(tabs)"),
        },
      ],
    );
  };

  const handleCall = async () => {
    if (!canCall) {
      Alert.alert(t("ride.missingTitle"), t("ride.missingBody"));
      return;
    }
    setCalling(true);
    setMatched(null);
    try {
      const from = coordsFromLabel(pickup, BAGHDAD);
      const to = coordsFromLabel(destination, BAGHDAD_DROPOFF);
      const ride = await api.rpc<{ id?: string; status?: string } | null>("request_ride", {
        p_pickup_lat: from.lat,
        p_pickup_lng: from.lng,
        p_dropoff_lat: to.lat,
        p_dropoff_lng: to.lng,
        p_gender_pref: null,
      });

      const id =
        ride && typeof ride === "object" && typeof ride.id === "string"
          ? ride.id
          : newDemoRideId();
      setRideId(id);

      // Fire-and-forget orchestrator dispatch (BullMQ → match_ride)
      const dispatched = await enqueueOrchestratorDispatch({
        rideId: id,
        pickupLat: from.lat,
        pickupLng: from.lng,
      });

      // Client-side nearby match for immediate UI (demo fallback OK)
      const nearby =
        (await findNearbyDriver(from.lat, from.lng, selected.etaMin)) ??
        demoDriver(selected.etaMin);

      const driver: MatchedDriver = dispatched
        ? { ...nearby, source: nearby.source === "demo" ? "dispatch" : nearby.source }
        : nearby;

      setMatched(driver);
      showMatchSuccess(driver, id);
    } catch {
      const driver = demoDriver(selected.etaMin);
      const id = newDemoRideId();
      setMatched(driver);
      setRideId(id);
      showMatchSuccess(driver, id);
    } finally {
      setCalling(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Map plane — top ~45% */}
      <View style={styles.mapPane}>
        <MapPlaceholder
          pickupLabel={pickup}
          destinationLabel={destination}
          regionLabel="Baghdad"
        />
        <LinearGradient
          colors={["rgba(10,10,10,0.55)", "transparent"]}
          style={styles.mapScrim}
          pointerEvents="none"
        />
        <SafeAreaView style={styles.mapHeader} edges={["top"]}>
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              style={styles.back}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <ChevronLeft size={22} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <BrandMark size="sm" style={styles.headerPin} />
              <Text style={styles.headerTitle}>{t("hub.ride")}</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom sheet over map */}
      <KeyboardAvoidingView
        style={styles.sheetHost}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, space.lg),
              opacity: fade,
              transform: [{ translateY: rise }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={styles.modeRow}>
              <Chip
                label={t("ride.modes.city")}
                selected={mode === "city"}
                onPress={() => applyMode("city")}
                icon={
                  <CarTaxiFront
                    size={14}
                    color={mode === "city" ? colors.white : colors.flame}
                    strokeWidth={2}
                  />
                }
              />
              <Chip
                label={t("ride.modes.shared")}
                selected={mode === "shared"}
                onPress={() => applyMode("shared")}
                icon={
                  <Users
                    size={14}
                    color={mode === "shared" ? colors.white : colors.flame}
                    strokeWidth={2}
                  />
                }
              />
              <Chip
                label={t("ride.modes.airport")}
                selected={mode === "airport"}
                onPress={() => applyMode("airport")}
                icon={
                  <Plane
                    size={14}
                    color={mode === "airport" ? colors.white : colors.flame}
                    strokeWidth={2}
                  />
                }
              />
            </View>

            <View style={styles.badge}>
              {mode === "airport" ? (
                <Plane size={14} color={colors.flame} strokeWidth={2.2} />
              ) : mode === "shared" ? (
                <Users size={14} color={colors.flame} strokeWidth={2.2} />
              ) : (
                <CarTaxiFront size={14} color={colors.flame} strokeWidth={2.2} />
              )}
              <Text style={styles.badgeText}>{t(`ride.badge.${mode}`)}</Text>
            </View>

            <Text style={styles.lead}>{t(`ride.lead.${mode}`)}</Text>

            <View style={styles.fieldBlock}>
              <View style={styles.fieldIcon}>
                <MapPin size={16} color={colors.flame} strokeWidth={2.2} />
              </View>
              <Field
                label={t("ride.from")}
                value={pickup}
                onChangeText={setPickup}
                placeholder={t("ride.fromPlaceholder")}
                containerStyle={styles.fieldFlex}
              />
            </View>

            <View style={styles.fieldBlock}>
              <View style={[styles.fieldIcon, styles.fieldIconDest]}>
                <Navigation size={16} color={colors.ink} strokeWidth={2.2} />
              </View>
              <Field
                label={t("ride.to")}
                value={destination}
                onChangeText={setDestination}
                placeholder={t("ride.toPlaceholder")}
                containerStyle={styles.fieldFlex}
              />
            </View>

            <Text style={styles.sectionLabel}>{t("ride.vehicleType")}</Text>
            <View style={styles.chipRow}>
              {VEHICLE_TYPES.map((v) => {
                const p = priceFor(mode, v);
                return (
                  <Chip
                    key={v.key}
                    label={`${v.label} · ${p}`}
                    selected={vehicleType === v.key}
                    onPress={() => setVehicleType(v.key)}
                    style={styles.chip}
                  />
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>{t("ride.payment")}</Text>
            <View style={styles.chipRow}>
              {TAXI_METHODS.map((m) => (
                <Chip
                  key={m.id}
                  label={m.brand}
                  selected={payMethod === m.id}
                  onPress={() => setPayMethod(m.id)}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => router.push("/wallet")}
              style={styles.morePay}
              activeOpacity={0.85}
            >
              <Wallet size={14} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.morePayText}>{t("ride.allMethods")}</Text>
            </TouchableOpacity>

            <View style={styles.estimateCard}>
              <View style={styles.estimateRow}>
                <View style={styles.estimateIcon}>
                  <Clock size={18} color={colors.flame} strokeWidth={2.2} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.estimateLabel}>{t("ride.eta")}</Text>
                  <Text style={styles.estimateValue}>
                    {matched
                      ? `~${matched.etaMin} ${t("ride.minutes")}`
                      : `${selected.etaMin}–${selected.etaMax} ${t("ride.minutes")}`}
                  </Text>
                </View>
              </View>
              <View style={styles.estimateDivider} />
              <View style={styles.estimateRow}>
                <View style={styles.estimateIcon}>
                  <CarTaxiFront size={18} color={colors.flame} strokeWidth={2.2} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.estimateLabel}>{t("ride.fare")}</Text>
                  <Text style={styles.estimateValue}>
                    ~{price.toLocaleString("tr-TR")} IQD
                  </Text>
                </View>
                <Text style={styles.estimateType}>{selected.label}</Text>
              </View>
            </View>

            {matched ? (
              <View style={styles.matchCard}>
                <View style={styles.matchIcon}>
                  <UserRound size={20} color={colors.flame} strokeWidth={2.2} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.matchLabel}>{t("ride.matchedDriver")}</Text>
                  <Text style={styles.matchName}>{matched.name}</Text>
                  <Text style={styles.matchMeta}>
                    {t("ride.matchedEta", { min: matched.etaMin })}
                    {matched.distanceM > 0
                      ? ` · ${Math.round(matched.distanceM)} m`
                      : ""}
                    {rideId ? ` · #${rideId.slice(0, 8)}` : ""}
                  </Text>
                </View>
              </View>
            ) : null}

            <Button
              label={
                calling
                  ? t("ride.matching")
                  : mode === "airport"
                    ? t("ride.ctaAirport")
                    : mode === "shared"
                      ? t("ride.ctaShared")
                      : t("ride.ctaCity")
              }
              variant="primary"
              loading={calling}
              disabled={!canCall}
              onPress={() => void handleCall()}
              style={styles.cta}
            />

            <Text style={styles.demoNote}>{t("ride.demoNote")}</Text>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  flex: { flex: 1 },
  mapPane: {
    height: "45%",
    position: "relative",
  },
  mapScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  mapHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
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
    backgroundColor: "rgba(10,10,10,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
  sheetHost: {
    flex: 1,
    marginTop: -28,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...shadow.card,
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: space.md,
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
  morePay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -space.md,
    marginBottom: space.xl,
  },
  morePayText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.flameDeep,
  },
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
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    padding: space.lg,
    marginBottom: space.xl,
    ...shadow.soft,
  },
  matchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  matchLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  matchName: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    color: colors.ink,
    marginTop: 2,
  },
  matchMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
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
