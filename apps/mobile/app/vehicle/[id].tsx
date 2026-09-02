import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Phone,
  Share2,
  Calendar,
  Gauge,
  Fuel,
  Cog,
  Sparkles,
  Eye,
  MessageCircle,
} from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import { storage } from "../../lib/clients";

interface VehicleDetail {
  id: string;
  title_original: string;
  description_original: string;
  description_translations: Record<string, string>;
  title_translations: Record<string, string>;
  make_id: number;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  fuel_type_id: number;
  transmission_id: number;
  body_type_id: number;
  color_id: number;
  condition: string;
  price_amount: number | null;
  price_currency: string;
  negotiable: boolean;
  country_code: string;
  city: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  status: string;
  views_count: number;
  favorites_count: number;
  features: number[];
  created_at: string;
  seller_id: string;
  ai_analysis: Array<{
    recognized_make: string;
    recognized_model: string;
    recognized_year: number | null;
    confidence: number;
    condition_score: number | null;
    suggested_price_amount: number | null;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: "image" | "video";
    is_cover: boolean;
  }>;
  seller: {
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
    rating_avg: number | null;
    rating_count: number | null;
  };
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [mediaIdx, setMediaIdx] = useState(0);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle", id, i18n.language],
    queryFn: () => api.get<VehicleDetail>(`/vehicles?id=eq.${id}&select=*,ai_vehicle_analysis(*),vehicle_media(*),seller:users!seller_id(user_profiles(*))`),
    enabled: !!id,
  });

  const favoriteMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      if (isFavorite) {
        await api.delete(`/favorites?vehicle_id=eq.${id}`);
      } else {
        await api.post("/favorites", { vehicle_id: id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicle", id] }),
  });

  const startChat = async () => {
    if (!(await auth.isAuthenticated())) {
      router.push("/auth/login");
      return;
    }
    try {
      const res = await api.post<{ id: string }>("/conversations", {
        type: "direct",
        vehicle_id: id,
      });
      router.push(`/chat/${res.id}`);
    } catch {
      Alert.alert(t("errors.serverError"));
    }
  };

  if (isLoading || !vehicle) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0EA5E9" />
      </SafeAreaView>
    );
  }

  const title =
    vehicle.title_translations?.[i18n.language] ??
    vehicle.title_original ??
    `${vehicle.model} ${vehicle.year}`;
  const description =
    vehicle.description_translations?.[i18n.language] ?? vehicle.description_original;
  const coverUrl = vehicle.media?.[mediaIdx]?.url;
  const sellerName = vehicle.seller?.display_name ?? "Satıcı";
  const ai = vehicle.ai_analysis?.[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1">
        {/* Header / Gallery */}
        <View className="relative">
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl.startsWith("http") ? coverUrl : `${storage.url}/${coverUrl}` }}
              style={{ width: Dimensions.get("window").width, height: 320 }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View className="w-full h-[320px] bg-slate-200 items-center justify-center">
              <Text className="text-slate-400">Fotoğraf yok</Text>
            </View>
          )}

          {/* Top actions */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between">
            <TouchableOpacity
              className="bg-white/90 rounded-full w-10 h-10 items-center justify-center"
              onPress={() => router.back()}
            >
              <ChevronLeft size={22} color="#0F172A" />
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-white/90 rounded-full w-10 h-10 items-center justify-center mr-2"
                onPress={async () => {
                  await Share.share({
                    message: `${title} — Seyyare.men'de görüntüle`,
                  });
                }}
              >
                <Share2 size={18} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-white/90 rounded-full w-10 h-10 items-center justify-center"
                onPress={() => favoriteMutation.mutate(false)}
              >
                <Heart size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Image pagination */}
          {vehicle.media && vehicle.media.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
              {vehicle.media.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  className={`w-2 h-2 rounded-full mx-1 ${i === mediaIdx ? "bg-white w-6" : "bg-white/50"}`}
                  onPress={() => setMediaIdx(i)}
                />
              ))}
            </View>
          )}

          {vehicle.media && vehicle.media.length > 1 && (
            <>
              <TouchableOpacity
                className="absolute left-2 top-1/2 -mt-5 bg-black/40 rounded-full w-9 h-9 items-center justify-center"
                onPress={() => setMediaIdx((i) => (i > 0 ? i - 1 : vehicle.media.length - 1))}
              >
                <ChevronLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                className="absolute right-2 top-1/2 -mt-5 bg-black/40 rounded-full w-9 h-9 items-center justify-center"
                onPress={() => setMediaIdx((i) => (i < vehicle.media.length - 1 ? i + 1 : 0))}
              >
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Title + Price */}
        <View className="px-5 pt-5 pb-3">
          <Text className="text-2xl font-bold text-slate-900 mb-1">{title}</Text>
          <View className="flex-row items-center">
            <Text className="text-3xl font-bold text-primary-600">
              {vehicle.price_amount
                ? Number(vehicle.price_amount).toLocaleString()
                : "—"}{" "}
              <Text className="text-base">{vehicle.price_currency}</Text>
            </Text>
            {vehicle.negotiable && (
              <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                <Text className="text-amber-700 text-xs font-semibold">Pazarlık</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center mt-3">
            <Eye size={14} color="#64748B" />
            <Text className="text-xs text-slate-500 ml-1">
              {vehicle.views_count} {t("vehicle.views")}
            </Text>
            <MapPin size={14} color="#64748B" className="ml-4" />
            <Text className="text-xs text-slate-500 ml-1">
              {[vehicle.city, vehicle.country_code].filter(Boolean).join(", ")}
            </Text>
          </View>
        </View>

        {/* Quick specs grid */}
        <View className="mx-5 my-3 bg-slate-50 rounded-2xl p-4">
          <View className="flex-row flex-wrap">
            <SpecItem icon={<Calendar size={18} color="#0EA5E9" />} label="Yıl" value={String(vehicle.year)} />
            <SpecItem icon={<Gauge size={18} color="#0EA5E9" />} label="KM" value={(vehicle.mileage_km ?? 0).toLocaleString()} />
            <SpecItem icon={<Fuel size={18} color="#0EA5E9" />} label="Yakıt" value={String(vehicle.fuel_type_id)} />
            <SpecItem icon={<Cog size={18} color="#0EA5E9" />} label="Vites" value={String(vehicle.transmission_id)} />
          </View>
        </View>

        {/* AI Analysis */}
        {ai && ai.confidence > 0.5 && (
          <View className="mx-5 my-3 bg-primary-50 border border-primary-100 rounded-2xl p-4">
            <View className="flex-row items-center mb-2">
              <Sparkles size={18} color="#0EA5E9" />
              <Text className="ml-2 text-sm font-bold text-primary-800">
                {t("vehicle.aiAnalysis")}
              </Text>
              <Text className="ml-auto text-xs text-primary-600">
                Güven: %{Math.round(ai.confidence * 100)}
              </Text>
            </View>
            {ai.recognized_make && (
              <Text className="text-xs text-primary-900">
                AI tespit: <Text className="font-semibold">{ai.recognized_make} {ai.recognized_model}</Text>
                {ai.recognized_year ? ` (${ai.recognized_year})` : ""}
              </Text>
            )}
            {ai.condition_score !== null && ai.condition_score !== undefined && (
              <Text className="text-xs text-primary-900 mt-1">
                {t("vehicle.conditionScore")}: <Text className="font-semibold">{(ai.condition_score * 10).toFixed(1)}/10</Text>
              </Text>
            )}
          </View>
        )}

        {/* Description */}
        <View className="px-5 py-3">
          <Text className="text-base font-bold text-slate-900 mb-2">
            {t("vehicle.description")}
          </Text>
          <Text className="text-sm text-slate-700 leading-6">{description}</Text>
        </View>

        {/* Seller */}
        <TouchableOpacity
          className="mx-5 my-3 bg-white border border-slate-200 rounded-2xl p-4 flex-row items-center"
          onPress={() => router.push(`/seller/${vehicle.seller_id}`)}
        >
          <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-3">
            <Text className="text-primary-700 font-bold">
              {sellerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900">{sellerName}</Text>
            {vehicle.seller?.verified && (
              <Text className="text-xs text-green-600">✓ Doğrulanmış</Text>
            )}
          </View>
          <Text className="text-slate-300">›</Text>
        </TouchableOpacity>

        <View className="h-28" />
      </ScrollView>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex-row items-center">
        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-3 flex-1 flex-row items-center justify-center mr-2"
          style={{ backgroundColor: "#0284C7" }}
          onPress={startChat}
        >
          <MessageCircle size={18} color="#FFFFFF" />
          <Text className="text-white font-bold text-sm ml-2">
            {t("vehicle.contactSeller")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-green-600 rounded-xl py-3 px-4 flex-row items-center"
          onPress={() => Linking.openURL("whatsapp://")}
        >
          <Phone size={18} color="#FFFFFF" />
          <Text className="text-white font-bold text-sm ml-1">WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="w-1/2 flex-row items-center py-1.5">
      {icon}
      <View className="ml-2.5">
        <Text className="text-[10px] text-slate-500">{label}</Text>
        <Text className="text-sm font-semibold text-slate-900">{value}</Text>
      </View>
    </View>
  );
}