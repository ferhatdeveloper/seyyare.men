import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Search, Sparkles, Car as CarIcon, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { api } from "../../lib/api";
import { localeNativeName } from "../../lib/locales";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();

  const { data: recent, isLoading } = useQuery({
    queryKey: ["vehicles-recent", i18n.language],
    queryFn: () =>
      api.rpc("search_vehicles", {
        p_locale: i18n.language,
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_page_size: 10,
        p_page_offset: 0,
      }),
  });

  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () => api.rpc("list_reference_data", { p_locale: i18n.language }),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-3xl font-bold text-slate-900">{t("home.greeting")}</Text>
          <Text className="text-sm text-slate-500 mt-1">{t("app.tagline")}</Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          className="mx-5 mb-6 flex-row items-center bg-slate-100 rounded-2xl px-4 py-3"
          onPress={() => router.push("/(tabs)/search")}
        >
          <Search size={20} color="#64748B" />
          <Text className="ml-3 text-slate-500 flex-1">{t("home.searchPlaceholder")}</Text>
        </TouchableOpacity>

        {/* AI Assistant */}
        <TouchableOpacity
          className="mx-5 mb-6 rounded-2xl p-5 flex-row items-center"
          style={{ backgroundColor: "#0EA5E9" }}
          onPress={() => router.push("/ai-assistant")}
        >
          <View className="bg-white/20 rounded-full p-3 mr-4">
            <Sparkles size={24} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">{t("home.aiAssistant")}</Text>
            <Text className="text-white/80 text-sm mt-0.5">
              {t("home.aiAssistantPrompt")}
            </Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Brands */}
        <View className="px-5 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            {t("home.popularBrands")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(refs?.brands ?? []).slice(0, 12).map((b) => (
              <TouchableOpacity
                key={b.id}
                className="mr-3 bg-slate-50 rounded-2xl px-5 py-4 items-center min-w-[90px]"
                onPress={() => router.push({ pathname: "/(tabs)/search", params: { q: b.name } })}
              >
                <CarIcon size={28} color="#0EA5E9" />
                <Text className="mt-2 text-sm font-semibold text-slate-700" numberOfLines={1}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent listings */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              {t("home.recentListings")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
              <Text className="text-primary-600 font-semibold text-sm">
                {t("home.seeAll")}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color="#0EA5E9" />
              <Text className="text-slate-400 text-sm mt-2">{t("common.loading")}</Text>
            </View>
          ) : recent && recent.length > 0 ? (
            recent.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)
          ) : (
            <View className="items-center py-12">
              <Text className="text-slate-400 text-sm">Henüz ilan yok</Text>
              <Text className="text-slate-300 text-xs mt-2 text-center px-8">
                Veritabanı boş. İlk ilanı siz verebilirsiniz.
              </Text>
              <TouchableOpacity
                className="mt-4 bg-primary-600 rounded-xl px-5 py-2.5"
                style={{ backgroundColor: "#0284C7" }}
                onPress={() => router.push("/(tabs)/sell")}
              >
                <Text className="text-white font-semibold text-sm">İlan Ver</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}