import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  Car,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import {
  getDemoSeller,
  getDemoVehiclesBySeller,
  getStoreMapUrl,
  type DemoStore,
  type DemoStorePost,
} from "../../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const COVER_H = 148;
const SCREEN_W = Dimensions.get("window").width;

function isDemoStore(p: unknown): p is DemoStore {
  return !!p && typeof p === "object" && "cover_url" in p && "address" in p;
}

function openMaps(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  void Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
  );
}

function platformLabel(p: DemoStorePost["platform"]) {
  if (p === "instagram") return "IG";
  if (p === "facebook") return "FB";
  return "X";
}

export default function SellerProfileScreen() {
  const params = useLocalSearchParams();
  const id = String(Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const { t: _t } = useTranslation();
  const demoSeller = getDemoSeller(id);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      if (demoSeller) return demoSeller;
      try {
        const arr = await api.get(`/user_profiles?user_id=eq.${id}`);
        return Array.isArray(arr) ? arr[0] : arr;
      } catch {
        return getDemoSeller(id) ?? null;
      }
    },
    enabled: !!id,
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async (): Promise<VehicleListItem[]> => {
      if (demoSeller) return getDemoVehiclesBySeller(id);
      try {
        const rows = await api.get<VehicleListItem[]>(
          `/vehicles?seller_id=eq.${id}&status=eq.active&order=created_at.desc`,
        );
        return Array.isArray(rows) ? rows : [];
      } catch {
        return getDemoVehiclesBySeller(id);
      }
    },
    enabled: !!id,
  });

  const listingCount = listings?.length ?? 0;
  const store = isDemoStore(profile) ? profile : null;

  const startChat = async () => {
    if (!(await auth.isAuthenticated())) {
      router.push("/auth/login");
      return;
    }
    try {
      const res = await api.post<{ id?: string } | Array<{ id: string }>>("/conversations", {
        type: "direct",
        participant_id: id,
      });
      const conversationId = Array.isArray(res) ? res[0]?.id : res?.id;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
        return;
      }
      throw new Error("no conversation id");
    } catch {
      router.push(`/chat/${id.startsWith("demo") ? id : "demo-seller"}`);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.flame} />
        </View>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen edges={["top"]}>
        <ScreenHeader title="Mağaza" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.muted}>Mağaza bulunamadı</Text>
        </View>
      </Screen>
    );
  }

  const name = profile.display_name ?? "Anonim";
  const initial = name.charAt(0).toUpperCase();

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.coverWrap}>
        {store?.cover_url ? (
          <Image source={{ uri: store.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Store size={28} color={colors.flame} strokeWidth={1.8} />
          </View>
        )}
        <View style={styles.coverFade} />
      </View>

      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          {store?.avatar_url ? (
            <Image source={{ uri: store.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {profile.verified ? <ShieldCheck size={15} color={colors.flame} strokeWidth={2.2} /> : null}
          </View>
          <View style={styles.metaRow}>
            {profile.rating_avg != null ? (
              <>
                <Star size={12} color={colors.brass} fill={colors.brass} />
                <Text style={styles.metaStrong}>{Number(profile.rating_avg).toFixed(1)}</Text>
                <Text style={styles.metaMuted}>({profile.rating_count ?? 0})</Text>
                <Text style={styles.dot}>·</Text>
              </>
            ) : null}
            <Text style={styles.metaMuted}>
              {[profile.city, profile.country_code].filter(Boolean).join(", ") || "—"}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.metaMuted}>{listingCount} ilan</Text>
          </View>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.actions}>
        {store?.phone ? (
          <ActionChip
            icon={<Phone size={15} color={colors.flame} strokeWidth={2.2} />}
            label="Ara"
            onPress={() => Linking.openURL(`tel:${store.phone.replace(/\s/g, "")}`)}
          />
        ) : null}
        {store?.whatsapp ? (
          <ActionChip
            icon={<MessageCircle size={15} color={colors.flame} strokeWidth={2.2} />}
            label="WhatsApp"
            onPress={() =>
              Linking.openURL(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${name} hakkında bilgi almak istiyorum.`)}`)
            }
          />
        ) : null}
        <ActionChip
          icon={<MessageCircle size={15} color={colors.white} strokeWidth={2.2} />}
          label="Mesaj"
          primary
          onPress={() => {
            void startChat();
          }}
        />
        {store ? (
          <ActionChip
            icon={<Navigation size={15} color={colors.flame} strokeWidth={2.2} />}
            label="Yol"
            onPress={() => openMaps(store.lat, store.lng, name)}
          />
        ) : null}
      </View>

      {store ? (
        <View style={styles.infoCard}>
          <InfoLine
            icon={<MapPin size={14} color={colors.inkFaint} />}
            text={store.address}
            onPress={() => openMaps(store.lat, store.lng, name)}
          />
          <InfoLine
            icon={<Phone size={14} color={colors.inkFaint} />}
            text={store.phone}
            onPress={() => Linking.openURL(`tel:${store.phone.replace(/\s/g, "")}`)}
          />
          <InfoLine icon={<Clock size={14} color={colors.inkFaint} />} text={store.hours} />
          <InfoLine
            icon={<Mail size={14} color={colors.inkFaint} />}
            text={store.email}
            onPress={() => Linking.openURL(`mailto:${store.email}`)}
          />
          {store.website ? (
            <InfoLine
              icon={<Globe size={14} color={colors.inkFaint} />}
              text={store.website.replace(/^https?:\/\//, "")}
              onPress={() => Linking.openURL(store.website!)}
            />
          ) : null}
        </View>
      ) : null}

      {store ? (
        <TouchableOpacity
          style={styles.mapCard}
          activeOpacity={0.92}
          onPress={() => openMaps(store.lat, store.lng, name)}
        >
          <Image
            source={{ uri: getStoreMapUrl(store.lat, store.lng, Math.round(SCREEN_W), 220) }}
            style={styles.mapImg}
            resizeMode="cover"
          />
          <View style={styles.mapOverlay}>
            <Navigation size={14} color={colors.white} strokeWidth={2.2} />
            <Text style={styles.mapOverlayText}>Haritada aç</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {store?.posts?.length ? (
        <View style={styles.socialBlock}>
          <SectionHeader title="Sosyal paylaşımlar" padded={false} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.postsRow}
          >
            {store.posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                activeOpacity={0.9}
                onPress={() => Linking.openURL(post.url)}
              >
                <Image source={{ uri: post.image_url }} style={styles.postImg} />
                <View style={styles.postBadge}>
                  <Text style={styles.postBadgeText}>{platformLabel(post.platform)}</Text>
                </View>
                <Text style={styles.postCaption} numberOfLines={2}>
                  {post.caption}
                </Text>
                <Text style={styles.postTime}>{post.posted_at}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <SectionHeader
        title={listingCount > 0 ? `İlanlar · ${listingCount}` : "İlanlar"}
        padded={false}
      />
    </View>
  );

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Mağaza" onBack={() => router.back()} />
      <FlatList
        ListHeaderComponent={header}
        data={(listings ?? []) as VehicleListItem[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <VehicleCard vehicle={item} index={index} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Car size={24} color={colors.flame} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>Aktif ilan yok</Text>
            <Text style={styles.muted}>Bu mağazanın şu an yayında ilanı bulunmuyor.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, primary && styles.chipPrimary]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {icon}
      <Text style={[styles.chipLabel, primary && styles.chipLabelPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoLine({
  icon,
  text,
  onPress,
}: {
  icon: ReactNode;
  text: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.infoLine}>
      {icon}
      <Text style={styles.infoText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: "center",
  },
  headerBlock: {
    marginBottom: space.md,
  },
  coverWrap: {
    marginHorizontal: -space.lg,
    height: COVER_H,
    backgroundColor: colors.ink,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: COVER_H,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mist,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.18)",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: -28,
    paddingHorizontal: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.flameSoft,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadow.soft,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.flameDeep,
  },
  identityCopy: { flex: 1, minWidth: 0, paddingTop: 30 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 3,
  },
  metaStrong: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  metaMuted: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  dot: { color: colors.inkFaint, fontSize: 12 },
  bio: {
    marginTop: space.md,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: space.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipPrimary: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  chipLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  chipLabelPrimary: { color: colors.white },
  infoCard: {
    marginTop: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
  mapCard: {
    marginTop: space.md,
    height: 140,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.mist,
  },
  mapImg: { width: "100%", height: "100%" },
  mapOverlay: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10,10,10,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  mapOverlayText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.white,
  },
  socialBlock: { marginTop: space.lg },
  postsRow: { gap: 10, paddingRight: 4 },
  postCard: {
    width: 148,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  postImg: { width: "100%", height: 110, backgroundColor: colors.mist },
  postBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(10,10,10,0.7)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  postBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.white,
  },
  postCaption: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkMuted,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  postTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  list: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
  },
  sep: { height: space.md },
  empty: {
    alignItems: "center",
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
});
