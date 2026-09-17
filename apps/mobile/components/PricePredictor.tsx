import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { api } from "../lib/api";
import { colors, fonts, radius, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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
    <TouchableOpacity style={styles.cta} onPress={runPriceCheck} disabled={loading} activeOpacity={0.9}>
      <View style={styles.iconWrap}>
        <Sparkles size={20} color={colors.white} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.ctaTitle}>{t("sell.aiPricingTitle")}</Text>
        <Text style={styles.ctaSub}>{t("sell.getPriceSuggestion")}</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.white} /> : null}
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
    <View style={cardStyles.wrap}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.title}>AI fiyat önerisi</Text>
        <Text style={cardStyles.meta}>{marketComparisons} ilan analiz edildi</Text>
      </View>

      <Text style={cardStyles.price}>
        {suggested.toLocaleString("tr-TR")} {currency}
      </Text>
      <Text style={cardStyles.range}>
        Aralık: {rangeLow.toLocaleString("tr-TR")} – {rangeHigh.toLocaleString("tr-TR")} {currency}
      </Text>

      {currentPrice !== undefined && currentPrice > 0 ? (
        <View style={cardStyles.currentBox}>
          <Text style={cardStyles.currentText}>
            Sizin fiyatınız:{" "}
            <Text style={cardStyles.currentBold}>
              {currentPrice.toLocaleString("tr-TR")} {currency}
            </Text>
            {currentPrice < rangeLow && " (piyasanın altında, hızlı satar)"}
            {currentPrice > rangeHigh && " (piyasanın üstünde, zor satılır)"}
            {currentPrice >= rangeLow && currentPrice <= rangeHigh && " (piyasa aralığında)"}
          </Text>
        </View>
      ) : null}

      <Text style={cardStyles.explanation}>{explanation}</Text>

      {factors.length > 0 ? (
        <View>
          <Text style={cardStyles.factorsTitle}>Etkileyen faktörler</Text>
          {factors.map((f, i) => (
            <View key={i} style={cardStyles.factorRow}>
              <Text
                style={[
                  cardStyles.factorMark,
                  f.impact === "positive"
                    ? cardStyles.positive
                    : f.impact === "negative"
                      ? cardStyles.negative
                      : cardStyles.neutral,
                ]}
              >
                {f.impact === "positive" ? "▲" : f.impact === "negative" ? "▼" : "•"}
              </Text>
              <Text style={cardStyles.factorText}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.flame,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.sm,
    padding: space.sm,
    marginRight: space.md,
  },
  flex: { flex: 1 },
  ctaTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
  ctaSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
});

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flameDeep,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 4,
  },
  range: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: space.md,
  },
  currentBox: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    padding: space.sm,
    marginBottom: space.md,
  },
  currentText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  currentBold: { fontFamily: fonts.bodySemi, color: colors.ink },
  explanation: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: space.md,
    lineHeight: 16,
  },
  factorsTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
    marginBottom: 6,
  },
  factorRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  factorMark: { marginRight: space.sm, fontSize: 12 },
  positive: { color: colors.flame },
  negative: { color: colors.danger },
  neutral: { color: colors.inkFaint },
  factorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
  },
});
