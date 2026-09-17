import { router } from "expo-router";
import {
  ArrowRight,
  Clock,
  Heart,
  MapPin,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { auth } from "../lib/auth";
import { useCurrencyStore } from "../lib/currency-store";
import {
  DEMO_SHARED_ROUTES,
  type DemoSharedRoute,
} from "../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

export default function SharedRideScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    DEMO_SHARED_ROUTES[0]?.id ?? null,
  );
  const [booking, setBooking] = useState(false);
  const [isFemaleUser, setIsFemaleUser] = useState(false);

  useEffect(() => {
    void auth.getUser().then((user) => {
      if (user?.gender === "female") {
        setIsFemaleUser(true);
        setFemaleOnly(true);
      }
    });
  }, []);

  const routes = useMemo(() => {
    if (!femaleOnly) return DEMO_SHARED_ROUTES;
    return DEMO_SHARED_ROUTES.filter((r) => r.femaleOnly);
  }, [femaleOnly]);

  useEffect(() => {
    if (routes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!routes.some((r) => r.id === selectedId)) {
      setSelectedId(routes[0].id);
    }
  }, [routes, selectedId]);

  const selected = useMemo(
    () => routes.find((r) => r.id === selectedId) ?? null,
    [routes, selectedId],
  );

  const bookSeat = useCallback(() => {
    if (!selected) {
      Alert.alert(t("sharedRide.missingTitle"), t("sharedRide.missingBody"));
      return;
    }
    setBooking(true);
    setTimeout(() => {
      setBooking(false);
      Alert.alert(
        t("sharedRide.bookedTitle"),
        t("sharedRide.bookedBody", {
          from: selected.from,
          to: selected.to,
          amount: formatListing(selected.price, "IQD"),
          departure: selected.departure,
        }),
        [
          { text: t("common.done") },
          { text: t("tabs.home"), onPress: () => router.replace("/(tabs)") },
        ],
      );
    }, 600);
  }, [formatListing, selected, t]);

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("sharedRide.title")}
        subtitle={t("sharedRide.subtitle")}
        onBack={() => router.back()}
        right={<Users size={18} color={colors.flame} strokeWidth={2} />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Users size={22} color={colors.white} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>{t("sharedRide.heroTitle")}</Text>
            <Text style={styles.heroSub}>{t("sharedRide.heroHint")}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t("sharedRide.preference")}</Text>
        <View style={styles.chipRow}>
          <Chip
            label={t("sharedRide.anySeats")}
            selected={!femaleOnly}
            onPress={() => setFemaleOnly(false)}
            icon={
              <Users
                size={14}
                color={!femaleOnly ? colors.white : colors.flame}
                strokeWidth={2}
              />
            }
          />
          <Chip
            label={t("sharedRide.femaleOnly")}
            selected={femaleOnly}
            onPress={() => setFemaleOnly(true)}
            icon={
              <Heart
                size={14}
                color={femaleOnly ? colors.white : colors.flame}
                strokeWidth={2}
              />
            }
          />
        </View>
        {isFemaleUser && femaleOnly ? (
          <Text style={styles.filterHint}>{t("sharedRide.femaleFilterHint")}</Text>
        ) : null}

        <Text style={styles.section}>{t("sharedRide.routes")}</Text>
        {routes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t("sharedRide.empty")}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                selected={route.id === selectedId}
                priceLabel={formatListing(route.price, "IQD")}
                seatsLabel={t("sharedRide.seatsLeft", { count: route.seats })}
                durationLabel={`${route.durationMin} ${t("sharedRide.min")}`}
                femaleLabel={t("sharedRide.femaleBadge")}
                onPress={() => setSelectedId(route.id)}
              />
            ))}
          </View>
        )}

        {selected ? (
          <View style={styles.summary}>
            <MapPin size={16} color={colors.flame} strokeWidth={2.2} />
            <View style={styles.flex}>
              <Text style={styles.summaryLabel}>
                {selected.from} → {selected.to}
              </Text>
              <Text style={styles.summaryHint}>
                {selected.departure}
                {selected.femaleOnly ? ` · ${t("sharedRide.femaleBadge")}` : ""}
              </Text>
            </View>
            <Text style={styles.summaryPrice}>
              {formatListing(selected.price, "IQD")}
            </Text>
          </View>
        ) : null}

        <Button
          label={t("sharedRide.book")}
          variant="primary"
          loading={booking}
          disabled={!selected}
          onPress={bookSeat}
          style={styles.cta}
        />
        <Text style={styles.demoNote}>{t("sharedRide.demoNote")}</Text>
      </ScrollView>
    </Screen>
  );
}

function RouteCard({
  route,
  selected,
  priceLabel,
  seatsLabel,
  durationLabel,
  femaleLabel,
  onPress,
}: {
  route: DemoSharedRoute;
  selected: boolean;
  priceLabel: string;
  seatsLabel: string;
  durationLabel: string;
  femaleLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardOn]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardTop}>
        <View style={styles.routeLine}>
          <Text style={[styles.city, selected && styles.cityOn]}>{route.from}</Text>
          <ArrowRight
            size={14}
            color={selected ? colors.white : colors.inkFaint}
            strokeWidth={2.2}
          />
          <Text style={[styles.city, selected && styles.cityOn]}>{route.to}</Text>
        </View>
        <Text style={[styles.price, selected && styles.priceOn]}>{priceLabel}</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock size={12} color={selected ? "rgba(255,255,255,0.8)" : colors.inkFaint} />
          <Text style={[styles.metaText, selected && styles.metaOn]}>
            {route.departure}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={12} color={selected ? "rgba(255,255,255,0.8)" : colors.inkFaint} />
          <Text style={[styles.metaText, selected && styles.metaOn]}>{seatsLabel}</Text>
        </View>
        <Text style={[styles.metaText, selected && styles.metaOn]}>{durationLabel}</Text>
      </View>
      {route.femaleOnly ? (
        <View style={[styles.femaleTag, selected && styles.femaleTagOn]}>
          <Heart size={11} color={selected ? colors.white : colors.flameDeep} />
          <Text style={[styles.femaleTagText, selected && styles.femaleTagTextOn]}>
            {femaleLabel}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  list: { gap: 10 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 8,
    ...shadow.soft,
  },
  cardOn: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  routeLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  city: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  cityOn: { color: colors.white },
  price: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.flameDeep,
  },
  priceOn: { color: colors.white },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  metaOn: { color: "rgba(255,255,255,0.85)" },
  femaleTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  femaleTagOn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  femaleTagText: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.flameDeep,
  },
  femaleTagTextOn: { color: colors.white },
  empty: {
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
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
