import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar, ChevronLeft, MapPin, Sparkles, Info, Shield, Clock } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import { storage } from "../../lib/clients";

interface Rental {
  id: string;
  daily_rate_amount: number;
  daily_rate_currency: string;
  weekly_rate_amount: number | null;
  monthly_rate_amount: number | null;
  deposit_amount: number | null;
  min_days: number;
  max_days: number;
  insurance_included: boolean;
  delivery_available: boolean;
  instant_book: boolean;
  age_requirement: number;
  country_code: string | null;
  city: string | null;
  vehicle: {
    id: string;
    title_original: string | null;
    year: number | null;
    media: Array<{ url: string; is_cover: boolean }>;
  };
  owner: {
    display_name: string | null;
    verified: boolean;
    rating_avg: number | null;
  };
}

interface PriceQuote {
  days: number;
  baseAmount: number;
  finalAmount: number;
  currency: string;
  totalMultiplier: number;
  factors: Array<{ factor: string; impact: number; description: string }>;
  breakdown: Array<{ label: string; amount: number }>;
  confidence: number;
}

export default function rentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(
    new Date(today.getTime() + 24 * 60 * 60 * 1000),
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
  );

  const { data: rental, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () =>
      api.get<Rental[]>(
        `/rentals?id=eq.${id}&select=*,vehicle:vehicles(id,title_original,year,media:vehicle_media(url,is_cover)),owner:users!owner_id(user_profiles(display_name,verified,rating_avg))`,
      ).then((arr) => arr[0]),
  });

  const days = useMemo(
    () => Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    [startDate, endDate],
  );

  const { data: quote, isFetching: quoteLoading } = useQuery({
    queryKey: ["rental-quote", id, startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10)],
    queryFn: () =>
      fetch(
        `${process.env.EXPO_PUBLIC_AI_URL}/ai/rental-price?rentalId=${id}&startDate=${startDate.toISOString().slice(0, 10)}&endDate=${endDate.toISOString().slice(0, 10)}`,
      ).then((r) => r.json() as Promise<PriceQuote>),
    enabled: days >= 1,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!(await auth.isAuthenticated())) {
        router.push("/auth/login");
        return;
      }
      return api.post("/bookings", {
        rental_id: id,
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        total_days: days,
        total_amount: quote?.finalAmount,
        currency: quote?.currency,
        price_breakdown: quote?.breakdown ?? [],
      });
    },
    onSuccess: () => {
      Alert.alert("Rezervasyon Talebi Oluşturuldu", "Onay için takip edebilirsiniz");
      void qc.invalidateQueries({ queryKey: ["my-bookings"] });
      router.push("/(tabs)/profile");
    },
    onError: () => Alert.alert(t("errors.serverError")),
  });

  if (isLoading || !rental) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0EA5E9" />
      </SafeAreaView>
    );
  }

  const cover = rental.vehicle?.media?.find((m) => m.is_cover)?.url ?? rental.vehicle?.media?.[0]?.url;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1">
        {/* Header image */}
        <View className="relative">
          {cover ? (
            <Image
              source={{ uri: cover.startsWith("http") ? cover : `${storage.url}/${cover}` }}
              style={{ width: "100%", height: 280 }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View className="w-full h-[280px] bg-slate-200" />
          )}
          <TouchableOpacity
            className="absolute top-4 left-4 bg-white/90 rounded-full w-10 h-10 items-center justify-center"
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-slate-900">
            {rental.vehicle?.title_original ?? "Araç"}{" "}
            {rental.vehicle?.year ? `(${rental.vehicle.year})` : ""}
          </Text>

          <View className="flex-row items-center mt-2">
            <MapPin size={14} color="#64748B" />
            <Text className="text-xs text-slate-500 ml-1">
              {[rental.city, rental.country_code].filter(Boolean).join(", ") || "Konum belirtilmemiş"}
            </Text>
          </View>

          {/* Badges */}
          <View className="flex-row flex-wrap mt-3 gap-2">
            {rental.instant_book && (
              <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                <Text className="text-amber-700 text-xs font-semibold">
                  ⚡ {t("rentals.instantBook")}
                </Text>
              </View>
            )}
            {rental.insurance_included && (
              <View className="bg-green-100 px-2.5 py-1 rounded-full flex-row items-center">
                <Shield size={11} color="#047857" />
                <Text className="text-green-700 text-xs font-semibold ml-1">Sigorta dahil</Text>
              </View>
            )}
            {rental.delivery_available && (
              <View className="bg-blue-100 px-2.5 py-1 rounded-full">
                <Text className="text-blue-700 text-xs font-semibold">Teslimat var</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily rate */}
        <View className="mx-5 my-3 bg-primary-50 rounded-2xl p-4 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs text-primary-600 mb-1">Günlük Fiyat</Text>
            <Text className="text-3xl font-bold text-primary-700">
              {Number(rental.daily_rate_amount).toLocaleString()}{" "}
              <Text className="text-base">{rental.daily_rate_currency}</Text>
            </Text>
          </View>
          {rental.weekly_rate_amount && (
            <View className="items-end">
              <Text className="text-xs text-primary-600">Haftalık</Text>
              <Text className="text-sm font-bold text-primary-700">
                {Number(rental.weekly_rate_amount).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Date picker (basit selector) */}
        <View className="mx-5 my-3 bg-white border border-slate-200 rounded-2xl p-4">
          <Text className="text-sm font-bold text-slate-700 mb-3">
            {t("rentals.selectDates")}
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">{t("rentals.pickup")}</Text>
              <TouchableOpacity
                className="bg-slate-100 rounded-xl px-3 py-3 flex-row items-center"
                onPress={() => adjustDate(-1, "start")}
              >
                <Calendar size={14} color="#64748B" />
                <Text className="ml-2 text-sm text-slate-900 flex-1">
                  {formatDate(startDate)}
                </Text>
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    className="bg-slate-200 rounded w-7 h-7 items-center justify-center"
                    onPress={() => adjustDate(-1, "start")}
                  >
                    <Text className="text-slate-700">-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-slate-200 rounded w-7 h-7 items-center justify-center"
                    onPress={() => adjustDate(1, "start")}
                  >
                    <Text className="text-slate-700">+</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-slate-500 mb-1">{t("rentals.return")}</Text>
              <TouchableOpacity
                className="bg-slate-100 rounded-xl px-3 py-3 flex-row items-center"
              >
                <Calendar size={14} color="#64748B" />
                <Text className="ml-2 text-sm text-slate-900 flex-1">
                  {formatDate(endDate)}
                </Text>
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    className="bg-slate-200 rounded w-7 h-7 items-center justify-center"
                    onPress={() => adjustDate(-1, "end")}
                  >
                    <Text className="text-slate-700">-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-slate-200 rounded w-7 h-7 items-center justify-center"
                    onPress={() => adjustDate(1, "end")}
                  >
                    <Text className="text-slate-700">+</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Clock size={12} color="#64748B" />
              <Text className="ml-2 text-xs text-slate-500">
                {t("rentals.totalDays", { count: days })}
              </Text>
            </View>
            {rental.min_days && (
              <Text className="text-xs text-slate-500">
                Min {rental.min_days} • Maks {rental.max_days} gün
              </Text>
            )}
          </View>
        </View>

        {/* Dynamic price breakdown */}
        <View className="mx-5 my-3">
          <View className="flex-row items-center mb-2">
            <Sparkles size={16} color="#F59E0B" />
            <Text className="ml-2 text-sm font-bold text-amber-700">
              {t("rentals.dynamicPricing")} — {t("rentals.priceBreakdown")}
            </Text>
          </View>

          {quoteLoading ? (
            <View className="bg-amber-50 rounded-2xl p-6 items-center">
              <ActivityIndicator color="#F59E0B" />
              <Text className="text-xs text-amber-700 mt-2">Fiyat hesaplanıyor...</Text>
            </View>
          ) : quote && quote.finalAmount ? (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-amber-700">Temel ({days} gün × {Number(rental.daily_rate_amount).toLocaleString()})</Text>
                <Text className="text-sm font-semibold text-amber-900">
                  {quote.baseAmount.toLocaleString()} {quote.currency}
                </Text>
              </View>

              {quote.factors.map((f, i) => (
                <View
                  key={i}
                  className="flex-row items-center justify-between py-1.5 border-t border-amber-100"
                >
                  <Text className="text-xs text-amber-700 flex-1">{f.description}</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      f.impact > 0 ? "text-red-600" : f.impact < 0 ? "text-green-600" : "text-amber-700"
                    }`}
                  >
                    {f.impact > 0 ? "+" : ""}
                    {(f.impact * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}

              <View className="border-t-2 border-amber-300 mt-2 pt-3 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-amber-900">
                  {t("rentals.totalPrice")}
                </Text>
                <Text className="text-2xl font-bold text-amber-900">
                  {quote.finalAmount.toLocaleString()}{" "}
                  <Text className="text-base">{quote.currency}</Text>
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <Text className="text-base font-bold text-amber-900">
                {t("rentals.totalPrice")}: {(Number(rental.daily_rate_amount) * days).toLocaleString()} {rental.daily_rate_currency}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View className="mx-5 my-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <Info size={14} color="#1D4ED8" />
            <Text className="ml-2 text-xs font-semibold text-blue-800">Önemli Bilgiler</Text>
          </View>
          <Text className="text-xs text-blue-900 leading-4">
            • Minimum yaş: {rental.age_requirement}{"\n"}
            • Depozito: {rental.deposit_amount ? `${Number(rental.deposit_amount).toLocaleString()} ${rental.daily_rate_currency}` : "Yok"}{"\n"}
            • Yakıt politikası: Alış ve teslim eşit seviye{"\n"}
            • Sözleşme: Teslim anında imzalanır
          </Text>
        </View>

        <View className="h-28" />
      </ScrollView>

      {/* Book button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
        <TouchableOpacity
          className="bg-primary-600 rounded-2xl py-4 items-center"
          style={{ backgroundColor: "#0284C7", opacity: days < (rental.min_days ?? 1) ? 0.5 : 1 }}
          disabled={days < (rental.min_days ?? 1) || bookMutation.isPending}
          onPress={() => bookMutation.mutate()}
        >
          {bookMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">
              {t("rentals.book")} • {quote ? `${quote.finalAmount.toLocaleString()} ${quote.currency}` : ""}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  function adjustDate(deltaDays: number, which: "start" | "end") {
    if (which === "start") {
      const next = new Date(startDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      if (next < today) return;
      setStartDate(next);
      if (next > endDate) setEndDate(new Date(next.getTime() + 24 * 60 * 60 * 1000));
    } else {
      const next = new Date(endDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
      if (next <= startDate) return;
      setEndDate(next);
    }
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}