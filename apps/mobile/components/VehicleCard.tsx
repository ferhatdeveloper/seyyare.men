import { useQueryClient } from "@tanstack/react-query";
import { SoftGradient as LinearGradient } from "./SoftGradient";
import { router } from "expo-router";
import {
  Calendar,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Settings2,
  ShieldCheck,
  Tag,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Badge } from "./ui/Badge";
import { api } from "../lib/api";
import { storage } from "../lib/clients";
import { useCurrencyStore } from "../lib/currency-store";
import { getAuctionForVehicle, getDemoSeller } from "../lib/demo-data";
import { isGoodDeal, isResponsiveDealer } from "../lib/marketplace-heuristics";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

/** Matches queryKey / queryFn in app/vehicle/[id].tsx for warm cache on press. */
async function fetchVehicleDetail(id: string) {
  const demo = api.getDemoVehicle(String(id));
  if (demo) {
    const store = getDemoSeller(String(demo.seller_id ?? "demo-seller")) ?? getDemoSeller("demo-seller")!;
    return {
      id: demo.id,
      title_original: demo.title ?? `${demo.make_name} ${demo.model}`,
      description_original: `${demo.year} model ${demo.make_name} ${demo.model}. ${demo.mileage_km?.toLocaleString("tr-TR")} km, ${demo.fuel_name}, ${demo.transmission_name}. Demo ilan — gerçek API bağlanınca canlı veri gelecek.`,
      description_translations: {},
      title_translations: {},
      make_id: 0,
      model: demo.model ?? "",
      trim: null,
      year: demo.year ?? 0,
      mileage_km: demo.mileage_km ?? null,
      fuel_type_id: 0,
      transmission_id: 0,
      body_type_id: 0,
      color_id: 0,
      condition: "used",
      price_amount: demo.price_amount != null ? Number(demo.price_amount) : null,
      price_currency: demo.price_currency ?? "TRY",
      negotiable: true,
      country_code: demo.country_code ?? "TR",
      city: demo.city ?? null,
      geo_lat: null,
      geo_lng: null,
      status: "active",
      views_count: 128,
      favorites_count: 12,
      features: [],
      created_at: demo.created_at ?? new Date().toISOString(),
      seller_id: store.user_id,
      ai_analysis: [],
      media: demo.cover_url
        ? [{ id: "1", url: demo.cover_url, type: "image" as const, is_cover: true }]
        : [],
      seller: {
        display_name: store.display_name,
        avatar_url: store.avatar_url,
        verified: store.verified,
        rating_avg: store.rating_avg,
        rating_count: store.rating_count,
      },
      fuel_name: demo.fuel_name ?? "—",
      transmission_name: demo.transmission_name ?? "—",
      body_name: demo.body_name ?? "—",
    };
  }

  const rows = await api.get<unknown[]>(
    `/vehicles?id=eq.${id}&select=*,ai_vehicle_analysis(*),vehicle_media(*),seller:users!seller_id(user_profiles(*))`,
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

export interface VehicleListItem {
  id: string;
  title?: string | null;
  make_name?: string | null;
  model?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel_name?: string | null;
  transmission_name?: string | null;
  body_name?: string | null;
  color_name?: string | null;
  price_amount?: number | string | null;
  price_currency?: string | null;
  country_code?: string | null;
  city?: string | null;
  cover_url?: string | null;
  /** Total media count when known from feed/API. */
  media_count?: number | null;
  /** Optional media list; length used when media_count is absent. */
  media?: Array<{ id?: string; url?: string | null }> | null;
  created_at?: string | null;
  verified?: boolean;
  /** Seller verification flag when provided separately from vehicle.verified. */
  seller_verified?: boolean;
  /** Seller rating when provided (responsive dealer heuristic). */
  seller_rating_avg?: number | null;
  featured?: boolean;
  seller_id?: string | null;
  seller_name?: string | null;
}

interface Props {
  vehicle: VehicleListItem;
  onFavoriteChange?: (id: string, isFavorite: boolean) => void;
  initialFavorite?: boolean;
  index?: number;
  /** list = full width marketplace card; featured = horizontal carousel */
  variant?: "list" | "featured";
}

type SpecItem = { key: string; label: string; Icon: LucideIcon };

function resolveMediaTotal(vehicle: VehicleListItem): number | null {
  if (typeof vehicle.media_count === "number" && vehicle.media_count > 0) {
    return vehicle.media_count;
  }
  if (Array.isArray(vehicle.media) && vehicle.media.length > 0) {
    return vehicle.media.length;
  }
  return null;
}

/** DubiCars-style "1/N"; falls back to "1" when only cover is known. */
function photoCounterLabel(vehicle: VehicleListItem): string | null {
  const total = resolveMediaTotal(vehicle);
  if (total != null) return `1/${total}`;
  if (vehicle.cover_url) return "1";
  return null;
}

function buildSpecItems(
  vehicle: VehicleListItem,
  mileageLabel: (km: number) => string,
): SpecItem[] {
  const items: SpecItem[] = [];
  if (vehicle.year != null) {
    items.push({ key: "year", label: String(vehicle.year), Icon: Calendar });
  }
  if (vehicle.mileage_km != null) {
    items.push({
      key: "mileage",
      label: mileageLabel(vehicle.mileage_km),
      Icon: Gauge,
    });
  }
  if (vehicle.fuel_name) {
    items.push({ key: "fuel", label: vehicle.fuel_name, Icon: Fuel });
  }
  if (vehicle.transmission_name) {
    items.push({
      key: "transmission",
      label: vehicle.transmission_name,
      Icon: Settings2,
    });
  }
  return items;
}

function SpecIconRow({
  items,
  compact = false,
}: {
  items: SpecItem[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <View style={[styles.specRow, compact && styles.specRowCompact]}>
      {items.map((item, i) => (
        <View key={item.key} style={styles.specItem}>
          {i > 0 ? <Text style={styles.specDot}>·</Text> : null}
          <item.Icon
            size={compact ? 11 : 13}
            color={colors.inkFaint}
            strokeWidth={2}
          />
          <Text style={[styles.specText, compact && styles.specTextCompact]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function VehicleCard({
  vehicle,
  onFavoriteChange,
  initialFavorite = false,
  index = 0,
  variant = "list",
}: Props) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const fade = useRef(new Animated.Value(0)).current;
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();

  const prefetchDetail = () => {
    void qc.prefetchQuery({
      queryKey: ["vehicle", vehicle.id, i18n.language],
      queryFn: () => fetchVehicleDetail(vehicle.id),
      staleTime: 30_000,
    });
  };

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 6) * 45,
      useNativeDriver: true,
    }).start();
  }, [fade, index]);

  const toggleFavorite = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    onFavoriteChange?.(vehicle.id, next);

    try {
      if (next) {
        await api.post("/favorites", { vehicle_id: vehicle.id });
      } else {
        await api.delete(`/favorites?vehicle_id=eq.${vehicle.id}`);
      }
    } catch {
      setFavorite(!next);
    }
  };

  const formatListing = useCurrencyStore((s) => s.formatListing);
  const price = formatListing(vehicle.price_amount, vehicle.price_currency);
  const makeModel = ((vehicle.make_name ?? "") + " " + (vehicle.model ?? "")).trim();
  const title = vehicle.title ?? (makeModel || t("vehicle.fallbackTitle"));
  const imageUri = vehicle.cover_url
    ? vehicle.cover_url.startsWith("http")
      ? vehicle.cover_url
      : `${storage.url}/${vehicle.cover_url}`
    : null;
  const auction = getAuctionForVehicle(vehicle.id);
  const auctionLive = auction?.status === "live";
  const isVerified = Boolean(vehicle.verified || vehicle.seller_verified);
  const demoSeller =
    vehicle.seller_id != null ? getDemoSeller(String(vehicle.seller_id)) : undefined;
  const ratingAvg = vehicle.seller_rating_avg ?? demoSeller?.rating_avg ?? null;
  const responsive = isResponsiveDealer({
    verified: isVerified || demoSeller?.verified,
    rating_avg: ratingAvg,
  });
  const goodDeal = isGoodDeal({
    price_amount: vehicle.price_amount,
    year: vehicle.year,
    make_name: vehicle.make_name,
  });
  const photoLabel = photoCounterLabel(vehicle);
  const specs = buildSpecItems(vehicle, (km) =>
    t("vehicle.mileageShort", { count: Math.round(km / 1000) }),
  );

  const trustBadges = (
    <>
      {auctionLive ? <Badge label={t("vehicle.auctionBadge")} tone="ink" /> : null}
      {vehicle.featured ? <Badge label={t("vehicle.featuredBadge")} tone="brass" /> : null}
      {goodDeal ? (
        <Badge
          label={t("vehicle.goodDealBadge")}
          tone="brass"
          icon={<Tag size={11} color={colors.brass} strokeWidth={2.5} />}
        />
      ) : null}
      {isVerified ? (
        <Badge
          label={t("vehicle.verifiedBadge")}
          tone="viridian"
          icon={<ShieldCheck size={11} color={colors.viridianDeep} strokeWidth={2.5} />}
        />
      ) : null}
      {responsive ? (
        <Badge
          label={t("vehicle.responsiveBadge")}
          tone="mist"
          icon={<Zap size={11} color={colors.flameDeep} strokeWidth={2.5} />}
        />
      ) : null}
    </>
  );
  const showBadges =
    auctionLive || vehicle.featured || isVerified || responsive || goodDeal;

  if (variant === "featured") {
    return (
      <Animated.View style={{ opacity: fade }}>
        <TouchableOpacity
          style={styles.featured}
          onPressIn={prefetchDetail}
          onPress={() => router.push(`/vehicle/${vehicle.id}`)}
          activeOpacity={0.92}
        >
          <View style={styles.featuredImageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.featuredImage} resizeMode="cover" />
            ) : (
              <View style={[styles.featuredImage, styles.placeholder]}>
                <Text style={styles.placeholderText}>{t("vehicle.noPhoto")}</Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(10,10,10,0.78)"]}
              style={styles.featuredGrad}
            />
            {showBadges ? <View style={styles.featuredBadgeRow}>{trustBadges}</View> : null}
            {photoLabel ? (
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>{photoLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.featuredPrice}>{price}</Text>
          </View>
          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle} numberOfLines={1}>
              {title}
            </Text>
            <SpecIconRow items={specs.slice(0, 3)} compact />
            {vehicle.city ? (
              <View style={styles.featuredLoc}>
                <MapPin size={11} color={colors.inkFaint} strokeWidth={2} />
                <Text style={styles.featuredMeta} numberOfLines={1}>
                  {vehicle.city}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        style={styles.card}
        onPressIn={prefetchDetail}
        onPress={() => router.push(`/vehicle/${vehicle.id}`)}
        activeOpacity={0.92}
      >
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>{t("vehicle.noPhoto")}</Text>
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(10,10,10,0.35)"]}
            style={styles.imageGrad}
          />

          {showBadges ? <View style={styles.badgeRow}>{trustBadges}</View> : null}

          {photoLabel ? (
            <View style={[styles.photoCounter, styles.photoCounterList]}>
              <Text style={styles.photoCounterText}>{photoLabel}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite} hitSlop={8}>
            <Heart
              size={17}
              color={favorite ? colors.danger : colors.ink}
              fill={favorite ? colors.danger : "transparent"}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.price}>{price}</Text>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {vehicle.seller_name && vehicle.seller_id ? (
            <TouchableOpacity
              onPress={() => router.push(`/seller/${vehicle.seller_id}`)}
              hitSlop={6}
              style={styles.sellerRow}
            >
              <Text style={styles.storeName} numberOfLines={1}>
                {vehicle.seller_name}
              </Text>
              {isVerified ? (
                <ShieldCheck size={13} color={colors.flame} strokeWidth={2.4} />
              ) : null}
            </TouchableOpacity>
          ) : null}

          <SpecIconRow items={specs} />

          <View style={styles.footer}>
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.inkFaint} strokeWidth={2} />
              <Text style={styles.location} numberOfLines={1}>
                {[vehicle.city, vehicle.country_code].filter(Boolean).join(", ") || "—"}
              </Text>
            </View>
            {vehicle.created_at ? (
              <Text style={styles.time}>{timeAgo(vehicle.created_at, t)}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation();
                void Linking.openURL("tel:+905551234567");
              }}
              activeOpacity={0.85}
            >
              <Phone size={14} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.actionText}>{t("vehicle.callSeller")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionWa]}
              onPress={(e) => {
                e.stopPropagation();
                const msg = encodeURIComponent(
                  t("vehicle.whatsappPrefill", { title }),
                );
                void Linking.openURL(`https://wa.me/905551234567?text=${msg}`);
              }}
              activeOpacity={0.85}
            >
              <MessageCircle size={14} color={colors.flameDeep} strokeWidth={2.2} />
              <Text style={[styles.actionText, styles.actionWaText]}>
                {t("vehicle.whatsappSeller")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function timeAgo(date: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (seconds < 60) return t("vehicle.timeJustNow");
  if (seconds < 3600) return t("vehicle.timeMinutes", { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t("vehicle.timeHours", { count: Math.floor(seconds / 3600) });
  if (seconds < 604800) return t("vehicle.timeDays", { count: Math.floor(seconds / 86400) });
  return new Date(date).toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: space.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow.soft,
  },
  imageWrap: { position: "relative", backgroundColor: colors.mist },
  image: { width: "100%", height: 196 },
  imageGrad: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  placeholder: {
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.inkFaint,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 56,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  photoCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(10,10,10,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  photoCounterList: {
    bottom: 10,
    right: 12,
  },
  photoCounterText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.2,
  },
  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  body: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  price: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  title: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: fonts.displayMed,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sellerRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  storeName: {
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    color: colors.flame,
    flexShrink: 1,
  },
  specRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
    gap: 2,
  },
  specRowCompact: {
    marginTop: 6,
    flexWrap: "nowrap",
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  specDot: {
    marginHorizontal: 4,
    fontSize: 12,
    color: colors.inkFaint,
    fontFamily: fonts.body,
  },
  specText: {
    fontSize: 12,
    fontFamily: fonts.bodyMed,
    color: colors.inkMuted,
  },
  specTextCompact: {
    fontSize: 11,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  locationRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  location: {
    fontSize: 12,
    color: colors.inkFaint,
    marginLeft: 4,
    fontFamily: fonts.body,
  },
  time: {
    fontSize: 11,
    color: colors.inkFaint,
    fontFamily: fonts.body,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  actionWa: {
    borderColor: "#FFD8B8",
    backgroundColor: colors.flameSoft,
  },
  actionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  actionWaText: {
    color: colors.flameDeep,
  },

  featured: {
    width: 236,
    marginRight: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.soft,
  },
  featuredImageWrap: { position: "relative" },
  featuredImage: { width: "100%", height: 140 },
  featuredGrad: {
    ...StyleSheet.absoluteFillObject,
    top: 50,
  },
  featuredBadgeRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  featuredPrice: {
    position: "absolute",
    left: 12,
    bottom: 10,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    letterSpacing: -0.3,
  },
  featuredBody: { padding: 12 },
  featuredTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 14,
    color: colors.ink,
  },
  featuredLoc: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  featuredMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    flexShrink: 1,
  },
});
