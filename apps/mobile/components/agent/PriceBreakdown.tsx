import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, space } from "../../lib/theme";

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
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={16} color={colors.flame} />
          <Text style={styles.title}>{t("sell.aiPricingTitle")}</Text>
        </View>
        <Text style={styles.meta}>{data.marketComparisons} ilan analiz edildi</Text>
      </View>

      <Text style={styles.price}>
        {formatPrice(data.suggestedPrice)} {data.currency}
      </Text>
      <Text style={styles.range}>
        Aralık: {formatPrice(data.rangeLow)} – {formatPrice(data.rangeHigh)} {data.currency}
      </Text>

      {currentPrice !== undefined && currentPrice > 0 ? (
        <View style={styles.currentBox}>
          <Text style={styles.currentText}>
            Sizin fiyatınız:{" "}
            <Text style={styles.currentBold}>
              {formatPrice(currentPrice)} {data.currency}
            </Text>
            {currentPrice < data.rangeLow && " · Piyasanın altında, hızlı satar"}
            {currentPrice > data.rangeHigh && " · Piyasanın üstünde, zor satılır"}
            {isInRange && " · Piyasa aralığında"}
          </Text>
        </View>
      ) : null}

      <Text style={styles.explanation}>{data.explanation}</Text>

      {data.factors.length > 0 ? (
        <View style={styles.factors}>
          <Text style={styles.factorsTitle}>Etkileyen Faktörler:</Text>
          {data.factors.map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <View style={styles.factorIcon}>
                {f.impact === "positive" ? (
                  <TrendingUp size={12} color={colors.flame} />
                ) : f.impact === "negative" ? (
                  <TrendingDown size={12} color={colors.danger} />
                ) : (
                  <Minus size={12} color={colors.inkFaint} />
                )}
              </View>
              <Text style={styles.factorText}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.confidence}>Güven: {Math.round(data.confidence * 100)}%</Text>
        {onAccept ? (
          <Text style={styles.acceptLink} onPress={onAccept}>
            Bu fiyatı kullan →
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    borderRadius: radius.lg,
    padding: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  title: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.flame },
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
    borderColor: "#FFD8B8",
    padding: space.sm,
    marginBottom: space.md,
  },
  currentText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted },
  currentBold: { fontFamily: fonts.bodySemi, color: colors.ink },
  explanation: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: space.md,
    lineHeight: 16,
  },
  factors: { marginBottom: space.md },
  factorsTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
    marginBottom: 6,
  },
  factorRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  factorIcon: { marginRight: space.sm, marginTop: 2 },
  factorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: "#FFD8B8",
  },
  confidence: { fontFamily: fonts.body, fontSize: 11, color: colors.flame },
  acceptLink: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.flameDeep,
  },
});
