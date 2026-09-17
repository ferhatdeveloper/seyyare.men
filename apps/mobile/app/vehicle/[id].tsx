import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Phone,
  Share2,
  Calendar,
  Gauge,
  Fuel,
  Cog,
  Sparkles,
  Eye,
  MessageCircle,
  ShieldCheck,
  Star,
  Handshake,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../../components/brand";
import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import { getDemoSeller } from "../../lib/demo-data";
import { storage } from "../../lib/clients";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const GALLERY_H = 340;
const BORDER_FLAME = "#FFD8B8";

interface VehicleDetail {
  id: string;
  title_original: string;
  description_original: string;
  description_translations: Record<string, string>;
  title_translations: Record<string, string>;
  make_id: number;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  fuel_type_id: number;
  transmission_id: number;
  body_type_id: number;
  color_id: number;
  condition: string;
  price_amount: number | null;
  price_currency: string;
  negotiable: boolean;
  country_code: string;
  city: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  status: string;
  views_count: number;
  favorites_count: number;
  features: number[];
  created_at: string;
  seller_id: string;
  ai_analysis: Array<{
    recognized_make: string;
    recognized_model: string;
    recognized_year: number | null;
    confidence: number;
    condition_score: number | null;
    suggested_price_amount: number | null;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: "image" | "video";
    is_cover: boolean;
  }>;
  seller: {
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
    rating_avg: number | null;
    rating_count: number | null;
  };
  fuel_name?: string;
  transmission_name?: string;
  body_name?: string;
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [mediaIdx, setMediaIdx] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id, i18n.language],
    queryFn: async () => {
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
        } as VehicleDetail & {
          fuel_name: string;
          transmission_name: string;
          body_name: string;
        };
      }

      const rows = await api.get<VehicleDetail[]>(
        `/vehicles?id=eq.${id}&select=*,ai_vehicle_analysis(*),vehicle_media(*),seller:users!seller_id(user_profiles(*))`,
      );
      return Array.isArray(rows) ? rows[0] : rows;
    },
    enabled: !!id,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (currentlyFavorite: boolean) => {
      if (currentlyFavorite) {
        await api.delete(`/favorites?vehicle_id=eq.${id}`);
      } else {
        await api.post("/favorites", { vehicle_id: id });
      }
    },
    onSuccess: (_data, currentlyFavorite) => {
      setIsFavorite(!currentlyFavorite);
      qc.invalidateQueries({ queryKey: ["vehicle", id] });
    },
  });

  const startChat = async () => {
    if (!(await auth.isAuthenticated())) {
      router.push("/auth/login");
      return;
    }
    try {
      const res = await api.post<{ id: string }>("/conversations", {
        type: "direct",
        vehicle_id: id,
      });
      if (res?.id) {
        router.push(`/chat/${res.id}`);
        return;
      }
      throw new Error("no id");
    } catch {
      const sellerId = vehicle?.seller_id ?? "demo-seller";
      router.push(`/chat/${sellerId}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.flame} />
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.notFoundHeader}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundBody}>
          <Text style={styles.notFoundTitle}>İlan bulunamadı</Text>
          <Text style={styles.notFoundSub}>Bu ilan kaldırılmış veya mevcut değil.</Text>
          <TouchableOpacity style={styles.notFoundBack} onPress={() => router.back()}>
            <Text style={styles.notFoundBackText}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const title =
    vehicle.title_translations?.[i18n.language] ??
    vehicle.title_original ??
    `${vehicle.model} ${vehicle.year}`;
  const description =
    vehicle.description_translations?.[i18n.language] ?? vehicle.description_original;
  const coverUrl = vehicle.media?.[mediaIdx]?.url;
  const sellerName = vehicle.seller?.display_name ?? "Satıcı";
  const ai = vehicle.ai_analysis?.[0];
  const mediaCount = vehicle.media?.length ?? 0;
  const screenW = Dimensions.get("window").width;

  return (
    <View style={styles.safe}>
      <AppHeader />
      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        <View style={styles.galleryWrap}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl.startsWith("http") ? coverUrl : `${storage.url}/${coverUrl}` }}
              style={{ width: screenW, height: GALLERY_H }}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noPhoto}>
              <Text style={styles.noPhotoText}>Fotoğraf yok</Text>
            </View>
          )}

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={styles.topActionsRight}>
              <TouchableOpacity
                style={[styles.iconBtn, styles.iconBtnGap]}
                onPress={async () => {
                  await Share.share({ message: `${title} — Seyyare.men'de görüntüle` });
                }}
              >
                <Share2 size={18} color={colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => favoriteMutation.mutate(isFavorite)}
                disabled={favoriteMutation.isPending}
              >
                <Heart
                  size={18}
                  color={colors.danger}
                  fill={isFavorite ? colors.danger : "transparent"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mediaCount > 0 ? (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {mediaIdx + 1} / {mediaCount}
              </Text>
            </View>
          ) : null}

          {mediaCount > 1 ? (
            <View style={styles.dots}>
              {vehicle.media.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dot, i === mediaIdx && styles.dotActive]}
                  onPress={() => setMediaIdx(i)}
                />
              ))}
            </View>
          ) : null}

          {mediaCount > 1 ? (
            <>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnLeft]}
                onPress={() => setMediaIdx((i) => (i > 0 ? i - 1 : vehicle.media.length - 1))}
              >
                <ChevronLeft size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnRight]}
                onPress={() => setMediaIdx((i) => (i < vehicle.media.length - 1 ? i + 1 : 0))}
              >
                <ChevronRight size={20} color={colors.white} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.price}>
            {vehicle.price_amount ? Number(vehicle.price_amount).toLocaleString("tr-TR") : "—"}
            <Text style={styles.currency}> {vehicle.price_currency}</Text>
          </Text>
          {vehicle.negotiable ? (
            <View style={styles.negBadge}>
              <Text style={styles.negBadgeText}>Pazarlık açık</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.metaRow}>
            <Eye size={14} color={colors.inkFaint} />
            <Text style={styles.metaText}>
              {vehicle.views_count} {t("vehicle.views")}
            </Text>
            <MapPin size={14} color={colors.inkFaint} style={{ marginLeft: space.lg }} />
            <Text style={styles.metaText}>
              {[vehicle.city, vehicle.country_code].filter(Boolean).join(", ")}
            </Text>
          </View>
        </View>

        <View style={styles.specs}>
          <View style={styles.specGrid}>
            <SpecItem icon={<Calendar size={18} color={colors.flame} />} label="Yıl" value={String(vehicle.year)} />
            <SpecItem
              icon={<Gauge size={18} color={colors.flame} />}
              label="KM"
              value={(vehicle.mileage_km ?? 0).toLocaleString("tr-TR")}
            />
            <SpecItem
              icon={<Fuel size={18} color={colors.flame} />}
              label="Yakıt"
              value={vehicle.fuel_name ?? "—"}
            />
            <SpecItem
              icon={<Cog size={18} color={colors.flame} />}
              label="Vites"
              value={vehicle.transmission_name ?? "—"}
            />
          </View>
        </View>

        {ai && ai.confidence > 0.5 ? (
          <View style={styles.aiBox}>
            <View style={styles.aiHeader}>
              <Sparkles size={18} color={colors.flame} />
              <Text style={styles.aiTitle}>{t("vehicle.aiAnalysis")}</Text>
              <Text style={styles.aiConfidence}>Güven: %{Math.round(ai.confidence * 100)}</Text>
            </View>
            {ai.recognized_make ? (
              <Text style={styles.aiBody}>
                AI tespit:{" "}
                <Text style={styles.aiBold}>
                  {ai.recognized_make} {ai.recognized_model}
                  {ai.recognized_year ? ` (${ai.recognized_year})` : ""}
                </Text>
              </Text>
            ) : null}
            {ai.condition_score !== null && ai.condition_score !== undefined ? (
              <Text style={[styles.aiBody, { marginTop: 4 }]}>
                {t("vehicle.conditionScore")}:{" "}
                <Text style={styles.aiBold}>{(ai.condition_score * 10).toFixed(1)}/10</Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("vehicle.description")}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        <TouchableOpacity
          style={styles.sellerCard}
          onPress={() => router.push(`/seller/${vehicle.seller_id}`)}
          activeOpacity={0.85}
        >
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <View style={styles.sellerNameRow}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              {vehicle.seller?.verified ? (
                <ShieldCheck size={15} color={colors.flame} strokeWidth={2.2} />
              ) : null}
            </View>
            {vehicle.seller?.verified ? (
              <Text style={styles.verified}>Doğrulanmış satıcı</Text>
            ) : null}
            {vehicle.seller?.rating_avg != null ? (
              <View style={styles.ratingRow}>
                <Star size={12} color={colors.flame} fill={colors.flame} />
                <Text style={styles.ratingText}>
                  {vehicle.seller.rating_avg.toFixed(1)}
                  {vehicle.seller.rating_count != null
                    ? ` · ${vehicle.seller.rating_count} değerlendirme`
                    : ""}
                </Text>
              </View>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.inkFaint} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.negotiateBtn}
            onPress={() => router.push(`/negotiate/${id}`)}
            activeOpacity={0.9}
          >
            <Handshake size={16} color={colors.flameDeep} strokeWidth={2.2} />
            <Text style={styles.negotiateBtnText}>Pazarlık</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={startChat} activeOpacity={0.9}>
            <MessageCircle size={16} color={colors.white} />
            <Text style={styles.chatBtnText}>{t("vehicle.contactSeller")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.waBtn}
            onPress={() => {
              const msg = encodeURIComponent(
                `Merhaba, Seyyare'deki "${title}" ilanı hakkında bilgi almak istiyorum.`,
              );
              const url = `https://wa.me/905551234567?text=${msg}`;
              Linking.openURL(url).catch(() =>
                Alert.alert(
                  "WhatsApp",
                  "Demo numara: +90 555 123 45 67\n\nUygulama açılamadı — bu bir demo bağlantıdır.",
                ),
              );
            }}
            activeOpacity={0.9}
          >
            <Phone size={16} color={colors.white} />
            <Text style={styles.waBtnText}>WA</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.specItem}>
      <View style={styles.specIcon}>{icon}</View>
      <View style={styles.specText}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  notFoundHeader: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  notFoundBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
  },
  notFoundTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  notFoundSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: space.sm,
    lineHeight: 20,
  },
  notFoundBack: {
    marginTop: space.xl,
    backgroundColor: colors.flame,
    paddingHorizontal: space.xl,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  notFoundBackText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
  galleryWrap: {
    position: "relative",
    backgroundColor: colors.ink,
  },
  noPhoto: {
    width: "100%",
    height: GALLERY_H,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  noPhotoText: { fontFamily: fonts.body, color: colors.inkFaint },
  topActions: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topActionsRight: { flexDirection: "row" },
  iconBtn: {
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
  iconBtnGap: { marginRight: space.sm },
  photoCount: {
    position: "absolute",
    bottom: 18,
    right: 16,
    backgroundColor: colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  photoCountText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  dots: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginHorizontal: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.flame,
  },
  navBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnLeft: { left: 10 },
  navBtnRight: { right: 10 },
  titleBlock: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  currency: {
    fontSize: 15,
    fontFamily: fonts.bodyMed,
    color: colors.inkMuted,
  },
  negBadge: {
    alignSelf: "flex-start",
    marginTop: space.sm,
    backgroundColor: colors.flameSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
  },
  negBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.flameDeep,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    marginTop: space.md,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: space.md },
  metaText: {
    marginLeft: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  specs: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    ...shadow.soft,
  },
  specGrid: { flexDirection: "row", flexWrap: "wrap" },
  specItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  specIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
  },
  specText: { marginLeft: 10, flex: 1 },
  specLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  specValue: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink, marginTop: 1 },
  aiBox: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  aiHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  aiTitle: {
    marginLeft: space.sm,
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  aiConfidence: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
  },
  aiBody: { fontFamily: fonts.body, fontSize: 12, color: colors.flameDeep, lineHeight: 18 },
  aiBold: { fontFamily: fonts.bodySemi },
  section: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md },
  sectionTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.ink,
    marginBottom: space.sm,
    letterSpacing: -0.2,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  sellerCard: {
    marginHorizontal: space.xl,
    marginTop: space.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },
  sellerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.flameSoft,
    borderWidth: 1.5,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.md,
  },
  sellerAvatarText: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.flameDeep,
  },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sellerName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  verified: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.flame,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
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
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  negotiateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.flameSoft,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
  },
  negotiateBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.flameDeep,
  },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.flame,
    borderRadius: radius.md,
    paddingVertical: 14,
    gap: 6,
    ...shadow.float,
  },
  chatBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    gap: 5,
  },
  waBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
});
