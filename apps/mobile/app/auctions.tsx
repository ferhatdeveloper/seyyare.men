import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Gavel, MapPin } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "../components/ui/Badge";
import { Chip } from "../components/ui/Chip";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { api } from "../lib/api";
import {
  DEMO_AUCTIONS,
  type AuctionStatus,
  type DemoAuction,
} from "../lib/demo-data";
import { useCurrencyStore } from "../lib/currency-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

type FilterKey = "all" | AuctionStatus;

function formatRemaining(iso: string, status: AuctionStatus): string {
  if (status === "ended") return "—";
  const target = new Date(iso).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return status === "upcoming" ? "Başlıyor" : "Bitti";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}g ${h % 24}s`;
  if (h >= 1) return `${h}s ${m}dk`;
  return `${m} dk`;
}

function statusTone(status: AuctionStatus): "viridian" | "brass" | "mist" {
  if (status === "live") return "viridian";
  if (status === "upcoming") return "brass";
  return "mist";
}

function AuctionCard({
  item,
  formatListing,
  t,
}: {
  item: DemoAuction;
  formatListing: (amount: number, currency: string) => string;
  t: (key: string) => string;
}) {
  const timeLabel =
    item.status === "upcoming"
      ? t("auction.startsIn")
      : item.status === "live"
        ? t("auction.endsIn")
        : t("auction.ended");
  const timeValue =
    item.status === "upcoming"
      ? formatRemaining(item.start_at, item.status)
      : formatRemaining(item.end_at, item.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/auction/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.cover_url }} style={styles.image} resizeMode="cover" />
        <View style={styles.badgeOverlay}>
          <Badge label={t(`auction.status.${item.status}`)} tone={statusTone(item.status)} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={13} color={colors.inkFaint} strokeWidth={2} />
          <Text style={styles.meta}>{item.city}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>
            {item.bid_count} {t("auction.bids")}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>
              {item.status === "upcoming" ? t("auction.startPrice") : t("auction.currentBid")}
            </Text>
            <Text style={styles.price}>
              {formatListing(item.current_bid, item.currency)}
            </Text>
          </View>
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>{timeLabel}</Text>
            <Text style={styles.countdownValue}>{timeValue}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AuctionsScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data: liveFromApi = [] } = useQuery({
    queryKey: ["live-auctions", "list"],
    queryFn: () =>
      api.rpc<DemoAuction[]>("list_live_auctions", { p_limit: 40 }).then((rows) =>
        Array.isArray(rows) ? rows : [],
      ),
    staleTime: 30_000,
  });

  const data = useMemo(() => {
    const demoNonLive = DEMO_AUCTIONS.filter((a) => a.status !== "live");
    const liveIds = new Set(liveFromApi.map((a) => a.id));
    const live =
      liveFromApi.length > 0
        ? liveFromApi
        : DEMO_AUCTIONS.filter((a) => a.status === "live");
    const merged = [...live, ...demoNonLive.filter((a) => !liveIds.has(a.id))];
    if (filter === "all") return merged;
    return merged.filter((a) => a.status === filter);
  }, [filter, liveFromApi]);

  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: t("common.all") },
    { key: "live", label: t("auction.status.live") },
    { key: "upcoming", label: t("auction.status.upcoming") },
    { key: "ended", label: t("auction.status.ended") },
  ];

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("auction.title")}
        subtitle={t("auction.subtitle")}
        onBack={() => router.back()}
        right={<Gavel size={18} color={colors.flame} strokeWidth={2} />}
      />

      <View style={styles.filters}>
        {filters.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      <FlashList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        style={styles.listFlex}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <AuctionCard item={item} formatListing={formatListing} t={t} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t("auction.empty")}</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  listFlex: { flex: 1 },
  list: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
  },
  sep: { height: space.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  imageWrap: { height: 160, backgroundColor: colors.mist },
  image: { width: "100%", height: "100%" },
  badgeOverlay: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
  },
  body: { padding: space.md, gap: 6 },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  dot: { color: colors.inkFaint, marginHorizontal: 2 },
  priceRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  price: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.flameDeep,
  },
  countdown: { alignItems: "flex-end" },
  countdownLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  countdownValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  empty: {
    paddingVertical: space.section,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bodyMed,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
