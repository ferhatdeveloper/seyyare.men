import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import {
  CalendarCheck,
  Car,
  Check,
  Eye,
  FileText,
  KeyRound,
  MessageCircle,
  Plus,
  Store,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import {
  DEMO_CONTRACTS,
  DEMO_PARTNER_BOOKINGS,
  DEMO_PARTNER_SALES,
  DEMO_PARTNER_STATS,
  DEMO_RENTALS,
  mapBookingStatusToPartner,
  type DemoPartnerBooking,
  type PartnerListingStatus,
} from "../../lib/demo-data";
import { useCurrencyStore } from "../../lib/currency-store";
import { localeNativeName, type LocaleCode } from "../../lib/locales";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type RpcBookingRow = {
  id: string;
  rental_id?: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  currency?: string;
  status?: string;
  city?: string | null;
  rental_title?: string | null;
  guest_label?: string | null;
  party_role?: string | null;
};

function toPartnerBooking(row: RpcBookingRow): DemoPartnerBooking {
  return {
    id: String(row.id),
    rentalTitle: String(row.rental_title ?? "Kiralama"),
    guest: String(row.guest_label ?? "—"),
    city: String(row.city ?? ""),
    start: String(row.start_date ?? ""),
    end: String(row.end_date ?? ""),
    amount: Number(row.total_amount ?? 0),
    currency: "IQD",
    status: mapBookingStatusToPartner(String(row.status ?? "pending")),
  };
}

type Tab = "overview" | "sales" | "rentals" | "contracts";

function statusTone(status: PartnerListingStatus | DemoPartnerBooking["status"] | string) {
  if (status === "live" || status === "accepted" || status === "signed" || status === "active")
    return "viridian" as const;
  if (status === "pending" || status === "draft") return "brass" as const;
  if (status === "rejected") return "danger" as const;
  return "mist" as const;
}

export default function PartnerPanelScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [tab, setTab] = useState<Tab>("overview");
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, DemoPartnerBooking["status"]>
  >({});
  const [screenFocused, setScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  const { data: remoteBookings } = useQuery({
    queryKey: ["my-bookings", "partner"],
    queryFn: () =>
      api
        .rpc<RpcBookingRow[]>("list_my_bookings", { p_limit: 50 })
        .then((rows) => (Array.isArray(rows) ? rows : [])),
    refetchInterval: screenFocused ? 12_000 : false,
    staleTime: 5_000,
  });

  const bookings = useMemo(() => {
    const base =
      remoteBookings && remoteBookings.length > 0
        ? remoteBookings.map(toPartnerBooking)
        : DEMO_PARTNER_BOOKINGS;
    return base.map((b) =>
      localOverrides[b.id] ? { ...b, status: localOverrides[b.id] } : b,
    );
  }, [remoteBookings, localOverrides]);

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === "pending").length,
    [bookings],
  );

  const setBookingStatus = (id: string, status: "accepted" | "rejected") => {
    setLocalOverrides((prev) => ({ ...prev, [id]: status }));
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("partner.title")}
        subtitle={t("partner.subtitle")}
        onBack={() => router.back()}
        right={<Store size={18} color={colors.flame} strokeWidth={2} />}
      />

      <View style={styles.tabs}>
        {(
          [
            ["overview", t("partner.tabs.overview")],
            ["sales", t("partner.tabs.sales")],
            ["rentals", t("partner.tabs.rentals")],
            ["contracts", t("partner.tabs.contracts")],
          ] as const
        ).map(([key, label]) => (
          <Chip
            key={key}
            label={
              key === "rentals" && pendingCount > 0
                ? `${label} (${pendingCount})`
                : label
            }
            selected={tab === key}
            onPress={() => setTab(key)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" ? (
          <>
            <View style={styles.statGrid}>
              <Stat
                icon={<Car size={16} color={colors.flame} />}
                label={t("partner.stats.liveSales")}
                value={String(DEMO_PARTNER_STATS.liveSales)}
              />
              <Stat
                icon={<KeyRound size={16} color={colors.flame} />}
                label={t("partner.stats.liveRentals")}
                value={String(DEMO_PARTNER_STATS.liveRentals)}
              />
              <Stat
                icon={<CalendarCheck size={16} color={colors.flame} />}
                label={t("partner.stats.pending")}
                value={String(pendingCount)}
              />
              <Stat
                icon={<Eye size={16} color={colors.flame} />}
                label={t("partner.stats.views")}
                value={DEMO_PARTNER_STATS.monthViews.toLocaleString("tr-TR")}
              />
            </View>

            <View style={styles.actions}>
              <Button
                label={t("partner.newListing")}
                variant="primary"
                onPress={() => router.push("/(tabs)/sell")}
                style={styles.actionBtn}
              />
              <Button
                label={t("partner.newContract")}
                variant="soft"
                onPress={() => router.push("/partner/contract")}
                style={styles.actionBtn}
              />
            </View>
            <Button
              label={t("partner.messages")}
              variant="ink"
              onPress={() => router.push("/chat/demo-seller")}
              style={styles.fullBtn}
            />

            <Text style={styles.section}>{t("partner.recentBookings")}</Text>
            {bookings.slice(0, 2).map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                formatListing={formatListing}
                t={t}
                onAccept={() => setBookingStatus(b.id, "accepted")}
                onReject={() => setBookingStatus(b.id, "rejected")}
              />
            ))}
          </>
        ) : null}

        {tab === "sales" ? (
          <>
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => router.push("/(tabs)/sell")}
              activeOpacity={0.9}
            >
              <Plus size={18} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.addText}>{t("partner.newListing")}</Text>
            </TouchableOpacity>
            {DEMO_PARTNER_SALES.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Badge
                    label={t(`partner.status.${item.status}`)}
                    tone={statusTone(item.status)}
                  />
                </View>
                <Text style={styles.cardMeta}>
                  {item.city} · {item.views} {t("partner.views")}
                </Text>
                <Text style={styles.cardPrice}>
                  {formatListing(item.price, item.currency)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {tab === "rentals" ? (
          <>
            <Text style={styles.section}>{t("partner.rentalFleet")}</Text>
            {DEMO_RENTALS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                onPress={() => router.push(`/rental/${r.id}`)}
                activeOpacity={0.9}
              >
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {r.vehicle.title_original}
                </Text>
                <Text style={styles.cardMeta}>
                  {r.city} · {formatListing(r.daily_rate_amount, r.daily_rate_currency)}{" "}
                  {t("rentals.perDay")}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.section}>{t("partner.bookingRequests")}</Text>
            {bookings.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                formatListing={formatListing}
                t={t}
                onAccept={() => setBookingStatus(b.id, "accepted")}
                onReject={() => setBookingStatus(b.id, "rejected")}
              />
            ))}
          </>
        ) : null}

        {tab === "contracts" ? (
          <>
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => router.push("/partner/contract")}
              activeOpacity={0.9}
            >
              <FileText size={18} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.addText}>{t("partner.newContract")}</Text>
            </TouchableOpacity>
            {DEMO_CONTRACTS.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Badge
                    label={t(`partner.contractStatus.${c.status}`)}
                    tone={statusTone(c.status)}
                  />
                </View>
                <Text style={styles.cardMeta}>
                  {t(`partner.contractType.${c.type}`)} · {c.party} ·{" "}
                  {localeNativeName[c.locale as LocaleCode] ?? c.locale}
                </Text>
                <Text style={styles.cardPrice}>
                  {formatListing(c.amount, c.currency)}
                </Text>
                <Text style={styles.cardMeta}>{c.createdAt}</Text>
              </View>
            ))}
          </>
        ) : null}

        <TouchableOpacity
          style={styles.meetRow}
          onPress={() =>
            router.push({
              pathname: "/meet/[id]",
              params: { id: "partner-guest", name: t("meet.sellerDefault") },
            })
          }
          activeOpacity={0.9}
        >
          <MessageCircle size={16} color={colors.flame} strokeWidth={2.2} />
          <Text style={styles.meetText}>{t("partner.inAppMeet")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BookingRow({
  booking,
  formatListing,
  t,
  onAccept,
  onReject,
}: {
  booking: DemoPartnerBooking;
  formatListing: (n: number, c: string) => string;
  t: (k: string) => string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {booking.rentalTitle}
        </Text>
        <Badge
          label={t(`partner.bookingStatus.${booking.status}`)}
          tone={statusTone(booking.status)}
        />
      </View>
      <Text style={styles.cardMeta}>
        {booking.guest} · {booking.city}
      </Text>
      <Text style={styles.cardMeta}>
        {booking.start} → {booking.end}
      </Text>
      <Text style={styles.cardPrice}>
        {formatListing(booking.amount, booking.currency)}
      </Text>
      {booking.status === "pending" ? (
        <View style={styles.bookingActions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.85}>
            <X size={16} color={colors.danger} strokeWidth={2.2} />
            <Text style={styles.rejectText}>{t("partner.reject")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
            <Check size={16} color={colors.white} strokeWidth={2.2} />
            <Text style={styles.acceptText}>{t("partner.accept")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.sm,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stat: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    ...shadow.soft,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontFamily: fonts.displayMed,
    fontSize: 20,
    color: colors.ink,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: space.sm },
  actionBtn: { flex: 1 },
  fullBtn: { marginTop: 4 },
  section: {
    marginTop: space.md,
    marginBottom: 4,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.flameSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    padding: space.md,
    marginBottom: 4,
  },
  addText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 4,
    ...shadow.soft,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  cardPrice: {
    marginTop: 4,
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.flameDeep,
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: space.sm,
  },
  rejectBtn: {
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
  acceptBtn: {
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
  meetRow: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: space.md,
  },
  meetText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
});
