import { router } from "expo-router";
import { Search, Sparkles, Car as CarIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { t } = useTranslation();

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

        {/* AI Assistant Card */}
        <TouchableOpacity
          className="mx-5 mb-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-5 flex-row items-center"
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
        </TouchableOpacity>

        {/* Quick Actions */}
        <View className="px-5 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">
            {t("home.popularBrands")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["Toyota", "BMW", "Mercedes", "Audi", "Tesla", "Honda"].map((brand) => (
              <TouchableOpacity
                key={brand}
                className="mr-3 bg-slate-50 rounded-2xl px-5 py-4 items-center min-w-[90px]"
                onPress={() => router.push({ pathname: "/(tabs)/search", params: { q: brand } })}
              >
                <CarIcon size={28} color="#0EA5E9" />
                <Text className="mt-2 text-sm font-semibold text-slate-700">{brand}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Rentals CTA */}
        <View className="px-5 mb-6">
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <Text className="text-amber-900 font-bold text-base mb-1">
              {t("home.featuredRentals")}
            </Text>
            <Text className="text-amber-700 text-sm mb-3">
              Kiralaman gereken araçları keşfet
            </Text>
            <TouchableOpacity
              className="bg-amber-500 rounded-xl py-2.5 px-4 self-start"
              onPress={() => router.push("/(tabs)/rentals")}
            >
              <Text className="text-white font-semibold text-sm">{t("home.seeAll")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent listings placeholder */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-slate-900">
              {t("home.recentListings")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
              <Text className="text-primary-600 font-semibold text-sm">{t("home.seeAll")}</Text>
            </TouchableOpacity>
          </View>
          <View className="items-center py-12">
            <Text className="text-slate-400 text-sm">{t("common.loading")}…</Text>
            <Text className="text-slate-300 text-xs mt-2 text-center px-8">
              Faz 3'te gerçek ilanlar burada görüntülenecek
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}