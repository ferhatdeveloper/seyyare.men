import { router } from "expo-router";
import {
  Bell,
  BellOff,
  CalendarCheck,
  MessageCircle,
  Tag,
} from "lucide-react-native";
import { useState, type ComponentType } from "react";
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
  DEMO_NOTIFICATIONS,
  type DemoNotification,
  type DemoNotificationType,
} from "../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

const ICON_MAP: Record<
  DemoNotificationType,
  ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  price_drop: Tag,
  new_message: MessageCircle,
  rental_booked: CalendarCheck,
  system: Bell,
};

function handleTap(item: DemoNotification) {
  if (item.href) {
    router.push(item.href as never);
    return;
  }
  Alert.alert(item.title, item.body);
}

export default function NotificationsScreen() {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Bildirimler"
        subtitle={items.length > 0 ? `${items.length} bildirim` : undefined}
        onBack={() => router.back()}
        right={
          items.length > 0 ? (
            <TouchableOpacity
              hitSlop={8}
              onPress={() => setItems([])}
              accessibilityLabel="Tümünü temizle"
            >
              <Text style={styles.clearTxt}>Temizle</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const Icon = ICON_MAP[item.type];
            return (
              <TouchableOpacity
                style={[styles.row, !item.read && styles.rowUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.75}
              >
                <View style={styles.iconCircle}>
                  <Icon size={18} color={colors.flame} strokeWidth={2.2} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.rowText} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.rowTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <BellOff size={36} color={colors.flame} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Bildirim yok</Text>
          <Text style={styles.emptySub}>
            Fiyat düşüşleri, mesajlar ve kiralama güncellemeleri burada görünür.
          </Text>
          <Button
            label="Demo bildirimleri yükle"
            variant="soft"
            style={styles.emptyBtn}
            onPress={() => setItems(DEMO_NOTIFICATIONS)}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clearTxt: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.flame,
  },
  list: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.section,
  },
  sep: { height: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow.soft,
  },
  rowUnread: {
    borderColor: BORDER_FLAME,
    backgroundColor: "#FFFAF6",
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
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.flame,
  },
  rowText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  rowTime: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
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
