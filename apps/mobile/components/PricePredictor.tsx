import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";

import { api } from "../lib/api";

interface PriceFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  value: string;
}

interface Props {
  vehicle: {
    make: string;
    model: string;
    year: number;
    mileageKm?: number;
    fuelType?: string;
    transmission?: string;
    bodyType?: string;
    condition?: string;
    countryCode?: string;
    currency?: string;
  };
  onSuggestion: (data: {
    suggestedPrice: number;
    rangeLow: number;
    rangeHigh: number;
    factors: PriceFactor[];
    explanation: string;
    marketComparisons: number;
  }) => void;
  currentPrice?: number;
}

export function PricePredictor({ vehicle, onSuggestion, currentPrice }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const runPriceCheck = async () => {
    if (!vehicle.make || !vehicle.model || !vehicle.year) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.aiPriceSuggest({
        ...vehicle,
        currency: vehicle.currency ?? "USD",
        condition: vehicle.condition ?? "used",
        countryCode: vehicle.countryCode ?? "TR",
      });
      if (res.suggestedPrice) {
        onSuggestion(res);
      } else {
        Alert.alert(t("common.error"));
      }
    } catch {
      Alert.alert(t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      className="bg-gradient-to-br rounded-2xl p-4 flex-row items-center"
      style={{ backgroundColor: "#F59E0B" }}
      onPress={runPriceCheck}
      disabled={loading}
    >
      <View className="bg-white/20 rounded-full p-2 mr-3">
        <Sparkles size={20} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm">{t("sell.aiPricingTitle")}</Text>
        <Text className="text-white/85 text-xs mt-0.5">{t("sell.getPriceSuggestion")}</Text>
      </View>
      {loading && <ActivityIndicator color="#FFFFFF" />}
    </TouchableOpacity>
  );
}

export function PriceSuggestionCard({
  suggested,
  rangeLow,
  rangeHigh,
  currency,
  factors,
  explanation,
  marketComparisons,
  currentPrice,
}: {
  suggested: number;
  rangeLow: number;
  rangeHigh: number;
  currency: string;
  factors: PriceFactor[];
  explanation: string;
  marketComparisons: number;
  currentPrice?: number;
}) {
  return (
    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-amber-900 font-bold text-base">AI Fiyat Önerisi</Text>
        <Text className="text-xs text-amber-700">
          {marketComparisons} ilan analiz edildi
        </Text>
      </View>

      <Text className="text-3xl font-bold text-amber-900 mb-1">
        {suggested.toLocaleString()} {currency}
      </Text>
      <Text className="text-xs text-amber-700 mb-3">
        Aralık: {rangeLow.toLocaleString()} – {rangeHigh.toLocaleString()} {currency}
      </Text>

      {currentPrice !== undefined && currentPrice > 0 && (
        <View className="bg-white/60 rounded-lg p-2 mb-3">
          <Text className="text-xs text-amber-900">
            Sizin fiyatınız: <Text className="font-bold">{currentPrice.toLocaleString()} {currency}</Text>
            {currentPrice < rangeLow && " (piyasanın altında, hızlı satar)"}
            {currentPrice > rangeHigh && " (piyasanın üstünde, zor satılır)"}
            {currentPrice >= rangeLow && currentPrice <= rangeHigh && " (piyasa aralığında)"}
          </Text>
        </View>
      )}

      <Text className="text-xs text-amber-900 mb-3 leading-4">{explanation}</Text>

      {factors.length > 0 && (
        <View>
          <Text className="text-xs font-bold text-amber-900 mb-1.5">Etkileyen Faktörler:</Text>
          {factors.map((f, i) => (
            <View
              key={i}
              className={`flex-row items-start mb-1 ${
                f.impact === "positive" ? "" : f.impact === "negative" ? "" : ""
              }`}
            >
              <Text
                className={`mr-2 text-sm ${
                  f.impact === "positive"
                    ? "text-green-600"
                    : f.impact === "negative"
                      ? "text-red-600"
                      : "text-slate-500"
                }`}
              >
                {f.impact === "positive" ? "▲" : f.impact === "negative" ? "▼" : "•"}
              </Text>
              <Text className="text-xs text-amber-900 flex-1">{f.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}