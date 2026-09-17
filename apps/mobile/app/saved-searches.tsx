import { router, useFocusEffect } from "expo-router";
import { Bookmark, Search, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "../components/ui/Button";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import {
  savedSearchesStore,
  type SavedSearch,
} from "../lib/saved-searches-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

export default function SavedSearchesScreen() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await savedSearchesStore.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onDelete = (item: SavedSearch) => {
    Alert.alert("Silinsin mi?", `"${item.title}" kayıtlardan kaldırılacak.`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await savedSearchesStore.remove(item.id);
            await reload();
          })();
        },
      },
    ]);
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Kayıtlı aramalar"
        subtitle={
          !loading && items.length > 0 ? `${items.length} kayıt` : undefined
        }
        onBack={() => router.back()}
      />

      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/search",
                  params: { ...item.params, openResults: "1" },
                })
              }
            >
              <View style={styles.iconCircle}>
                <Search size={18} color={colors.flame} strokeWidth={2.2} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteHit}
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onDelete(item);
                }}
              >
                <Trash2 size={16} color={colors.inkFaint} strokeWidth={2} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Bookmark size={36} color={colors.flame} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>
            {loading ? "Yükleniyor…" : "Kayıtlı arama yok"}
          </Text>
          {!loading ? (
            <>
              <Text style={styles.emptySub}>
                Sonuç ekranından aramayı kaydet; bir dokunuşla aynı filtrelere
                dön.
              </Text>
              <Button
                label="Aramaya git"
                variant="primary"
                style={styles.emptyBtn}
                onPress={() => router.push("/(tabs)/search")}
              />
            </>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.section,
  },
  sep: { height: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow.soft,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.md,
  },
  rowBody: { flex: 1, minWidth: 0, marginRight: space.sm },
  rowTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  rowSub: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  deleteHit: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
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
    marginTop: space.lg,
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
  },
  emptySub: {
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: { marginTop: space.xl, alignSelf: "stretch" },
});
