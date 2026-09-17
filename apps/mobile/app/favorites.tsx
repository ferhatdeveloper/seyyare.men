import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { VehicleCard, type VehicleListItem } from "../components/VehicleCard";
import { Button } from "../components/ui/Button";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { api } from "../lib/api";
import {
  readFavoritesSnapshot,
  writeFavoritesSnapshot,
} from "../lib/offline-snapshot";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

export default function FavoritesScreen() {
  const { t } = useTranslation();

  const { data: vehicles = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      try {
        const rows = await api.get<Array<{ vehicle?: VehicleListItem }>>(
          "/favorites?select=vehicle:vehicles(*,media:vehicle_media(*))&order=created_at.desc",
        );
        const live =
          rows?.flatMap((f) => (f.vehicle ? [f.vehicle] : [])) ?? [];
        if (live.length > 0) {
          void writeFavoritesSnapshot(live);
          return live;
        }
      } catch {
        /* fall through to snapshot */
      }
      return (await readFavoritesSnapshot()) ?? [];
    },
  });

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("profile.favorites")}
        onBack={() => router.back()}
        right={<Heart size={18} color={colors.flame} fill={colors.flameSoft} />}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.flame} />
        </View>
      ) : vehicles.length > 0 ? (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <VehicleCard vehicle={item} initialFavorite index={index} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Heart size={36} color={colors.flame} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Henüz favori yok</Text>
          <Text style={styles.emptySub}>
            Beğendiğiniz ilanları kalp ile kaydedin; sonra buradan hızlıca dönün.
          </Text>
          <Button
            label="İlanlara göz at"
            variant="primary"
            style={styles.emptyBtn}
            onPress={() => router.push("/(tabs)/search")}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.section,
  },
  sep: { height: space.md },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 20,
    color: colors.ink,
    marginTop: space.xl,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: space.sm,
    lineHeight: 21,
    maxWidth: 280,
  },
  emptyBtn: { marginTop: space.xxl, minWidth: 200 },
});
