// RecommendationStrip — recommendation agent'tan gelen benzer ilanları yatay scroll'da göster

import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { storage } from "../../lib/clients";

interface RecommendedVehicle {
  id: string;
  title: string | null;
  price_amount: number | null;
  price_currency: string | null;
  year: number | null;
  mileage_km: number | null;
  cover_url: string | null;
  reason?: string;
}

interface Props {
  title?: string;
  vehicles: RecommendedVehicle[];
}

export function RecommendationStrip({ title, vehicles }: Props) {
  const { t } = useTranslation();

  if (!vehicles || vehicles.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-center justify-between px-1 mb-2">
        <Text className="text-base font-bold text-slate-900">
          {title ?? "Benzer İlanlar"}
        </Text>
        <ChevronRight size={16} color="#94A3B8" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.id}
            className="mr-3 bg-white rounded-2xl overflow-hidden border border-slate-100 w-44"
            onPress={() => router.push(`/vehicle/${v.id}`)}
            activeOpacity={0.9}
          >
            {v.cover_url ? (
              <Image
                source={{ uri: v.cover_url.startsWith("http") ? v.cover_url : `${storage.url}/${v.cover_url}` }}
                style={{ width: "100%", height: 110 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="w-full h-[110px] bg-slate-200 items-center justify-center">
                <Text className="text-slate-400 text-xs">—</Text>
              </View>
            )}
            <View className="p-2.5">
              <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                {v.title ?? "Araç"}
              </Text>
              {v.year && (
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {v.year} · {v.mileage_km?.toLocaleString() ?? "?"} km
                </Text>
              )}
              <Text className="text-sm font-bold text-primary-600 mt-1">
                {v.price_amount?.toLocaleString() ?? "—"}{" "}
                <Text className="text-[10px]">{v.price_currency ?? ""}</Text>
              </Text>
              {v.reason && (
                <Text className="text-[10px] text-slate-500 mt-1 italic" numberOfLines={1}>
                  {v.reason}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}