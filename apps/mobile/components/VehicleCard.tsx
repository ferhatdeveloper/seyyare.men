import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Heart, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
import { colors, fonts, radius, shadow, space } from "../lib/theme";

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
  created_at?: string | null;
  verified?: boolean;
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

export function VehicleCard({
  vehicle,
  onFavoriteChange,
  initialFavorite = false,
  index = 0,
  variant = "list",
}: Props) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const fade = useRef(new Animated.Value(0)).current;

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

  const price = vehicle.price_amount
    ? Number(vehicle.price_amount).toLocaleString("tr-TR")
    : "—";
  const currency = vehicle.price_currency ?? "";
  const makeModel = ((vehicle.make_name ?? "") + " " + (vehicle.model ?? "")).trim();
  const title = vehicle.title ?? (makeModel || "Araç");
  const imageUri = vehicle.cover_url
    ? vehicle.cover_url.startsWith("http")
      ? vehicle.cover_url
      : `${storage.url}/${vehicle.cover_url}`
    : null;

  const specs = [
    vehicle.year != null ? String(vehicle.year) : null,
    vehicle.mileage_km != null ? `${Math.round(vehicle.mileage_km / 1000)} bin km` : null,
    vehicle.fuel_name,
    vehicle.transmission_name,
  ].filter(Boolean) as string[];

  if (variant === "featured") {
    return (
      <Animated.View style={{ opacity: fade }}>
        <TouchableOpacity
          style={styles.featured}
          onPress={() => router.push(`/vehicle/${vehicle.id}`)}
          activeOpacity={0.92}
        >
          <View style={styles.featuredImageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.featuredImage} resizeMode="cover" />
            ) : (
              <View style={[styles.featuredImage, styles.placeholder]}>
                <Text style={styles.placeholderText}>Fotoğraf yok</Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(11,18,32,0.75)"]}
              style={styles.featuredGrad}
            />
            <Text style={styles.featuredPrice}>
              {price}
              {currency ? ` ${currency}` : ""}
            </Text>
          </View>
          <View style={styles.featuredBody}>
            <Text style={styles.featuredTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.featuredMeta} numberOfLines={1}>
              {[vehicle.year, vehicle.city].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fade }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/vehicle/${vehicle.id}`)}
        activeOpacity={0.92}
      >
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>Fotoğraf yok</Text>
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(11,18,32,0.35)"]}
            style={styles.imageGrad}
          />

          {(vehicle.verified || vehicle.featured) && (
            <View style={styles.badgeRow}>
              {vehicle.featured ? <Badge label="Öne çıkan" tone="brass" /> : null}
              {vehicle.verified ? (
                <Badge
                  label="Onaylı"
                  tone="viridian"
                  icon={<ShieldCheck size={11} color={colors.viridianDeep} strokeWidth={2.5} />}
                />
              ) : null}
            </View>
          )}

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
          <Text style={styles.price}>
            {price}
            {currency ? <Text style={styles.currency}> {currency}</Text> : null}
          </Text>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {vehicle.seller_name && vehicle.seller_id ? (
            <TouchableOpacity
              onPress={() => router.push(`/seller/${vehicle.seller_id}`)}
              hitSlop={6}
            >
              <Text style={styles.storeName} numberOfLines={1}>
                {vehicle.seller_name}
              </Text>
            </TouchableOpacity>
          ) : null}

          {specs.length > 0 ? (
            <View style={styles.specRow}>
              {specs.map((s) => (
                <View key={s} style={styles.specChip}>
                  <Text style={styles.specText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.inkFaint} strokeWidth={2} />
              <Text style={styles.location} numberOfLines={1}>
                {[vehicle.city, vehicle.country_code].filter(Boolean).join(", ") || "—"}
              </Text>
            </View>
            {vehicle.created_at ? (
              <Text style={styles.time}>{timeAgo(vehicle.created_at)}</Text>
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
              <Text style={styles.actionText}>Ara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionWa]}
              onPress={(e) => {
                e.stopPropagation();
                const msg = encodeURIComponent(
                  `Merhaba, Seyyare'deki "${title}" ilanı hakkında bilgi almak istiyorum.`,
                );
                void Linking.openURL(`https://wa.me/905551234567?text=${msg}`);
              }}
              activeOpacity={0.85}
            >
              <MessageCircle size={14} color={colors.flameDeep} strokeWidth={2.2} />
              <Text style={[styles.actionText, styles.actionWaText]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function timeAgo(date: string): string {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  if (seconds < 60) return "şimdi";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} dk`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} sa`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün`;
  return new Date(date).toLocaleDateString("tr-TR");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: space.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  imageWrap: { position: "relative", backgroundColor: colors.mist },
  image: { width: "100%", height: 188 },
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
    flexDirection: "row",
    gap: 6,
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
  body: { padding: space.lg },
  price: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.viridian,
    letterSpacing: -0.5,
  },
  currency: {
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    color: colors.viridianDeep,
  },
  title: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: fonts.displayMed,
    color: colors.ink,
    letterSpacing: -0.25,
  },
  storeName: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.bodySemi,
    color: colors.flame,
  },
  specRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  specChip: {
    backgroundColor: colors.mist,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  specText: {
    fontSize: 11,
    fontFamily: fonts.bodyMed,
    color: colors.inkMuted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
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
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
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
    top: 60,
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
  featuredMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
});
