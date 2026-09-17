import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Home, Search, Plus, Store, User } from "lucide-react-native";
import { Platform, StyleSheet, View } from "react-native";

import { colors, fonts, shadow } from "../../lib/theme";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.viridian,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 26 : 12,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.bodySemi,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.paper,
          shadowOpacity: 0,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.displayMed, fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tabs.search"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: t("tabs.sell"),
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.sellBtn, focused && styles.sellBtnActive]}>
              <Plus size={22} color={colors.white} strokeWidth={2.4} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: t("tabs.stores"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: t("tabs.rentals"),
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.viridian,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
    ...shadow.float,
  },
  sellBtnActive: {
    backgroundColor: colors.viridianDeep,
  },
});
