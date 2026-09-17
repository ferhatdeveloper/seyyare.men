import { Image, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Calendar, MapPin, Sparkles, ChevronRight } from "lucide-react-native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";

import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import { storage } from "../../lib/clients";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, []),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["rentals", i18n.language],
    queryFn: () =>
      api.get(
        "/rentals?status=eq.active&select=*,vehicle:vehicles(id,title_original,year,media:vehicle_media(url,is_cover))&order=created_at.desc&limit=30",
      ),
  });

  const rentals = (data as Rental[] | undefined) ?? [];

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={t("rentals.title")} large />
      <View style={styles.hint}>
        <Sparkles size={14} color={colors.flame} />
        <Text style={styles.hintText}>
          {t("rentals.dynamicPricing")}: Talep, sezon ve tatil günlerine göre fiyat değişir
        </Text>
      </View>
      <View style={styles.familyHint}>
        <Text style={styles.familyHintText}>{t("rentals.familyHint")}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.flame} />
        </View>
      ) : rentals.length > 0 ? (
        <FlatList
          data={rentals}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RentalCard rental={item} />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Calendar size={36} color={colors.flame} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Henüz kiralık araç yok</Text>
          <Text style={styles.emptySub}>
            Araç sahipleri kiralama seçeneklerini buradan yayınlayabilir
          </Text>
        </View>
      )}
    </Screen>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const { t } = useTranslation();
  const cover = rental.vehicle?.cover_url;
  const dailyRate = Number(rental.daily_rate_amount).toLocaleString("tr-TR");
  const currency = rental.daily_rate_currency;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/rental/${rental.id}`)}
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

        <View style={styles.badgeDaily}>
          <Calendar size={12} color={colors.white} />
          <Text style={styles.badgeDailyText}>{t("rentals.perDay")}</Text>
        </View>

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
            {[rental.city, rental.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
          </Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>
              {dailyRate} <Text style={styles.currency}>{currency}</Text>
            </Text>
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
    marginBottom: space.md,
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: space.lg, paddingTop: 0, paddingBottom: 40 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
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
  currency: { fontSize: 13, fontFamily: fonts.bodyMed },
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
