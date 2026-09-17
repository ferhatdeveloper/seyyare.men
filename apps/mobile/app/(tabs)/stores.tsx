import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import {
  ChevronRight,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type StoreItem = {
  id: string;
  name: string;
  city?: string;
  country_code?: string;
  verified?: boolean;
  rating_avg?: number;
  rating_count?: number;
  listing_count?: number;
  bio?: string;
  cover_url?: string;
  address?: string;
  hours?: string;
  phone?: string;
};

const CITY_ALL = "all";

export default function StoresTabScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(CITY_ALL);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, []),
  );

  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: () =>
      api.rpc<StoreItem[]>("list_stores", {}).then((rows) =>
        Array.isArray(rows) ? rows : [],
      ),
  });

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores ?? []) {
      if (s.city) set.add(s.city);
    }
    return [CITY_ALL, ...Array.from(set).sort()];
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (stores ?? []).filter((s) => {
      if (city !== CITY_ALL && s.city !== city) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.bio ?? "").toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [stores, query, city]);

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={t("tabs.stores")} subtitle="Galeri ve satıcıları keşfet" large />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Store size={16} color={colors.inkFaint} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Mağaza, şehir veya adres ara"
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
        <FlatList
          horizontal
          data={cities}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}
          renderItem={({ item: c }) => (
            <Chip
              label={c === CITY_ALL ? "Tümü" : c}
              selected={city === c}
              onPress={() => setCity(c)}
              style={styles.cityChip}
            />
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.flame} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            <Text style={styles.count}>
              {filtered.length} mağaza
              {city !== CITY_ALL ? ` · ${city}` : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Store size={24} color={colors.flame} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>Sonuç yok</Text>
              <Text style={styles.muted}>Arama veya şehir filtresini değiştirin.</Text>
            </View>
          }
          renderItem={({ item }) => <StoreCard item={item} />}
        />
      )}
    </Screen>
  );
}

function StoreCard({ item }: { item: StoreItem }) {
  const initial = item.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => router.push(`/seller/${item.id}`)}
    >
      <View style={styles.coverWrap}>
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Store size={28} color={colors.flame} strokeWidth={1.8} />
          </View>
        )}
        <View style={styles.coverShade} />
        {item.verified ? (
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={12} color={colors.white} strokeWidth={2.4} />
            <Text style={styles.verifiedText}>Doğrulanmış</Text>
          </View>
        ) : null}
        {item.listing_count != null ? (
          <View style={styles.listingBadge}>
            <Text style={styles.listingBadgeText}>{item.listing_count} ilan</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaInline}>
              {item.rating_avg != null ? (
                <>
                  <Star size={11} color={colors.brass} fill={colors.brass} />
                  <Text style={styles.rating}>{Number(item.rating_avg).toFixed(1)}</Text>
                  <Text style={styles.metaDim}>
                    ({item.rating_count ?? 0})
                  </Text>
                  <Text style={styles.metaDim}> · </Text>
                </>
              ) : null}
              <MapPin size={11} color={colors.inkFaint} />
              <Text style={styles.metaDim} numberOfLines={1}>
                {[item.city, item.country_code].filter(Boolean).join(", ") || "—"}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.inkFaint} strokeWidth={2} />
        </View>

        {item.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {item.bio}
          </Text>
        ) : null}

        {(item.address || item.hours) && (
          <View style={styles.footerMeta}>
            {item.address ? (
              <View style={styles.footerLine}>
                <MapPin size={12} color={colors.inkFaint} />
                <Text style={styles.footerText} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            ) : null}
            {item.hours ? (
              <View style={styles.footerLine}>
                <Clock size={12} color={colors.inkFaint} />
                <Text style={styles.footerText} numberOfLines={1}>
                  {item.hours}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    ...shadow.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  cityRow: { gap: 8, paddingVertical: 2 },
  cityChip: { marginRight: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: "center",
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.section },
  count: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: space.md,
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
  coverWrap: {
    height: 118,
    backgroundColor: colors.mist,
    position: "relative",
  },
  cover: { width: "100%", height: "100%" },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  coverShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.12)",
  },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,10,10,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  verifiedText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.white,
  },
  listingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.flame,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  listingBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.white,
  },
  body: {
    padding: space.md,
    gap: space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.flameDeep,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  rating: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  metaDim: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    flexShrink: 1,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted,
  },
  footerMeta: { gap: 5 },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  empty: {
    alignItems: "center",
    paddingVertical: space.section,
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
