import "../lib/i18n";
import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CardHost } from "../components/agent/CardHost";
import { LoadingOverlay } from "../components/agent/LoadingOverlay";
import { ToastHost } from "../components/agent/ToastHost";
import { isRTL, type LocaleCode } from "../lib/locales";

export default function RootLayout() {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
            <Stack.Screen name="auth/register" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="vehicle/[id]"
              options={{ headerShown: true, title: "" }}
            />
            <Stack.Screen
              name="rental/[id]"
              options={{ headerShown: true, title: "" }}
            />
          </Stack>

          {/* Multi-agent orchestrator UI overlay'leri */}
          <CardHost />
          <ToastHost />
          <LoadingOverlay />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}