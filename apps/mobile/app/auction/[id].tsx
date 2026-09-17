import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Clock,
  Gavel,
  MapPin,
  Shield,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import {
  getDemoAuction,
  type AuctionStatus,
  type DemoAuction,
  type DemoAuctionBid,
  type DemoAuctionBidRow,
} from "../../lib/demo-data";
import { useCurrencyStore } from "../../lib/currency-store";
import { useWalletStore } from "../../lib/wallet-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

function statusTone(status: AuctionStatus): "viridian" | "brass" | "mist" {
  if (status === "live") return "viridian";
  if (status === "upcoming") return "brass";
  return "mist";
}

function useCountdown(targetIso: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return useMemo(() => {
    if (!targetIso) return null;
    const diff = new Date(targetIso).getTime() - now;
    if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
    const total = Math.floor(diff / 1000);
    return {
      h: Math.floor(total / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
      done: false,
    };
  }, [targetIso, now]);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function bidsFromRows(
  rows: DemoAuctionBidRow[] | undefined,
  currency: DemoAuction["currency"],
): DemoAuctionBid[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((r) => ({
    id: String(r.id),
    bidder: String(r.bidder_label ?? "—"),
    amount: Number(r.amount ?? 0),
    currency,
    at: String(r.created_at ?? new Date().toISOString()),
  }));
}

export default function AuctionDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const hydrateWallet = useWalletStore((s) => s.hydrate);

  const seed = getDemoAuction(id ?? "");
  const [auction, setAuction] = useState<DemoAuction | undefined>(seed);
  const [placing, setPlacing] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  const livePoll = screenFocused ? 4_000 : false;

  const { data: liveRows, dataUpdatedAt: liveUpdatedAt } = useQuery({
    queryKey: ["live-auctions", "detail", id],
    queryFn: () =>
      api.rpc<DemoAuction[]>("list_live_auctions", { p_limit: 40 }).then((rows) =>
        Array.isArray(rows) ? rows : [],
      ),
    enabled: !!id,
    refetchInterval: livePoll,
    staleTime: 0,
  });

  const { data: bidRows, dataUpdatedAt: bidsUpdatedAt } = useQuery({
    queryKey: ["auction-bids", id],
    queryFn: () =>
      api
        .rpc<DemoAuctionBidRow[]>("list_auction_bids", {
          p_auction_id: id,
          p_limit: 40,
        })
        .then((rows) => (Array.isArray(rows) ? rows : [])),
    enabled: !!id,
    refetchInterval: livePoll,
    staleTime: 0,
  });

  useEffect(() => {
    if (!id) return;
    const demo = getDemoAuction(id);
    const fromApi = liveRows?.find((a) => a.id === id);
    const base = fromApi ?? demo ?? auction;
    if (!base) return;

    const remoteBids = bidsFromRows(bidRows, base.currency);
    const highFromBids =
      remoteBids.length > 0
        ? Math.max(...remoteBids.map((b) => b.amount))
        : 0;
    const nextCurrent = Math.max(
      Number(base.current_bid ?? 0),
      highFromBids,
      Number(auction?.current_bid ?? 0),
    );
    const nextBids =
      remoteBids.length > 0
        ? remoteBids
        : auction?.bids?.length
          ? auction.bids
          : base.bids;

    setAuction({
      ...base,
      current_bid: nextCurrent,
      bid_count: Math.max(
        Number(base.bid_count ?? 0),
        nextBids.length,
        Number(auction?.bid_count ?? 0),
      ),
      bids: nextBids,
    });
    // Merge on poll ticks; auction local state is intentionally read for floor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, liveRows, bidRows, liveUpdatedAt, bidsUpdatedAt]);

  const countdownTarget =
    auction?.status === "upcoming"
      ? auction.start_at
      : auction?.status === "live"
        ? auction.end_at
        : null;
  const countdown = useCountdown(countdownTarget);

  if (!auction) {
    return (
      <SafeAreaView style={styles.missing} edges={["top"]}>
        <Text style={styles.missingText}>{t("errors.notFound")}</Text>
        <Button label={t("common.back")} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const nextBid = auction.current_bid + auction.min_increment;
  const reserveMet =
    auction.reserve_price == null || auction.current_bid >= auction.reserve_price;

  const applyLocalBid = (amount: number) => {
    const bid: DemoAuctionBid = {
      id: `local-${Date.now()}`,
      bidder: "Sen",
      amount,
      currency: auction.currency,
      at: new Date().toISOString(),
    };
    setAuction({
      ...auction,
      current_bid: amount,
      bid_count: auction.bid_count + 1,
      bids: [bid, ...auction.bids],
    });
  };

  const placeBid = async () => {
    if (auction.status !== "live") return;
    setPlacing(true);
    try {
      const remote = await api.rpc<{
        ok?: boolean;
        amount?: number;
        current_bid?: number;
        bid_count?: number;
        bid_id?: string;
      } | null>("place_bid", {
        p_auction_id: auction.id,
        p_amount: nextBid,
      });

      if (remote && typeof remote === "object" && remote.ok !== false) {
        const amount = Number(remote.current_bid ?? remote.amount ?? nextBid);
        const bidCount = Number(remote.bid_count ?? auction.bid_count + 1);
        const bid: DemoAuctionBid = {
          id: String(remote.bid_id ?? `rpc-${Date.now()}`),
          bidder: "Sen",
          amount,
          currency: auction.currency,
          at: new Date().toISOString(),
        };
        setAuction({
          ...auction,
          current_bid: amount,
          bid_count: bidCount,
          bids: [bid, ...auction.bids],
        });
        void hydrateWallet();
        Alert.alert(
          t("auction.bidPlaced"),
          t("auction.bidPlacedBody", {
            amount: formatListing(amount, auction.currency),
          }),
        );
        return;
      }

      applyLocalBid(nextBid);
      Alert.alert(
        t("auction.bidPlaced"),
        t("auction.bidPlacedBody", {
          amount: formatListing(nextBid, auction.currency),
        }),
      );
    } catch {
      applyLocalBid(nextBid);
      Alert.alert(
        t("auction.bidPlaced"),
        t("auction.bidPlacedBody", {
          amount: formatListing(nextBid, auction.currency),
        }),
      );
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={{ uri: auction.cover_url }} style={styles.heroImage} resizeMode="cover" />
          <SafeAreaView edges={["top"]} style={styles.heroTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
              <ChevronLeft size={22} color={colors.white} strokeWidth={2.2} />
            </TouchableOpacity>
            <Badge label={t(`auction.status.${auction.status}`)} tone={statusTone(auction.status)} />
          </SafeAreaView>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>{auction.title}</Text>
          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.inkFaint} strokeWidth={2} />
            <Text style={styles.meta}>{auction.city}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.meta}>
              {auction.bid_count} {t("auction.bids")}
            </Text>
            {auction.status === "live" && screenFocused ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.liveHint}>{t("auction.liveUpdating")}</Text>
              </>
            ) : null}
          </View>

          {countdown && !countdown.done ? (
            <View style={styles.countdownCard}>
              <Clock size={16} color={colors.flame} strokeWidth={2.2} />
              <View style={styles.flex}>
                <Text style={styles.countdownLabel}>
                  {auction.status === "upcoming"
                    ? t("auction.startsIn")
                    : t("auction.endsIn")}
                </Text>
                <Text style={styles.countdownValue}>
                  {pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t("auction.currentBid")}</Text>
              <Text style={styles.statValue}>
                {formatListing(auction.current_bid, auction.currency)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t("auction.startPrice")}</Text>
              <Text style={styles.statMuted}>
                {formatListing(auction.start_price, auction.currency)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{t("auction.reserve")}</Text>
              <Text style={[styles.statMuted, reserveMet && styles.reserveMet]}>
                {auction.reserve_price
                  ? formatListing(auction.reserve_price, auction.currency)
                  : t("auction.noReserve")}
              </Text>
              {auction.reserve_price ? (
                <Text style={styles.reserveHint}>
                  {reserveMet ? t("auction.reserveMet") : t("auction.reserveNotMet")}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("auction.bidHistory")}</Text>
            {auction.bids.length === 0 ? (
              <Text style={styles.emptyBids}>{t("auction.noBidsYet")}</Text>
            ) : (
              auction.bids.map((b) => (
                <View key={b.id} style={styles.bidRow}>
                  <View style={styles.bidAvatar}>
                    <Gavel size={14} color={colors.flame} strokeWidth={2} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.bidName}>{b.bidder}</Text>
                    <Text style={styles.bidTime}>
                      {new Date(b.at).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.bidAmount}>
                    {formatListing(b.amount, b.currency)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.vehicleLink}
            onPress={() => router.push(`/vehicle/${auction.vehicle_id}`)}
            activeOpacity={0.88}
          >
            <Shield size={16} color={colors.flame} strokeWidth={2} />
            <Text style={styles.vehicleLinkText}>{t("auction.viewListing")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {auction.status === "live" ? (
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.nextLabel}>{t("auction.nextBid")}</Text>
              <Text style={styles.nextValue}>
                {formatListing(nextBid, auction.currency)}
              </Text>
              <Text style={styles.incrementHint}>
                +{formatListing(auction.min_increment, auction.currency)}{" "}
                {t("auction.minIncrement")}
              </Text>
            </View>
            <Button
              label={t("auction.placeBid")}
              onPress={() => void placeBid()}
              loading={placing}
              style={styles.bidBtn}
            />
          </View>
        </SafeAreaView>
      ) : auction.status === "upcoming" ? (
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
          <View style={styles.bottomBar}>
            <Text style={styles.waitText}>{t("auction.notStarted")}</Text>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafe}>
          <View style={styles.bottomBar}>
            <Text style={styles.waitText}>{t("auction.ended")}</Text>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: 120 },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    backgroundColor: colors.paper,
  },
  missingText: {
    fontFamily: fonts.bodyMed,
    fontSize: 15,
    color: colors.inkMuted,
  },
  hero: { height: 280, backgroundColor: colors.ink },
  heroImage: { width: "100%", height: "100%" },
  heroTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: -24,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  liveHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.viridianDeep,
  },
  dot: { color: colors.inkFaint },
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    ...shadow.soft,
  },
  flex: { flex: 1 },
  countdownLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  countdownValue: {
    fontFamily: fonts.displayMed,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: 1,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  stat: {
    flexGrow: 1,
    minWidth: "30%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.flameDeep,
  },
  statMuted: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  reserveMet: { color: colors.viridianDeep },
  reserveHint: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  section: { marginTop: space.sm, gap: space.sm },
  sectionTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  emptyBids: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  bidRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  bidAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bidName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  bidTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  bidAmount: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  vehicleLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: space.md,
  },
  vehicleLinkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  bottomSafe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    gap: space.md,
  },
  nextLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  nextValue: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
  },
  incrementHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  bidBtn: { minWidth: 140 },
  waitText: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.bodyMed,
    fontSize: 14,
    color: colors.inkMuted,
  },
});
