import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Calendar, MapPin, Sparkles, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { storage } from "../../lib/clients";

interface Rental {
  id: string;
  vehicle_id: string;
  daily_rate_amount: number;
  daily_rate_currency: string;
  weekly_rate_amount: number | null;
  monthly_rate_amount: number | null;
  deposit_amount: number | null;
  min_days: number;
  max_days: number;
  insurance_included: boolean;
  instant_book: boolean;
  country_code: string | null;
  city: string | null;
  vehicle: {
    title_original: string | null;
    year: number | null;
    cover_url: string | null;
  };
}

export default function RentalsScreen() {
  const { t, i18n } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["rentals", i18n.language],
    queryFn: () =>
      api.get<Rental[]>(
        "/rentals?status=eq.active&select=*,vehicle:vehicles(id,title_original,year,media:vehicle_media(url,is_cover))&order=created_at.desc&limit=30",
      ),
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="px-5 py-4 bg-white border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900">{t("rentals.title")}</Text>
        <View className="flex-row items-center mt-2 bg-primary-50 rounded-xl px-3 py-2">
          <Sparkles size={14} color="#0EA5E9" />
          <Text className="ml-2 text-xs text-primary-700">
            {t("rentals.dynamicPricing")}: Talep, sezon ve tatil günlerine göre fiyat değişir
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0EA5E9" />
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RentalCard rental={item} />}
          contentContainerStyle={{ padding: 16 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Calendar size={48} color="#CBD5E1" />
          <Text className="text-slate-500 mt-4 text-base">Henüz kiralık araç yok</Text>
          <Text className="text-slate-400 text-sm text-center mt-2">
            Araç sahipleri kiralama seçeneklerini buradan yayınlayabilir
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const { t } = useTranslation();
  const cover = rental.vehicle?.cover_url;
  const dailyRate = Number(rental.daily_rate_amount).toLocaleString();
  const currency = rental.daily_rate_currency;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm border border-slate-100"
      onPress={() => router.push(`/rental/${rental.id}`)}
    >
      <View className="relative">
        {cover ? (
          <Image
            source={{ uri: cover.startsWith("http") ? cover : `${storage.url}/${cover}` }}
            style={{ width: "100%", height: 180 }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View className="w-full h-[180px] bg-slate-200 items-center justify-center">
            <Text className="text-slate-400 text-sm">Fotoğraf yok</Text>
          </View>
        )}

        <View className="absolute top-3 left-3 bg-green-600 rounded-lg px-2.5 py-1 flex-row items-center">
          <Calendar size={12} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold ml-1">
            {t("rentals.perDay")}
          </Text>
        </View>

        {rental.instant_book && (
          <View className="absolute top-3 right-3 bg-amber-500 rounded-lg px-2.5 py-1">
            <Text className="text-white text-xs font-bold">
              ⚡ {t("rentals.instantBook")}
            </Text>
          </View>
        )}
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {rental.vehicle?.title_original ?? "Araç"} {rental.vehicle?.year ? `(${rental.vehicle.year})` : ""}
        </Text>

        <View className="flex-row items-center mt-1.5">
          <MapPin size={12} color="#64748B" />
          <Text className="text-xs text-slate-500 ml-1">
            {[rental.city, rental.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <View>
            <Text className="text-xl font-bold text-primary-600">
              {dailyRate} <Text className="text-sm">{currency}</Text>
            </Text>
            <Text className="text-[10px] text-slate-500">{t("rentals.perDay")}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="bg-primary-600 rounded-full w-9 h-9 items-center justify-center mr-2" style={{ backgroundColor: "#0284C7" }}>
              <Text className="text-white font-bold text-base">→</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}