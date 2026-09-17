import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, I18nManager, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

import "../lib/i18n";
import { CardHost } from "../components/agent/CardHost";
import { LoadingOverlay } from "../components/agent/LoadingOverlay";
import { ToastHost } from "../components/agent/ToastHost";
import { SplashOverlay } from "../components/brand";
import { useCityStore } from "../lib/city-store";
import { useCurrencyStore } from "../lib/currency-store";
import { useApiBaseStore } from "../lib/api-base-store";
import { useDriverStore } from "../lib/driver-store";
import { useModeStore } from "../lib/mode-store";
import { useWalletStore } from "../lib/wallet-store";
import { isRTL, type LocaleCode } from "../lib/locales";
import { colors } from "../lib/theme";
import { router } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });
  const [splashVisible, setSplashVisible] = useState(true);
  const onSplashFinish = useCallback(() => setSplashVisible(false), []);
  const hydrateCurrency = useCurrencyStore((s) => s.hydrate);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const hydrateMode = useModeStore((s) => s.hydrate);
  const hydrateCity = useCityStore((s) => s.hydrate);
  const hydrateApiBase = useApiBaseStore((s) => s.hydrate);
  const hydrateDriver = useDriverStore((s) => s.hydrate);
  const modeHydrated = useModeStore((s) => s.hydrated);
  const hasChosenMode = useModeStore((s) => s.hasChosen);

  useEffect(() => {
    void hydrateCurrency();
    void hydrateWallet();
    void hydrateMode();
    void hydrateCity();
    void hydrateApiBase();
    void hydrateDriver();
  }, [hydrateCurrency, hydrateWallet, hydrateMode, hydrateCity, hydrateApiBase, hydrateDriver]);

  useEffect(() => {
    if (splashVisible || !modeHydrated) return;
    if (!hasChosenMode) {
      router.replace("/mode-select");
    }
  }, [splashVisible, modeHydrated, hasChosenMode]);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );

  const initialLocale: LocaleCode = "tr";
  const rtl = isRTL(initialLocale);
  if (Platform.OS !== "web" && I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.flame} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: colors.paper },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="mode-select" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/register" options={{ presentation: "modal" }} />
            <Stack.Screen name="about" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="saved-searches" options={{ headerShown: false }} />
            <Stack.Screen name="vehicle/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="rental/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="auctions" options={{ headerShown: false }} />
            <Stack.Screen name="auction/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="ai-assistant" options={{ headerShown: false }} />
            <Stack.Screen name="taxi" options={{ headerShown: false }} />
            <Stack.Screen name="guide" options={{ headerShown: false }} />
            <Stack.Screen name="wallet" options={{ headerShown: false }} />
            <Stack.Screen name="car-wash" options={{ headerShown: false }} />
            <Stack.Screen name="shared-ride" options={{ headerShown: false }} />
            <Stack.Screen name="partner/index" options={{ headerShown: false }} />
            <Stack.Screen name="partner/contract" options={{ headerShown: false }} />
            <Stack.Screen name="driver/index" options={{ headerShown: false }} />
            <Stack.Screen name="voice" options={{ headerShown: false }} />
            <Stack.Screen name="agents" options={{ headerShown: false }} />
            <Stack.Screen name="favorites" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="meet/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="seller/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="stores" options={{ headerShown: false }} />
            <Stack.Screen
              name="negotiate/[vehicleId]"
              options={{ headerShown: false }}
            />
          </Stack>

          <CardHost />
          <ToastHost />
          <LoadingOverlay />
          <SplashOverlay visible={splashVisible} onFinish={onSplashFinish} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
});
