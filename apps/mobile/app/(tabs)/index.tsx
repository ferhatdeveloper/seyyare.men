import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Car,
  CircleDot,
  Fuel,
  Mic,
  Search,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppHeader } from "../../components/brand";
import { BrandStrip } from "../../components/BrandStrip";
import { PromoCarousel } from "../../components/PromoCarousel";
import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { SectionHeader } from "../../components/ui";
import { api } from "../../lib/api";
import { withBrandLogos } from "../../lib/brand-logos";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const BODY_TYPES = [
  { key: "SUV", label: "SUV", Icon: Car },
  { key: "Sedan", label: "Sedan", Icon: CircleDot },
  { key: "Hatchback", label: "Hatch", Icon: Car },
  { key: "Hibrit", label: "Hibrit", Icon: Fuel },
  { key: "Elektrik", label: "EV", Icon: Zap },
];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();

  const { data: recent, isLoading } = useQuery({
    queryKey: ["vehicles-recent", i18n.language],
    queryFn: () =>
      api.rpc<VehicleListItem[]>("search_vehicles", {
        p_locale: i18n.language,
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_page_size: 10,
        p_page_offset: 0,
      }),
  });

  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () =>
      api.rpc<{ brands: Array<{ id: number; name: string }> }>("list_reference_data", {
        p_locale: i18n.language,
      }),
    staleTime: 60 * 60 * 1000,
  });

  const { data: inventory } = useQuery({
    queryKey: ["inventory-count", i18n.language],
    queryFn: () =>
      api.rpc<VehicleListItem[]>("search_vehicles", {
        p_locale: i18n.language,
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_page_size: 100,
        p_page_offset: 0,
      }),
    staleTime: 60_000,
  });

  const brands = withBrandLogos(refs?.brands ?? []);
  const vehicles = recent ?? [];
  const inventoryCount = inventory?.length ?? vehicles.length;
  const featured = vehicles.filter((v) => v.featured).slice(0, 5);
  const featuredList = featured.length > 0 ? featured : vehicles.slice(0, 4);

  const popularModels = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of inventory ?? vehicles) {
      const key = [v.make_name, v.model].filter(Boolean).join(" ").trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [inventory, vehicles]);


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

          <View style={styles.searchCta}>
            <Text style={styles.searchCtaTitle}>Find your perfect car</Text>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={() => router.push("/(tabs)/search")}
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
              onPress={() => router.push("/(tabs)/search")}
              activeOpacity={0.9}
            >
              <Text style={styles.searchSubmitText}>
                Search {inventoryCount.toLocaleString("tr-TR")} cars
              </Text>
            </TouchableOpacity>
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

          <View style={styles.section}>
            <SectionHeader title="Kategoriler" padded={false} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {BODY_TYPES.map((b) => {
                const Icon = b.Icon;
                return (
                  <TouchableOpacity
                    key={b.key}
                    style={styles.catTile}
                    onPress={() =>
                      router.push({ pathname: "/(tabs)/search", params: { q: b.key } })
                    }
                    activeOpacity={0.88}
                  >
                    <View style={styles.catIcon}>
                      <Icon size={18} color={colors.flame} strokeWidth={2} />
                    </View>
                    <Text style={styles.catLabel}>{b.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                    style={styles.popularChip}
                    onPress={() =>
                      router.push({ pathname: "/(tabs)/search", params: { q: m.name } })
                    }
                    activeOpacity={0.88}
                  >
                    <Text style={styles.popularChipText}>
                      {m.name} ({m.count})
                    </Text>
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
                router.push({ pathname: "/(tabs)/search", params: { make: b.name, makeId: String(b.id) } })
              }
              limit={20}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title={t("home.recentListings")}
              actionLabel={t("home.seeAll")}
              onAction={() => router.push("/(tabs)/search")}
              padded={false}
            />

            {isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.flame} />
                <Text style={styles.loadingText}>{t("common.loading")}</Text>
              </View>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle, index) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
              ))
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
  catRow: { gap: 10, paddingRight: space.xl },
  catTile: {
    width: 76,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.soft,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  catLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  popularRow: {
    paddingHorizontal: space.xl,
    gap: 8,
  },
  popularChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  popularChipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.ink,
  },
  loading: {
    alignItems: "center",
    paddingVertical: space.xxl,
    gap: space.sm,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
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
