import { AlertCircle, X } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";
import { FraudBadge } from "./FraudBadge";
import { NegotiationChat } from "./NegotiationChat";
import { PriceBreakdown, type PriceData } from "./PriceBreakdown";
import { RecommendationStrip } from "./RecommendationStrip";

interface Props {
  onDismiss?: (cardId: string) => void;
}

export function CardHost({ onDismiss }: Props) {
  const cards = useUIStore((s) => s.cards);
  const removeCard = useUIStore((s) => s.applyHideCard);

  const entries = Object.entries(cards);

  if (entries.length === 0) return null;

  return (
    <View>
      {entries.map(([cardId, card]) => {
        const handleDismiss = () => {
          removeCard(cardId);
          onDismiss?.(cardId);
        };

        switch (card.type) {
          case "price_suggestion":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <PriceBreakdown data={card.data as PriceData} />
                </CardWrapper>
              </View>
            );

          case "fraud_check":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <FraudBadge {...(card.data as React.ComponentProps<typeof FraudBadge>)} />
                </CardWrapper>
              </View>
            );

          case "recognition_result":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <View style={styles.recognition}>
                    <View style={styles.recognitionHeader}>
                      <AlertCircle size={16} color={colors.flame} />
                      <Text style={styles.recognitionTitle}>AI Tespit Sonucu</Text>
                    </View>
                    <Text style={styles.recognitionMain}>
                      {String((card.data as { make?: string })?.make ?? "—")}{" "}
                      {String((card.data as { model?: string })?.model ?? "—")}
                    </Text>
                    {(card.data as { year?: number })?.year ? (
                      <Text style={styles.recognitionMeta}>
                        Yıl: {String((card.data as { year: number }).year)} · Güven:{" "}
                        {Math.round(((card.data as { confidence?: number })?.confidence ?? 0) * 100)}%
                      </Text>
                    ) : null}
                  </View>
                </CardWrapper>
              </View>
            );

          case "translation":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Çeviriler</Text>
                    {((card.data as { translations?: Array<{ targetLocale: string; text: string }> })?.translations ?? []).map(
                      (tr, i) => (
                        <View key={i} style={styles.translationRow}>
                          <Text style={styles.localeTag}>{tr.targetLocale}</Text>
                          <Text style={styles.translationText}>{tr.text}</Text>
                        </View>
                      ),
                    )}
                  </View>
                </CardWrapper>
              </View>
            );

          case "recommendations":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <RecommendationStrip
                    title="Benzer İlanlar"
                    vehicles={((card.data as { vehicles?: unknown[] })?.vehicles ?? []) as React.ComponentProps<
                      typeof RecommendationStrip
                    >["vehicles"]}
                  />
                </CardWrapper>
              </View>
            );

          case "negotiation_offer":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <NegotiationChat
                    offers={((card.data as { offers?: unknown[] })?.offers ?? []) as React.ComponentProps<
                      typeof NegotiationChat
                    >["offers"]}
                    status={(card.data as { status?: "active" }).status ?? "active"}
                    currentOffer={(card.data as { currentOffer?: unknown }).currentOffer as React.ComponentProps<
                      typeof NegotiationChat
                    >["currentOffer"]}
                    agreedAmount={(card.data as { agreedAmount?: number }).agreedAmount}
                  />
                </CardWrapper>
              </View>
            );

          case "rental_quote":
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <View style={styles.quote}>
                    <Text style={styles.quoteTitle}>Dinamik Fiyat Teklifi</Text>
                    <Text style={styles.quoteAmount}>
                      {String((card.data as { finalAmount?: unknown })?.finalAmount ?? "—")}{" "}
                      <Text style={styles.quoteCurrency}>
                        {String((card.data as { currency?: string })?.currency ?? "")}
                      </Text>
                    </Text>
                  </View>
                </CardWrapper>
              </View>
            );

          case "damage_report":
          case "ai_assistant_reply":
          case "validation_warning":
          default:
            return (
              <View key={cardId} style={styles.item}>
                <CardWrapper onDismiss={handleDismiss}>
                  <View style={styles.fallback}>
                    <Text style={styles.fallbackType}>{card.type}</Text>
                    <Text style={styles.fallbackData}>{JSON.stringify(card.data).slice(0, 200)}</Text>
                  </View>
                </CardWrapper>
              </View>
            );
        }
      })}
    </View>
  );
}

function CardWrapper({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <View style={styles.wrapper}>
      {children}
      <TouchableOpacity style={styles.dismiss} onPress={onDismiss}>
        <X size={14} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { marginBottom: space.md },
  wrapper: { position: "relative", ...shadow.soft },
  dismiss: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.overlay,
    borderRadius: radius.sm,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  recognition: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    borderRadius: radius.lg,
    padding: space.lg,
  },
  recognitionHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  recognitionTitle: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  recognitionMain: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
  },
  recognitionMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
    marginTop: 4,
  },
  panel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  panelTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: space.sm,
  },
  translationRow: {
    marginBottom: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  localeTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.flame,
    textTransform: "uppercase",
  },
  translationText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  quote: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    borderRadius: radius.lg,
    padding: space.lg,
  },
  quoteTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  quoteAmount: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.flameDeep,
  },
  quoteCurrency: { fontSize: 14, color: colors.flame },
  fallback: {
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  fallbackType: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
    marginBottom: 4,
  },
  fallbackData: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
});
