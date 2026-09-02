import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Star, ShieldCheck, MessageCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { api } from "../../lib/api";

interface SellerProfile {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
  rating_avg: number | null;
  rating_count: number | null;
  country_code: string | null;
  city: string | null;
  created_at: string;
}

export default function SellerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn: () => api.get<SellerProfile[]>(`/user_profiles?user_id=eq.${id}`).then((arr) => arr[0]),
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: () => api.get<VehicleListItem[]>(`/vehicles?seller_id=eq.${id}&status=eq.active&order=created_at.desc`),
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0EA5E9" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 py-4 border-b border-slate-200">
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">Satıcı bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="bg-white px-5 py-3 border-b border-slate-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Satıcı Profili</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <View className="bg-white px-5 py-6 items-center border-b border-slate-200">
            <View className="w-24 h-24 rounded-full bg-primary-100 items-center justify-center mb-3">
              <Text className="text-3xl font-bold text-primary-700">
                {(profile.display_name ?? "?").charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text className="text-xl font-bold text-slate-900">
              {profile.display_name ?? "Anonim"}
            </Text>

            {profile.verified && (
              <View className="flex-row items-center mt-1">
                <ShieldCheck size={14} color="#10B981" />
                <Text className="ml-1 text-xs text-green-600 font-semibold">Doğrulanmış Satıcı</Text>
              </View>
            )}

            {profile.rating_avg !== null && (
              <View className="flex-row items-center mt-2">
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text className="ml-1 text-sm text-slate-700 font-semibold">
                  {profile.rating_avg.toFixed(1)}
                </Text>
                <Text className="ml-1 text-xs text-slate-500">
                  ({profile.rating_count ?? 0} değerlendirme)
                </Text>
              </View>
            )}

            {profile.bio && (
              <Text className="text-sm text-slate-600 text-center mt-3 px-4">
                {profile.bio}
              </Text>
            )}

            <View className="flex-row items-center mt-2">
              <Text className="text-xs text-slate-500">
                {[profile.city, profile.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
              </Text>
            </View>

            <TouchableOpacity
              className="mt-4 bg-primary-600 rounded-xl py-2.5 px-6 flex-row items-center"
              style={{ backgroundColor: "#0284C7" }}
            >
              <MessageCircle size={16} color="#FFFFFF" />
              <Text className="ml-2 text-white font-semibold text-sm">Mesaj Gönder</Text>
            </TouchableOpacity>
          </View>
        }
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-slate-400 text-sm">Bu satıcının aktif ilanı yok</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}