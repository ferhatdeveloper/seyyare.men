import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronLeft, Heart } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VehicleCard, type VehicleListItem } from "../components/VehicleCard";
import { api } from "../lib/api";

export default function FavoritesScreen() {
  const { t } = useTranslation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["favorites"],
    queryFn: () =>
      api.get<VehicleListItem[]>(
        "/favorites?select=vehicle:vehicles(*,media:vehicle_media(*))&order=created_at.desc",
      ),
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Heart size={20} color="#EF4444" fill="#EF4444" />
        <Text className="ml-2 text-xl font-bold text-slate-900">
          {t("profile.favorites")}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0EA5E9" />
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={data.flatMap((f: any) => f.vehicle ?? [])}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VehicleCard vehicle={item} initialFavorite />}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Heart size={48} color="#CBD5E1" />
          <Text className="text-slate-500 mt-4 text-base">Henüz favori yok</Text>
          <Text className="text-slate-400 text-sm text-center mt-2">
            Beğendiğiniz ilanları favorilere ekleyerek daha sonra kolayca bulabilirsiniz
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-600 rounded-xl py-3 px-6"
            style={{ backgroundColor: "#0284C7" }}
            onPress={() => router.push("/(tabs)/search")}
          >
            <Text className="text-white font-semibold">İlan Ara</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}