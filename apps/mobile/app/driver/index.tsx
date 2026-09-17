import { router } from "expo-router";
import {
  CarTaxiFront,
  Check,
  MapPin,
  Navigation,
  Plane,
  Power,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "../../components/ui/Badge";
import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { useCurrencyStore } from "../../lib/currency-store";
import {
  DEMO_DRIVER_STATS,
  DEMO_DRIVER_TRIPS,
  type DemoDriverTrip,
  type DriverTripKind,
} from "../../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type Filter = "all" | DriverTripKind;

function kindIcon(kind: DriverTripKind) {
  if (kind === "shared") return Users;
  if (kind === "airport") return Plane;
  return CarTaxiFront;
}

export default function DriverDashboardScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [online, setOnline] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [trips, setTrips] = useState(DEMO_DRIVER_TRIPS);

  const list = useMemo(() => {
    if (filter === "all") return trips;
    return trips.filter((x) => x.kind === filter);
  }, [trips, filter]);

  const incoming = trips.filter((x) => x.status === "incoming").length;

  const setStatus = (id: string, status: DemoDriverTrip["status"]) => {
    setTrips((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("driver.title")}
        subtitle={t("driver.subtitle")}
        onBack={() => router.back()}
        right={<CarTaxiFront size={18} color={colors.flame} strokeWidth={2} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.onlineCard, online ? styles.onlineOn : styles.onlineOff]}
          onPress={() => setOnline((v) => !v)}
          activeOpacity={0.9}
        >
          <Power size={20} color={colors.white} strokeWidth={2.2} />
          <View style={styles.flex}>
            <Text style={styles.onlineTitle}>
              {online ? t("driver.online") : t("driver.offline")}
            </Text>
            <Text style={styles.onlineSub}>
              {online ? t("driver.onlineHint") : t("driver.offlineHint")}
            </Text>
          </View>
          {incoming > 0 && online ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{incoming}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.statGrid}>
          <Stat
            label={t("driver.stats.earnings")}
            value={formatListing(DEMO_DRIVER_STATS.todayEarnings, "IQD")}
          />
          <Stat
            label={t("driver.stats.trips")}
            value={String(DEMO_DRIVER_STATS.tripsToday)}
          />
          <Stat
            label={t("driver.stats.rating")}
            value={DEMO_DRIVER_STATS.rating.toFixed(1)}
          />
          <Stat
            label={t("driver.stats.hours")}
            value={`${DEMO_DRIVER_STATS.onlineHours}s`}
          />
        </View>

        <View style={styles.modes}>
          <Chip
            label={t("driver.modes.all")}
            selected={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label={t("driver.modes.taxi")}
            selected={filter === "taxi"}
            onPress={() => setFilter("taxi")}
          />
          <Chip
            label={t("driver.modes.shared")}
            selected={filter === "shared"}
            onPress={() => setFilter("shared")}
          />
          <Chip
            label={t("driver.modes.airport")}
            selected={filter === "airport"}
            onPress={() => setFilter("airport")}
          />
        </View>

        <Text style={styles.section}>{t("driver.trips")}</Text>
        {!online ? (
          <Text style={styles.empty}>{t("driver.goOnline")}</Text>
        ) : (
          list.map((trip) => {
            const Icon = kindIcon(trip.kind);
            return (
              <View key={trip.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.kindRow}>
                    <Icon size={16} color={colors.flame} strokeWidth={2.2} />
                    <Text style={styles.kind}>{t(`driver.modes.${trip.kind}`)}</Text>
                  </View>
                  <Badge
                    label={t(`driver.status.${trip.status}`)}
                    tone={
                      trip.status === "incoming"
                        ? "brass"
                        : trip.status === "active"
                          ? "viridian"
                          : "mist"
                    }
                  />
                </View>
                <View style={styles.route}>
                  <MapPin size={13} color={colors.inkFaint} />
                  <Text style={styles.routeText}>{trip.from}</Text>
                </View>
                <View style={styles.route}>
                  <Navigation size={13} color={colors.flame} />
                  <Text style={styles.routeText}>{trip.to}</Text>
                </View>
                <Text style={styles.fare}>
                  {formatListing(trip.fare, trip.currency)}
                  {trip.seats
                    ? ` · ${trip.seats} ${t("driver.seats")}`
                    : trip.etaMin > 0
                      ? ` · ${trip.etaMin} ${t("wash.min")}`
                      : ""}
                </Text>
                {trip.status === "incoming" ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.reject}
                      onPress={() => setStatus(trip.id, "done")}
                    >
                      <X size={16} color={colors.danger} />
                      <Text style={styles.rejectText}>{t("driver.reject")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.accept}
                      onPress={() => setStatus(trip.id, "active")}
                    >
                      <Check size={16} color={colors.white} />
                      <Text style={styles.acceptText}>{t("driver.accept")}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {trip.status === "active" ? (
                  <TouchableOpacity
                    style={styles.finish}
                    onPress={() => setStatus(trip.id, "done")}
                  >
                    <Text style={styles.finishText}>{t("driver.complete")}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={styles.walletRow}
          onPress={() => router.push("/wallet")}
          activeOpacity={0.9}
        >
          <Wallet size={16} color={colors.flame} />
          <Text style={styles.walletText}>{t("driver.payouts")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.sm,
  },
  flex: { flex: 1 },
  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.xl,
    padding: space.lg,
    ...shadow.soft,
  },
  onlineOn: { backgroundColor: colors.flame },
  onlineOff: { backgroundColor: colors.inkMuted },
  onlineTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.white,
  },
  onlineSub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  statValue: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.sm },
  section: {
    marginTop: space.md,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    paddingVertical: space.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 6,
    ...shadow.soft,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kind: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  route: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  fare: {
    marginTop: 4,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.flameDeep,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: space.sm },
  reject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#F0CACA",
    backgroundColor: "#FCECEC",
    paddingVertical: 10,
  },
  rejectText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.danger,
  },
  accept: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.flame,
    paddingVertical: 10,
  },
  acceptText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  finish: {
    marginTop: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  finishText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  walletRow: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: space.md,
  },
  walletText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
});
