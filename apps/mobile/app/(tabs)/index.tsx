import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Droplets,
  Gavel,
  Mic,
  Newspaper,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BrandStrip } from "../../components/BrandStrip";
import { AppHeader } from "../../components/brand";
import { PromoCarousel } from "../../components/PromoCarousel";
import { RecentTriplesCarousel } from "../../components/RecentTriplesCarousel";
import { Skeleton } from "../../components/Skeleton";
import { type VehicleListItem } from "../../components/VehicleCard";
import { Badge, Chip, SectionHeader } from "../../components/ui";
import { api } from "../../lib/api";
import { withBrandLogos } from "../../lib/brand-logos";
import { MARKET_CITIES, useCityStore } from "../../lib/city-store";
import { DEMO_VEHICLES, type DemoAuction } from "../../lib/demo-data";
import { useCurrencyStore } from "../../lib/currency-store";
import { isResponsiveDealer } from "../../lib/marketplace-heuristics";
import {
  readVehiclesSnapshot,
  writeVehiclesSnapshot,
} from "../../lib/offline-snapshot";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type StoreItem = {
  id: string;
  name: string;
  city?: string;
  verified?: boolean;
  rating_avg?: number;
  cover_url?: string;
};

const BODY_TYPES = [
  {
    key: "SUV",
    label: "SUV",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=600&q=80",
  },
  {
    key: "Sedan",
    label: "Sedan",
    image:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80",
  },
  {
    key: "Hatchback",
    label: "Hatch",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80",
  },
  {
    key: "Pickup",
    label: "Pickup",
    image:
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=600&q=80",
  },
  {
    key: "Hibrit",
    label: "Hibrit",
    image:
      "https://images.unsplash.com/photo-1593941707881-a5cfde87040b?auto=format&fit=crop&w=600&q=80",
  },
  {
    key: "Elektrik",
    label: "EV",
    image:
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80",
  },
];

const STORY_CHIPS = [
  { key: "verified", labelKey: "home.trustVerified", go: () => router.push({ pathname: "/(tabs)/search", params: { openResults: "1" } }) },
  { key: "auction", labelKey: "home.auctions", go: () => router.push("/auctions") },
  { key: "rent", labelKey: "hub.rent", go: () => router.push("/(tabs)/rentals") },
  { key: "boost", labelKey: "hub.boost", go: () => router.push("/boost") },
  { key: "social", labelKey: "hub.socialAgency", go: () => router.push("/social-agency") },
] as const;

const HUB_MORE = [
  { key: "guide", Icon: Newspaper, labelKey: "hub.guide", go: () => router.push("/guide") },
  { key: "wash", Icon: Droplets, labelKey: "hub.wash", go: () => router.push("/car-wash") },
  { key: "shared", Icon: Users, labelKey: "hub.sharedRide", go: () => router.push("/shared-ride") },
  { key: "social", Icon: Share2, labelKey: "hub.socialAgency", go: () => router.push("/social-agency") },
  { key: "pay", Icon: Wallet, labelKey: "hub.pay", go: () => router.push("/wallet") },
  { key: "auctions", Icon: Gavel, labelKey: "home.auctions", go: () => router.push("/auctions") },
] as const;

/** IQD budget shortcut bands (millions). */
const BUDGET_BANDS = [
  { maxPrice: 10_000_000, labelKey: "home.budgetUnder10M" },
  { maxPrice: 25_000_000, labelKey: "home.budgetUnder25M" },
  { maxPrice: 50_000_000, labelKey: "home.budgetUnder50M" },
  { maxPrice: 100_000_000, labelKey: "home.budgetUnder100M" },
] as const;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const selectedCity = useCityStore((s) => s.city);
  const setSelectedCity = useCityStore((s) => s.setCity);

  const searchParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedCity !== "all") params.city = selectedCity;
    return params;
  }, [selectedCity]);

  const goSearch = (extra?: Record<string, string>) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { ...searchParams, ...extra },
    });
  };

  const { data: liveAuctions = [] } = useQuery({
    queryKey: ["live-auctions"],
    queryFn: () =>
      api.rpc<DemoAuction[]>("list_live_auctions", { p_limit: 10 }).then((rows) =>
        Array.isArray(rows) ? rows : [],
      ),
    staleTime: 30_000,
  });

  const { data: recent, isLoading } = useQuery({
    queryKey: ["vehicles-recent", i18n.language],
    queryFn: async () => {
      try {
        const feed = await api.rpc<VehicleListItem[]>("list_active_listings_feed", {
          p_limit: 12,
          p_offset: 0,
          p_locale: i18n.language,
        });
        if (Array.isArray(feed) && feed.length > 0) {
          void writeVehiclesSnapshot(feed);
          return feed;
        }
      } catch {
        /* fall through */
      }

      try {
        const search = await api.rpc<VehicleListItem[]>("search_vehicles", {
          p_locale: i18n.language,
          p_sort_by: "created_at",
          p_sort_dir: "desc",
          p_page_size: 10,
          p_page_offset: 0,
        });
        if (Array.isArray(search) && search.length > 0) {
          void writeVehiclesSnapshot(search);
          return search;
        }
      } catch {
        /* fall through to snapshot */
      }

      const snap = await readVehiclesSnapshot();
      return snap ?? [];
    },
  });

  const { data: listingCount } = useQuery({
    queryKey: ["active-listing-count"],
    queryFn: () => api.rpc<number>("count_active_listings"),
    staleTime: 60_000,
  });

  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () =>
      api.rpc<{ brands: Array<{ id: number; name: string }> }>("list_reference_data", {
        p_locale: i18n.language,
      }),
    staleTime: 60 * 60 * 1000,
  });

  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: () =>
      api.rpc<StoreItem[]>("list_stores", {}).then((rows) =>
        Array.isArray(rows) ? rows : [],
      ),
  });

  const brands = withBrandLogos(refs?.brands ?? []);
  const vehicles = recent ?? [];
  const inventoryCount =
    typeof listingCount === "number" && listingCount > 0
      ? listingCount
      : DEMO_VEHICLES.length > 0
        ? DEMO_VEHICLES.length
        : Math.max(vehicles.length, 1);
  const featured = vehicles.filter((v) => v.featured).slice(0, 5);
  const featuredList = featured.length > 0 ? featured : vehicles.slice(0, 4);

  const featuredDealers = useMemo(() => {
    const rows = stores ?? [];
    const verified = rows.filter((s) => s.verified);
    const rest = rows.filter((s) => !s.verified);
    return [...verified, ...rest].slice(0, 8);
  }, [stores]);

  const popularModels = useMemo(() => {
    const map = new Map<string, { name: string; count: number; cover_url?: string | null }>();
    const source = DEMO_VEHICLES.length > 0 ? DEMO_VEHICLES : vehicles;
    for (const v of source) {
      const key = [v.make_name, v.model].filter(Boolean).join(" ").trim();
      if (!key) continue;
      const cur = map.get(key);
      const cover = (v as { cover_url?: string | null }).cover_url;
      if (cur) {
        cur.count += 1;
        if (!cur.cover_url && cover) cur.cover_url = cover;
      } else {
        map.set(key, { name: key, count: 1, cover_url: cover });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [vehicles]);


  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AppHeader />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sheet}>
          <PromoCarousel items={featuredList} />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyRow}
          >
            {STORY_CHIPS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.storyChip}
                onPress={s.go}
                activeOpacity={0.88}
              >
                <Text style={styles.storyChipText}>{t(s.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <ShieldCheck size={16} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.trustText}>{t("home.trustVerified")}</Text>
            </View>
            <View style={styles.trustItem}>
              <Sparkles size={16} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.trustText}>{t("home.trustAi")}</Text>
            </View>
            <View style={styles.trustItem}>
              <Wallet size={16} color={colors.flame} strokeWidth={2.2} />
              <Text style={styles.trustText}>{t("home.trustWallet")}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityRow}
          >
            <Chip
              label={t("common.all")}
              selected={selectedCity === "all"}
              onPress={() => void setSelectedCity("all")}
              style={styles.cityChip}
            />
            {MARKET_CITIES.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={selectedCity === c}
                onPress={() => void setSelectedCity(c)}
                style={styles.cityChip}
              />
            ))}
          </ScrollView>

          <View style={styles.searchCta}>
            <Text style={styles.searchCtaTitle}>{t("home.findPerfect")}</Text>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => goSearch()}
              activeOpacity={0.9}
            >
              <Search size={18} color={colors.inkFaint} strokeWidth={2} />
              <Text style={styles.searchPlaceholder}>{t("home.searchPlaceholder")}</Text>
              <TouchableOpacity
                style={styles.micBtn}
                onPress={() => router.push("/voice")}
                hitSlop={6}
              >
                <Mic size={16} color={colors.flame} strokeWidth={2.2} />
              </TouchableOpacity>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchSubmit}
              onPress={() => goSearch({ openResults: "1" })}
              activeOpacity={0.9}
            >
              <Text style={styles.searchSubmitText}>
                {(t as (key: string, opts?: Record<string, string>) => string)(
                  "home.searchCars",
                  { count: inventoryCount.toLocaleString("tr-TR") },
                )}
              </Text>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.budgetRow}
            >
              {BUDGET_BANDS.map((band) => (
                <TouchableOpacity
                  key={band.maxPrice}
                  style={styles.budgetChip}
                  onPress={() =>
                    goSearch({
                      maxPrice: String(band.maxPrice),
                      openResults: "1",
                    })
                  }
                  activeOpacity={0.88}
                >
                  <Text style={styles.budgetChipText}>{t(band.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.hub}>
            <TouchableOpacity
              style={styles.moreToggle}
              onPress={() => setMoreOpen((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.moreToggleText}>{t("hub.moreServices")}</Text>
              {moreOpen ? (
                <ChevronUp size={16} color={colors.inkMuted} strokeWidth={2.2} />
              ) : (
                <ChevronDown size={16} color={colors.inkMuted} strokeWidth={2.2} />
              )}
            </TouchableOpacity>

            {moreOpen ? (
              <View style={styles.hubMoreGrid}>
                {HUB_MORE.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.hubMoreTile}
                      onPress={item.go}
                      activeOpacity={0.88}
                    >
                      <Icon size={16} color={colors.flame} strokeWidth={2.2} />
                      <Text style={styles.hubMoreLabel}>{t(item.labelKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.aiRow}
            onPress={() => router.push("/ai-assistant")}
            activeOpacity={0.9}
          >
            <View style={styles.aiIcon}>
              <Sparkles size={16} color={colors.flame} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.aiTitle}>{t("home.aiAssistant")}</Text>
              <Text style={styles.aiSub}>{t("home.aiAssistantPrompt")}</Text>
            </View>
          </TouchableOpacity>

          {liveAuctions.length > 0 ? (
            <View style={styles.sectionTight}>
              <SectionHeader
                title={t("home.auctions")}
                actionLabel={t("home.seeAll")}
                onAction={() => router.push("/auctions")}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.auctionRow}
              >
                {liveAuctions.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={styles.auctionCard}
                    onPress={() => router.push(`/auction/${a.id}`)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: a.cover_url }}
                      style={styles.auctionImage}
                      resizeMode="cover"
                    />
                    <View style={styles.auctionLive}>
                      <Gavel size={11} color={colors.white} strokeWidth={2.2} />
                      <Text style={styles.auctionLiveText}>{t("auction.status.live")}</Text>
                    </View>
                    <View style={styles.auctionBody}>
                      <Text style={styles.auctionTitle} numberOfLines={2}>
                        {a.title}
                      </Text>
                      <Text style={styles.auctionBid}>
                        {formatListing(a.current_bid, a.currency)}
                      </Text>
                      <Text style={styles.auctionMeta}>
                        {a.bid_count} {t("auction.bids")} · {a.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title={t("home.categories")} padded={false} />
            <View style={styles.catGrid}>
              {BODY_TYPES.map((b) => (
                <TouchableOpacity
                  key={b.key}
                  style={styles.catTile}
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/search", params: { q: b.key } })
                  }
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: b.image }} style={styles.catImage} />
                  <View style={styles.catOverlay}>
                    <Text style={styles.catLabel}>{b.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {popularModels.length > 0 ? (
            <View style={styles.sectionTight}>
              <SectionHeader title="Popüler modeller" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularRow}
              >
                {popularModels.map((m) => (
                  <TouchableOpacity
                    key={m.name}
                    style={styles.popularCard}
                    onPress={() =>
                      router.push({ pathname: "/(tabs)/search", params: { q: m.name } })
                    }
                    activeOpacity={0.88}
                  >
                    {m.cover_url ? (
                      <Image source={{ uri: m.cover_url }} style={styles.popularImage} />
                    ) : (
                      <View style={[styles.popularImage, styles.popularPh]} />
                    )}
                    <Text style={styles.popularCardTitle} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.popularCardMeta}>{m.count} ilan</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.sectionTight}>
            <SectionHeader
              title={t("home.popularBrands")}
              actionLabel={t("home.seeAll")}
              onAction={() => router.push("/(tabs)/search")}
            />
            <BrandStrip
              brands={brands}
              onSelect={(b) =>
                router.push({
                  pathname: "/(tabs)/search",
                  params: { make: b.name, makeId: String(b.id) },
                })
              }
              limit={20}
            />
          </View>

          {storesLoading || featuredDealers.length > 0 ? (
            <View style={styles.sectionTight}>
              <SectionHeader
                title={t("home.featuredDealers")}
                actionLabel={t("home.seeAll")}
                onAction={() => router.push("/(tabs)/stores")}
              />
              {storesLoading ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dealerRow}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.dealerCard}>
                      <Skeleton height={96} rounded="lg" style={styles.dealerSkeletonCover} />
                      <View style={styles.dealerBody}>
                        <Skeleton width="75%" height={13} style={styles.dealerSkeletonGap} />
                        <Skeleton width="45%" height={11} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dealerRow}
                >
                  {featuredDealers.map((store) => {
                    const responsive = isResponsiveDealer({
                      verified: store.verified,
                      rating_avg: store.rating_avg,
                    });
                    return (
                      <TouchableOpacity
                        key={store.id}
                        style={styles.dealerCard}
                        onPress={() => router.push(`/seller/${store.id}`)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.dealerCoverWrap}>
                          {store.cover_url ? (
                            <Image
                              source={{ uri: store.cover_url }}
                              style={styles.dealerCover}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.dealerCover, styles.dealerCoverFallback]}>
                              <Store size={24} color={colors.flame} strokeWidth={1.8} />
                            </View>
                          )}
                        </View>
                        <View style={styles.dealerBody}>
                          <Text style={styles.dealerName} numberOfLines={1}>
                            {store.name}
                          </Text>
                          <Text style={styles.dealerCity} numberOfLines={1}>
                            {store.city || "—"}
                          </Text>
                          <View style={styles.dealerBadgeRow}>
                            {store.verified ? (
                              <Badge
                                label={t("vehicle.verifiedBadge")}
                                tone="viridian"
                                icon={
                                  <ShieldCheck
                                    size={11}
                                    color={colors.viridianDeep}
                                    strokeWidth={2.5}
                                  />
                                }
                              />
                            ) : null}
                            {responsive ? (
                              <Badge
                                label={t("vehicle.responsiveBadge")}
                                tone="mist"
                                icon={
                                  <Zap size={11} color={colors.flameDeep} strokeWidth={2.5} />
                                }
                              />
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title={t("home.recentListings")}
              actionLabel={t("home.seeAll")}
              onAction={() => router.push("/(tabs)/search")}
              padded={false}
            />

            {isLoading || vehicles.length > 0 ? (
              <RecentTriplesCarousel items={vehicles} loading={isLoading} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Henüz ilan yok</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/(tabs)/sell")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.emptyBtnText}>İlan Ver</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { paddingBottom: 48 },
  sheet: {
    backgroundColor: colors.paper,
    paddingTop: space.md,
  },
  searchCta: {
    marginHorizontal: space.xl,
    marginBottom: space.xl,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
  },
  searchCtaTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.white,
    marginBottom: 2,
  },
  cityRow: {
    gap: 8,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  cityChip: {
    flexShrink: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchSubmit: {
    backgroundColor: colors.flame,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  searchSubmitText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
  budgetRow: {
    gap: 8,
    paddingTop: 4,
  },
  budgetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  budgetChipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.white,
  },
  hub: {
    marginHorizontal: space.xl,
    marginBottom: space.xl,
    gap: space.md,
  },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  moreToggleText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.inkMuted,
  },
  hubMoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hubMoreTile: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  hubMoreLabel: {
    flex: 1,
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.ink,
  },
  aiRow: {
    marginHorizontal: space.xl,
    marginBottom: space.xxl,
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
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  aiSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  section: { paddingHorizontal: space.xl, marginBottom: space.xxl },
  sectionTight: { marginBottom: space.xxl },
  storyRow: {
    gap: 8,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  storyChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  storyChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  trustRow: {
    flexDirection: "row",
    marginHorizontal: space.xl,
    marginBottom: space.md,
    gap: 8,
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  trustText: {
    fontFamily: fonts.bodyMed,
    fontSize: 10,
    color: colors.inkMuted,
    textAlign: "center",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  catTile: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    height: 96,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  catImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  catOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 10,
    backgroundColor: "rgba(10,10,10,0.28)",
  },
  catLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  auctionRow: {
    paddingHorizontal: space.xl,
    gap: 12,
  },
  auctionCard: {
    width: 220,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  auctionImage: { width: "100%", height: 120 },
  auctionLive: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.flame,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  auctionLiveText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.white,
  },
  auctionBody: { padding: space.md, gap: 4 },
  auctionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
    minHeight: 34,
  },
  auctionBid: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.flameDeep,
  },
  auctionMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  popularRow: {
    paddingHorizontal: space.xl,
    gap: 10,
  },
  popularCard: {
    width: 168,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  popularImage: {
    width: "100%",
    height: 100,
    backgroundColor: colors.mist,
  },
  popularPh: {
    backgroundColor: colors.line,
  },
  popularCardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  popularCardMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  dealerRow: {
    paddingHorizontal: space.xl,
    gap: 12,
  },
  dealerCard: {
    width: 168,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.soft,
  },
  dealerCoverWrap: {
    height: 96,
    backgroundColor: colors.mist,
    position: "relative",
  },
  dealerCover: { width: "100%", height: "100%" },
  dealerCoverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  dealerVerified: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(10,10,10,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  dealerBody: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    gap: 3,
  },
  dealerBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  dealerName: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  dealerCity: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  dealerSkeletonCover: { borderRadius: 0 },
  dealerSkeletonGap: { marginBottom: 6 },
  skeletonList: {
    gap: 0,
  },
  empty: {
    alignItems: "center",
    paddingVertical: space.xxl,
    gap: space.md,
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  emptyBtn: {
    backgroundColor: colors.flame,
    paddingHorizontal: space.xl,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  emptyBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
});
