// CardHost — UI store'daki tüm aktif kartları render eder
// Tek nokta: agent'tan gelen directive'ler burada görselleşir

import { AlertCircle, X } from "lucide-react-native";
import { useUIStore } from "../../lib/ui-store";
import { FraudBadge } from "./FraudBadge";
import { NegotiationChat } from "./NegotiationChat";
import { PriceBreakdown, type PriceData } from "./PriceBreakdown";
import { RecommendationStrip } from "./RecommendationStrip";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  onDismiss?: (cardId: string) => void;
}

/**
 * Aktif kartları UI store'dan alır ve uygun bileşene yönlendirir.
 * Bu bileşen sell.tsx, vehicle/[id].tsx, chat/[id].tsx vb. ekranların
 * içine yerleştirilir — agent directive'lerini tek noktadan render eder.
 */
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
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <PriceBreakdown data={card.data as PriceData} />
                </CardWrapper>
              </View>
            );

          case "fraud_check":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <FraudBadge {...(card.data as any)} />
                </CardWrapper>
              </View>
            );

          case "recognition_result":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <View className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
                    <View className="flex-row items-center mb-2">
                      <AlertCircle size={16} color="#0EA5E9" />
                      <Text className="ml-2 text-sm font-bold text-primary-900">
                        AI Tespit Sonucu
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-primary-900">
                      {String((card.data as any)?.make ?? "—")} {String((card.data as any)?.model ?? "—")}
                    </Text>
                    {(card.data as any)?.year && (
                      <Text className="text-xs text-primary-700 mt-1">
                        Yıl: {String((card.data as any).year)} · Güven: {Math.round(((card.data as any)?.confidence ?? 0) * 100)}%
                      </Text>
                    )}
                  </View>
                </CardWrapper>
              </View>
            );

          case "translation":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <View className="bg-white border border-slate-200 rounded-2xl p-4">
                    <Text className="text-sm font-bold text-slate-900 mb-2">
                      Çeviriler
                    </Text>
                    {((card.data as any)?.translations ?? []).map((t: any, i: number) => (
                      <View key={i} className="mb-2 pb-2 border-b border-slate-100 last:border-0">
                        <Text className="text-[10px] font-bold text-primary-600 uppercase">
                          {t.targetLocale}
                        </Text>
                        <Text className="text-xs text-slate-700 mt-0.5">{t.text}</Text>
                      </View>
                    ))}
                  </View>
                </CardWrapper>
              </View>
            );

          case "recommendations":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <RecommendationStrip
                    title="Benzer İlanlar"
                    vehicles={((card.data as any)?.vehicles ?? []) as any[]}
                  />
                </CardWrapper>
              </View>
            );

          case "negotiation_offer":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <NegotiationChat
                    offers={((card.data as any)?.offers ?? []) as any[]}
                    status={(card.data as any)?.status ?? "active"}
                    currentOffer={(card.data as any)?.currentOffer}
                    agreedAmount={(card.data as any)?.agreedAmount}
                  />
                </CardWrapper>
              </View>
            );

          case "rental_quote":
            return (
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <Text className="text-sm font-bold text-amber-900 mb-1">
                      Dinamik Fiyat Teklifi
                    </Text>
                    <Text className="text-2xl font-bold text-amber-900">
                      {String((card.data as any)?.finalAmount ?? "—")}{" "}
                      <Text className="text-base">{String((card.data as any)?.currency ?? "")}</Text>
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
              <View key={cardId} className="mb-3">
                <CardWrapper onDismiss={handleDismiss}>
                  <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <Text className="text-xs font-bold text-slate-900 mb-1">
                      {card.type}
                    </Text>
                    <Text className="text-xs text-slate-700">
                      {JSON.stringify(card.data).slice(0, 200)}
                    </Text>
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
    <View className="relative">
      {children}
      <TouchableOpacity
        className="absolute top-2 right-2 bg-black/40 rounded-full w-7 h-7 items-center justify-center z-10"
        onPress={onDismiss}
      >
        <X size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}