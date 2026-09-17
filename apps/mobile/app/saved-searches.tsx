import { router } from "expo-router";
import { Bookmark, Search } from "lucide-react-native";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Button } from "../components/ui/Button";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { DEMO_SAVED_SEARCHES } from "../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

export default function SavedSearchesScreen() {
  const items = DEMO_SAVED_SEARCHES;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Kayıtlı aramalar"
        subtitle={items.length > 0 ? `${items.length} kayıt` : undefined}
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
                  params: item.params,
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
              <Bookmark size={16} color={colors.flame} strokeWidth={2} fill={colors.flameSoft} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Bookmark size={36} color={colors.flame} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Kayıtlı arama yok</Text>
          <Text style={styles.emptySub}>
            Sık kullandığın filtreleri kaydet; bir dokunuşla aynı aramaya dön.
          </Text>
          <Button
            label="Aramaya git"
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
