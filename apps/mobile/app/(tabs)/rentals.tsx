import { FlashList } from "@shopify/flash-list";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import {
  Calendar,
  MapPin,
  Plane,
  Sparkles,
  ChevronRight,
  Globe2,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { VehicleCardSkeleton } from "../../components/Skeleton";
import { Badge } from "../../components/ui/Badge";
import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import { MARKET_CITIES, useCityStore, type SelectedCity } from "../../lib/city-store";
import { storage } from "../../lib/clients";
import { useCurrencyStore } from "../../lib/currency-store";
import { chauffeurDailyFee } from "../../lib/marketplace-heuristics";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const BORDER_FLAME = "#FFD8B8";

/** Rental destinations — market cities + Kurdistan hubs */
const RENTAL_CITIES = [
  "Erbil",
  "Baghdad",
  "Sulaymaniyah",
  "Duhok",
  "Basra",
  "Mosul",
  "Kirkuk",
] as const;

const CITY_SHORT: Record<string, string> = {
  Sulaymaniyah: "Suli",
  Baghdad: "Baghdad",
  Erbil: "Erbil",
  Duhok: "Duhok",
  Basra: "Basra",
  Mosul: "Mosul",
  Kirkuk: "Kirkuk",
};

interface Rental {
  id: string;
  vehicle_id: string;
  daily_rate_amount: number;
  daily_rate_currency: string;
  weekly_rate_amount: number | null;
  monthly_rate_amount: number | null;
  deposit_amount: number | null;
  min_days: number;
  max_days: number;
  insurance_included: boolean;
  instant_book: boolean;
  delivery_available?: boolean;
  airport_delivery?: boolean;
  airport_delivery_fee?: number;
  country_code: string | null;
  city: string | null;
  vehicle: {
    title_original: string | null;
    year: number | null;
    cover_url: string | null;
  };
}

export default function RentalsScreen() {
  const { t, i18n } = useTranslation();
  const storedCity = useCityStore((s) => s.city);
  const setStoredCity = useCityStore((s) => s.setCity);
  const [city, setCity] = useState<string | "all">(
    storedCity !== "all" ? storedCity : "all",
  );
  const [withDriver, setWithDriver] = useState(false);
  const formatListing = useCurrencyStore((s) => s.formatListing);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      setCity(storedCity !== "all" ? storedCity : "all");
    }, [storedCity]),
  );

  const selectCity = useCallback(
    (next: string | "all") => {
      setCity(next);
      const persistable =
        next === "all"
          ? "all"
          : (MARKET_CITIES as readonly string[]).includes(next)
            ? (next as SelectedCity)
            : "all";
      void setStoredCity(persistable);
    },
    [setStoredCity],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["rentals", i18n.language],
    queryFn: () =>
      api.get(
        "/rentals?status=eq.active&select=*,vehicle:vehicles(id,title_original,year,media:vehicle_media(url,is_cover))&order=created_at.desc&limit=30",
      ),
    placeholderData: keepPreviousData,
  });

  const rentals = useMemo(() => {
    const list = (data as Rental[] | undefined) ?? [];
    if (city === "all") return list;
    return list.filter(
      (r) => (r.city ?? "").toLowerCase() === city.toLowerCase(),
    );
  }, [data, city]);

  const cityCounts = useMemo(() => {
    const list = (data as Rental[] | undefined) ?? [];
    const map: Record<string, number> = {};
    for (const r of list) {
      const key = (r.city ?? "").trim();
      if (!key) continue;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [data]);

  const listHeader = (
    <View>
      <View style={styles.hint}>
        <Sparkles size={14} color={colors.flame} />
        <Text style={styles.hintText}>
          {t("rentals.dynamicPricing")}: Talep, sezon ve tatil günlerine göre fiyat değişir
        </Text>
      </View>
      <View style={styles.familyHint}>
        <Text style={styles.familyHintText}>{t("rentals.familyHint")}</Text>
      </View>

      <View style={styles.citySection}>
        <Text style={styles.citySectionLabel}>{t("search.city")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}
          decelerationRate="fast"
        >
          <Pressable
            onPress={() => selectCity("all")}
            style={({ pressed }) => [
              styles.cityTile,
              city === "all" && styles.cityTileOn,
              pressed && styles.cityTilePressed,
            ]}
          >
            <View
              style={[styles.cityIconWrap, city === "all" && styles.cityIconWrapOn]}
            >
              <Globe2
                size={18}
                color={city === "all" ? colors.white : colors.flame}
                strokeWidth={2.2}
              />
            </View>
            <Text
              style={[styles.cityTileLabel, city === "all" && styles.cityTileLabelOn]}
              numberOfLines={1}
            >
              {t("common.all")}
            </Text>
            <Text
              style={[styles.cityTileMeta, city === "all" && styles.cityTileMetaOn]}
            >
              {(data as Rental[] | undefined)?.length ?? 0}
            </Text>
          </Pressable>

          {RENTAL_CITIES.map((c) => {
            const selected = city === c;
            const count = cityCounts[c] ?? 0;
            return (
              <Pressable
                key={c}
                onPress={() => selectCity(c)}
                style={({ pressed }) => [
                  styles.cityTile,
                  selected && styles.cityTileOn,
                  pressed && styles.cityTilePressed,
                ]}
              >
                <View
                  style={[styles.cityIconWrap, selected && styles.cityIconWrapOn]}
                >
                  <MapPin
                    size={18}
                    color={selected ? colors.white : colors.flame}
                    strokeWidth={2.2}
                  />
                </View>
                <Text
                  style={[styles.cityTileLabel, selected && styles.cityTileLabelOn]}
                  numberOfLines={1}
                >
                  {CITY_SHORT[c] ?? c}
                </Text>
                <Text
                  style={[styles.cityTileMeta, selected && styles.cityTileMetaOn]}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.packageRow}>
        <Chip
          label={t("rentals.withDriver")}
          selected={withDriver}
          onPress={() => setWithDriver((v) => !v)}
        />
        <Text style={styles.packageHint}>
          {t("rentals.withDriverFee", {
            fee: formatListing(chauffeurDailyFee(null), "IQD"),
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={t("rentals.title")} large />
      <FlashList
        data={isLoading ? [] : rentals}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RentalCard rental={item} withDriverPreferred={withDriver} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonWrap}>
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Calendar size={36} color={colors.flame} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>{t("rentals.emptyTitle")}</Text>
              <Text style={styles.emptySub}>{t("rentals.emptySub")}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.list}
        style={styles.listFlex}
      />
    </Screen>
  );
}

function RentalCard({
  rental,
  withDriverPreferred,
}: {
  rental: Rental;
  withDriverPreferred: boolean;
}) {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const cover = rental.vehicle?.cover_url;
  const dailyRate = formatListing(rental.daily_rate_amount, rental.daily_rate_currency);
  const chauffeurFee = chauffeurDailyFee(rental.daily_rate_amount);
  const chauffeurFeeLabel = formatListing(chauffeurFee, rental.daily_rate_currency);
  const showAirport = Boolean(rental.airport_delivery);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/rental/[id]",
          params: {
            id: rental.id,
            ...(withDriverPreferred ? { withDriver: "1" } : {}),
          },
        })
      }
      activeOpacity={0.92}
    >
      <View>
        {cover ? (
          <Image
            source={{ uri: cover.startsWith("http") ? cover : `${storage.url}/${cover}` }}
            style={styles.coverImg}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>Fotoğraf yok</Text>
          </View>
        )}

        {showAirport ? (
          <View style={styles.badgeAirport}>
            <Plane size={11} color={colors.white} strokeWidth={2.4} />
            <Text style={styles.badgeAirportText}>{t("rentals.airportDelivery")}</Text>
          </View>
        ) : (
          <View style={styles.badgeDaily}>
            <Calendar size={12} color={colors.white} />
            <Text style={styles.badgeDailyText}>{t("rentals.perDay")}</Text>
          </View>
        )}

        {rental.instant_book ? (
          <View style={styles.badgeInstant}>
            <Text style={styles.badgeInstantText}>{t("rentals.instantBook")}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {rental.vehicle?.title_original ?? "Araç"}{" "}
          {rental.vehicle?.year ? `(${rental.vehicle.year})` : ""}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={12} color={colors.inkFaint} />
          <Text style={styles.locationText}>
            {[rental.city, rental.country_code].filter(Boolean).join(", ") || "—"}
          </Text>
        </View>

        <View style={styles.packageChipWrap}>
          <Badge
            label={`${t("rentals.withDriver")} · ${t("rentals.withDriverFee", {
              fee: chauffeurFeeLabel,
            })}`}
            tone={withDriverPreferred ? "viridian" : "mist"}
          />
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>{dailyRate}</Text>
            <Text style={styles.perDay}>{t("rentals.perDay")}</Text>
          </View>
          <View style={styles.arrowBtn}>
            <ChevronRight size={20} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: space.xl,
    marginBottom: space.md,
    padding: space.md,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.md,
    gap: space.sm,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.flameDeep,
    lineHeight: 17,
  },
  familyHint: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  familyHintText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17,
  },
  citySection: {
    marginBottom: space.sm,
  },
  citySectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    letterSpacing: 0.2,
  },
  cityRow: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: 10,
  },
  cityTile: {
    width: 84,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    gap: 6,
    ...shadow.soft,
  },
  cityTileOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  cityTilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  cityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cityIconWrapOn: {
    backgroundColor: colors.flame,
  },
  cityTileLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
    textAlign: "center",
  },
  cityTileLabelOn: {
    color: colors.white,
  },
  cityTileMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  cityTileMetaOn: {
    color: "rgba(255,255,255,0.65)",
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  packageHint: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  packageChipWrap: {
    marginTop: 10,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listFlex: { flex: 1 },
  list: { paddingBottom: 40 },
  skeletonWrap: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: 14,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.section,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 20,
    color: colors.ink,
    marginTop: space.xl,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: space.sm,
    lineHeight: 21,
    maxWidth: 280,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: space.lg,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  coverImg: { width: "100%", height: 176 },
  coverPlaceholder: {
    width: "100%",
    height: 176,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  coverPlaceholderText: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  badgeDaily: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.flameDeep,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeDailyText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.white,
  },
  badgeAirport: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  badgeAirportText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.white,
  },
  badgeInstant: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.brass,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeInstantText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.white,
  },
  cardBody: { padding: space.lg },
  cardTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  locationText: {
    marginLeft: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.flame,
    letterSpacing: -0.3,
  },
  perDay: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
  },
});
