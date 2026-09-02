// PriceBreakdown — pricing agent'tan gelen fiyat önerisini göster
// Agent-driven card

import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export interface PriceFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  value: string;
}

export interface PriceData {
  suggestedPrice: number;
  rangeLow: number;
  rangeHigh: number;
  currency: string;
  confidence: number;
  factors: PriceFactor[];
  marketComparisons: number;
  explanation: string;
}

interface Props {
  data: PriceData;
  currentPrice?: number;
  onAccept?: () => void;
}

export function PriceBreakdown({ data, currentPrice, onAccept }: Props) {
  const { t } = useTranslation();

  const formatPrice = (n: number) => n.toLocaleString();

  const isInRange =
    currentPrice !== undefined &&
    currentPrice >= data.rangeLow &&
    currentPrice <= data.rangeHigh;

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Sparkles size={16} color="#F59E0B" />
          <Text className="ml-2 text-sm font-bold text-amber-900">
            {t("sell.aiPricingTitle")}
          </Text>
        </View>
        <Text className="text-xs text-amber-700">
          {data.marketComparisons} ilan analiz edildi
        </Text>
      </View>

      <Text className="text-3xl font-bold text-amber-900 mb-1">
        {formatPrice(data.suggestedPrice)} {data.currency}
      </Text>
      <Text className="text-xs text-amber-700 mb-3">
        Aralık: {formatPrice(data.rangeLow)} – {formatPrice(data.rangeHigh)} {data.currency}
      </Text>

      {currentPrice !== undefined && currentPrice > 0 && (
        <View className="bg-white/70 rounded-lg p-2 mb-3">
          <Text className="text-xs text-amber-900">
            Sizin fiyatınız:{" "}
            <Text className="font-bold">{formatPrice(currentPrice)} {data.currency}</Text>
            {currentPrice < data.rangeLow && " · Piyasanın altında, hızlı satar"}
            {currentPrice > data.rangeHigh && " · Piyasanın üstünde, zor satılır"}
            {isInRange && " · Piyasa aralığında"}
          </Text>
        </View>
      )}

      <Text className="text-xs text-amber-900 mb-3 leading-4">{data.explanation}</Text>

      {data.factors.length > 0 && (
        <View className="mb-3">
          <Text className="text-xs font-bold text-amber-900 mb-1.5">
            Etkileyen Faktörler:
          </Text>
          {data.factors.map((f, i) => (
            <View key={i} className="flex-row items-start mb-1">
              <Text
                className={`mr-2 mt-0.5 ${
                  f.impact === "positive"
                    ? "text-green-600"
                    : f.impact === "negative"
                      ? "text-red-600"
                      : "text-slate-500"
                }`}
              >
                {f.impact === "positive" ? <TrendingUp size={12} color="#10B981" /> : f.impact === "negative" ? <TrendingDown size={12} color="#EF4444" /> : <Minus size={12} color="#64748B" />}
              </Text>
              <Text className="text-xs text-amber-900 flex-1 leading-4">{f.value}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-amber-200">
        <Text className="text-xs text-amber-700">
          Güven: {Math.round(data.confidence * 100)}%
        </Text>
        {onAccept && (
          <Text
            className="text-xs font-bold text-amber-900"
            onPress={onAccept}
          >
            Bu fiyatı kullan →
          </Text>
        )}
      </View>
    </View>
  );
}