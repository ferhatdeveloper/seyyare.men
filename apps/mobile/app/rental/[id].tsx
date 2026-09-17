import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Calendar,
  ChevronLeft,
  MapPin,
  Sparkles,
  Info,
  Shield,
  Clock,
  Users,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { auth, type StoredUser } from "../../lib/auth";
import { storage } from "../../lib/clients";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const GALLERY_H = 300;
const BORDER_FLAME = "#FFD8B8";

interface Rental {
  id: string;
  daily_rate_amount: number;
  daily_rate_currency: string;
  weekly_rate_amount: number | null;
  monthly_rate_amount: number | null;
  deposit_amount: number | null;
  min_days: number;
  max_days: number;
  insurance_included: boolean;
  delivery_available: boolean;
  instant_book: boolean;
  age_requirement: number;
  country_code: string | null;
  city: string | null;
  vehicle: {
    id: string;
    title_original: string | null;
    year: number | null;
    media: Array<{ url: string; is_cover: boolean }>;
  };
  owner: {
    display_name: string | null;
    verified: boolean;
    rating_avg: number | null;
  };
}

interface PriceQuote {
  days: number;
  baseAmount: number;
  finalAmount: number;
  currency: string;
  totalMultiplier: number;
  factors?: Array<{ factor: string; impact: number; description: string }>;
  breakdown: Array<{ label: string; amount: number }>;
  confidence: number;
}

export default function rentalDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t } = useTranslation();
  const qc = useQueryClient();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(
    new Date(today.getTime() + 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
  );
  const [user, setUser] = useState<StoredUser | null>(null);
  const [familyDriver, setFamilyDriver] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void auth.getUser().then(setUser);
    }, []),
  );

  const isFemaleMember = user?.gender === "female";

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Rental | undefined> => {
      const arr = await api.get<Rental[]>(
        `/rentals?id=eq.${id}&select=*,vehicle:vehicles(id,title_original,year,media:vehicle_media(url,is_cover)),owner:users!owner_id(user_profiles(display_name,verified,rating_avg))`,
      );
      if (!Array.isArray(arr)) return undefined;
      return arr.find((r) => r.id === id) ?? arr[0];
    },
  });

  const days = useMemo(
    () => Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    [startDate, endDate],
  );

  const { data: quote, isFetching: quoteLoading } = useQuery({
    queryKey: ["rental-quote", id, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)],
    queryFn: () =>
      fetch(
        `${process.env.EXPO_PUBLIC_AI_URL}/ai/rental-price?rentalId=${id}&startDate=${startDate.toISOString().slice(0, 10)}&endDate=${endDate.toISOString().slice(0, 10)}`,
      ).then((r) => r.json() as Promise<PriceQuote>),
    enabled: days >= 1,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!(await auth.isAuthenticated())) {
        router.push("/auth/login");
        return;
      }
      if (familyDriver && !isFemaleMember) {
        Alert.alert(t("rentals.familyOption"), t("rentals.familyDriverLocked"));
        return;
      }
      return api.post("/bookings", {
        rental_id: id,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        total_days: days,
        total_amount: quote?.finalAmount,
        currency: quote?.currency,
        price_breakdown: quote?.breakdown ?? [],
        family_driver: familyDriver,
        driver_preference: familyDriver ? "female" : null,
      });
    },
    onSuccess: () => {
      Alert.alert("Rezervasyon Talebi Oluşturuldu", "Onay için takip edebilirsiniz");
      void qc.invalidateQueries({ queryKey: ["my-bookings"] });
      router.push("/(tabs)/profile");
    },
    onError: () => Alert.alert(t("errors.serverError")),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.flame} />
      </SafeAreaView>
    );
  }

  if (!rental) {
    return (
      <SafeAreaView style={styles.loading} edges={["top"]}>
        <TouchableOpacity style={styles.notFoundBack} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.notFoundTitle}>Kiralama bulunamadı</Text>
        <Text style={styles.notFoundBody}>Bu ilan demo listesinde yok veya kaldırılmış olabilir.</Text>
        <View style={styles.notFoundBtn}>
          <Button label="Geri dön" variant="primary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const cover = rental.vehicle?.media?.find((m) => m.is_cover)?.url ?? rental.vehicle?.media?.[0]?.url;
  const screenW = Dimensions.get("window").width;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        <View style={styles.galleryWrap}>
          {cover ? (
            <Image
              source={{ uri: cover.startsWith("http") ? cover : `${storage.url}/${cover}` }}
              style={{ width: screenW, height: GALLERY_H }}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>Fotoğraf yok</Text>
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
          </TouchableOpacity>
          {rental.instant_book ? (
            <View style={styles.galleryBadge}>
              <Text style={styles.galleryBadgeText}>{t("rentals.instantBook")}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.rateHero}>
            {Number(rental.daily_rate_amount).toLocaleString("tr-TR")}
            <Text style={styles.rateHeroCurrency}> {rental.daily_rate_currency}</Text>
            <Text style={styles.rateHeroUnit}> / gün</Text>
          </Text>
          <Text style={styles.title}>
            {rental.vehicle?.title_original ?? "Araç"}
            {rental.vehicle?.year ? ` · ${rental.vehicle.year}` : ""}
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.inkFaint} />
            <Text style={styles.locationText}>
              {[rental.city, rental.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
            </Text>
          </View>
          <View style={styles.badges}>
            {rental.insurance_included ? (
              <View style={styles.badgeFlame}>
                <Shield size={11} color={colors.flame} />
                <Text style={styles.badgeFlameText}>Sigorta dahil</Text>
              </View>
            ) : null}
            {rental.delivery_available ? (
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>Teslimat var</Text>
              </View>
            ) : null}
            {rental.weekly_rate_amount ? (
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>
                  Haftalık {Number(rental.weekly_rate_amount).toLocaleString("tr-TR")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.rateCard}>
          <View style={styles.flex}>
            <Text style={styles.rateLabel}>Günlük fiyat</Text>
            <Text style={styles.rateValue}>
              {Number(rental.daily_rate_amount).toLocaleString("tr-TR")}{" "}
              <Text style={styles.rateCurrency}>{rental.daily_rate_currency}</Text>
            </Text>
          </View>
          {rental.weekly_rate_amount ? (
            <View style={styles.rateSide}>
              <Text style={styles.rateLabel}>Haftalık</Text>
              <Text style={styles.rateSideValue}>
                {Number(rental.weekly_rate_amount).toLocaleString("tr-TR")}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.familyHeader}>
            <Users size={16} color={colors.flame} strokeWidth={2} />
            <Text style={[styles.cardTitle, styles.familyTitle]}>{t("rentals.familyOption")}</Text>
          </View>
          <Text style={styles.familyDesc}>{t("rentals.familyDriverDesc")}</Text>
          <TouchableOpacity
            style={[
              styles.familyToggle,
              familyDriver && styles.familyToggleOn,
              !isFemaleMember && styles.familyToggleLocked,
            ]}
            activeOpacity={0.85}
            onPress={() => {
              if (!user) {
                Alert.alert(t("rentals.familyOption"), t("rentals.familyDriverLogin"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("auth.login"), onPress: () => router.push("/auth/login") },
                ]);
                return;
              }
              if (!isFemaleMember) {
                Alert.alert(t("rentals.familyOption"), t("rentals.familyDriverSetGender"), [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("profile.title"),
                    onPress: () => router.push("/(tabs)/profile"),
                  },
                ]);
                return;
              }
              setFamilyDriver((v) => !v);
            }}
          >
            <View style={styles.familyToggleText}>
              <Text
                style={[
                  styles.familyToggleTitle,
                  familyDriver && styles.familyToggleTitleOn,
                ]}
              >
                {t("rentals.familyDriverTitle")}
              </Text>
              <Text
                style={[
                  styles.familyToggleSub,
                  familyDriver && styles.familyToggleSubOn,
                ]}
              >
                {familyDriver
                  ? t("rentals.familyDriverOn")
                  : isFemaleMember
                    ? t("rentals.familyDriverDesc")
                    : t("rentals.familyDriverLocked")}
              </Text>
            </View>
            <View
              style={[
                styles.familySwitch,
                familyDriver && styles.familySwitchOn,
              ]}
            >
              <View
                style={[
                  styles.familyKnob,
                  familyDriver && styles.familyKnobOn,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("rentals.selectDates")}</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.fieldLabel}>{t("rentals.pickup")}</Text>
              <View style={styles.dateField}>
                <Calendar size={14} color={colors.flame} />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <View style={styles.steppers}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDate(-1, "start")}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtnActive} onPress={() => adjustDate(1, "start")}>
                    <Text style={styles.stepBtnActiveText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.fieldLabel}>{t("rentals.return")}</Text>
              <View style={styles.dateField}>
                <Calendar size={14} color={colors.flame} />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                <View style={styles.steppers}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDate(-1, "end")}>
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtnActive} onPress={() => adjustDate(1, "end")}>
                    <Text style={styles.stepBtnActiveText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.daysRow}>
            <View style={styles.daysLeft}>
              <Clock size={12} color={colors.inkFaint} />
              <Text style={styles.daysText}>{t("rentals.totalDays", { count: days })}</Text>
            </View>
            {rental.min_days ? (
              <Text style={styles.daysText}>
                Min {rental.min_days} · Maks {rental.max_days} gün
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.quoteHeader}>
            <Sparkles size={16} color={colors.flame} />
            <Text style={styles.quoteHeaderText}>
              {t("rentals.dynamicPricing")} — {t("rentals.priceBreakdown")}
            </Text>
          </View>
          {quoteLoading ? (
            <View style={styles.quoteLoading}>
              <ActivityIndicator color={colors.flame} />
              <Text style={styles.quoteLoadingText}>Fiyat hesaplanıyor...</Text>
            </View>
          ) : quote && quote.finalAmount ? (
            <View style={styles.quoteBox}>
              <View style={styles.quoteLine}>
                <Text style={styles.quoteMuted}>
                  Temel ({days} gün × {Number(rental.daily_rate_amount).toLocaleString("tr-TR")})
                </Text>
                <Text style={styles.quoteAmountSm}>
                  {quote.baseAmount.toLocaleString("tr-TR")} {quote.currency}
                </Text>
              </View>
              {(quote.factors ?? []).map((f, i) => (
                <View key={i} style={styles.factorLine}>
                  <Text style={styles.quoteMuted}>{f.description}</Text>
                  <Text
                    style={[
                      styles.factorImpact,
                      f.impact > 0
                        ? styles.impactUp
                        : f.impact < 0
                          ? styles.impactDown
                          : styles.impactNeutral,
                    ]}
                  >
                    {f.impact > 0 ? "+" : ""}
                    {(f.impact * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
              <View style={styles.quoteTotal}>
                <Text style={styles.quoteTotalLabel}>{t("rentals.totalPrice")}</Text>
                <Text style={styles.quoteTotalValue}>
                  {quote.finalAmount.toLocaleString("tr-TR")}{" "}
                  <Text style={styles.rateCurrency}>{quote.currency}</Text>
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.quoteBox}>
              <Text style={styles.quoteFallback}>
                {t("rentals.totalPrice")}: {(Number(rental.daily_rate_amount) * days).toLocaleString("tr-TR")}{" "}
                {rental.daily_rate_currency}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Info size={14} color={colors.flame} />
            <Text style={styles.infoTitle}>Önemli bilgiler</Text>
          </View>
          <Text style={styles.infoBody}>
            · Minimum yaş: {rental.age_requirement}
            {"\n"}· Depozito:{" "}
            {rental.deposit_amount
              ? `${Number(rental.deposit_amount).toLocaleString("tr-TR")} ${rental.daily_rate_currency}`
              : "Yok"}
            {"\n"}· Yakıt politikası: Alış ve teslim eşit seviye
            {"\n"}· Sözleşme: Teslim anında imzalanır
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomMeta}>
            <Text style={styles.bottomMetaLabel}>{days} gün</Text>
            <Text style={styles.bottomMetaPrice}>
              {quote?.finalAmount
                ? `${quote.finalAmount.toLocaleString("tr-TR")} ${quote.currency}`
                : `${(Number(rental.daily_rate_amount) * days).toLocaleString("tr-TR")} ${rental.daily_rate_currency}`}
            </Text>
          </View>
          <View style={styles.bottomBtnWrap}>
            <Button
              label={bookMutation.isPending ? t("common.loading") : t("rentals.book")}
              variant="primary"
              loading={bookMutation.isPending}
              disabled={days < (rental.min_days ?? 1) || bookMutation.isPending}
              onPress={() => bookMutation.mutate()}
            />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );

  function adjustDate(deltaDays: number, which: "start" | "end") {
    if (which === "start") {
      const next = new Date(startDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      if (next < today) return;
      setStartDate(next);
      if (next > endDate) setEndDate(new Date(next.getTime() + 24 * 60 * 60 * 1000));
    } else {
      const next = new Date(endDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      if (next <= startDate) return;
      setEndDate(next);
    }
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  notFoundBack: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    marginBottom: space.sm,
  },
  notFoundBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: space.xxl,
    marginBottom: space.lg,
  },
  notFoundBtn: { width: 160 },
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  galleryWrap: { position: "relative", backgroundColor: colors.ink },
  coverPlaceholder: {
    width: "100%",
    height: GALLERY_H,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  coverPlaceholderText: { fontFamily: fonts.body, color: colors.inkFaint },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  galleryBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: colors.flame,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    ...shadow.float,
  },
  galleryBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  titleBlock: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rateHero: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  rateHeroCurrency: {
    fontFamily: fonts.bodyMed,
    fontSize: 15,
    color: colors.inkMuted,
  },
  rateHeroUnit: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    marginTop: space.md,
    letterSpacing: -0.3,
  },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: space.sm },
  locationText: { marginLeft: 4, fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  badges: { flexDirection: "row", flexWrap: "wrap", marginTop: space.md, gap: space.sm },
  badgeFlame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeFlameText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.flameDeep },
  badgeMuted: {
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMutedText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.inkMuted },
  rateCard: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  rateLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.flame, marginBottom: 4 },
  rateValue: { fontFamily: fonts.display, fontSize: 26, color: colors.flameDeep, letterSpacing: -0.4 },
  rateCurrency: { fontSize: 14, fontFamily: fonts.bodyMed },
  rateSide: { alignItems: "flex-end" },
  rateSideValue: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.flameDeep },
  card: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  cardTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    marginBottom: space.md,
    letterSpacing: -0.2,
  },
  familyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: space.sm,
  },
  familyTitle: { marginBottom: 0, flex: 1 },
  familyDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
    marginBottom: space.md,
  },
  familyToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  familyToggleOn: {
    backgroundColor: "#FFF4EC",
    borderColor: BORDER_FLAME,
  },
  familyToggleLocked: {
    opacity: 0.92,
  },
  familyToggleText: { flex: 1, gap: 4 },
  familyToggleTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  familyToggleTitleOn: { color: colors.flame },
  familyToggleSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
  },
  familyToggleSubOn: { color: colors.ink },
  familySwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    padding: 3,
    justifyContent: "center",
  },
  familySwitchOn: { backgroundColor: colors.flame },
  familyKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  familyKnobOn: { alignSelf: "flex-end" },
  dateRow: { flexDirection: "row", gap: space.md },
  dateCol: { flex: 1 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint, marginBottom: 4 },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.sm,
    paddingVertical: space.md,
  },
  dateText: {
    flex: 1,
    marginLeft: space.sm,
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.ink,
  },
  steppers: { flexDirection: "row", gap: 4 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontFamily: fonts.bodySemi, color: colors.inkMuted },
  stepBtnActive: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnActiveText: { fontFamily: fonts.bodySemi, color: colors.flameDeep },
  daysRow: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  daysLeft: { flexDirection: "row", alignItems: "center" },
  daysText: { marginLeft: space.sm, fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  section: { marginHorizontal: space.xl, marginTop: space.lg },
  quoteHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  quoteHeaderText: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  quoteLoading: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: "center",
  },
  quoteLoadingText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
    marginTop: space.sm,
  },
  quoteBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  quoteLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  quoteMuted: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.inkMuted },
  quoteAmountSm: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
  factorLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  factorImpact: { fontFamily: fonts.bodySemi, fontSize: 11 },
  impactUp: { color: colors.danger },
  impactDown: { color: colors.flame },
  impactNeutral: { color: colors.inkFaint },
  quoteTotal: {
    borderTopWidth: 2,
    borderTopColor: colors.flame,
    marginTop: space.sm,
    paddingTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quoteTotalLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  quoteTotalValue: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4 },
  quoteFallback: { fontFamily: fonts.displayMed, fontSize: 16, color: colors.ink },
  infoBox: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  infoTitle: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.flameDeep,
  },
  infoBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.flameDeep,
    lineHeight: 20,
  },
  bottomSpacer: { height: 120 },
  bottomBarSafe: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    ...shadow.card,
  },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  bottomMeta: { flexShrink: 0 },
  bottomMetaLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  bottomMetaPrice: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  bottomBtnWrap: { flex: 1 },
});
