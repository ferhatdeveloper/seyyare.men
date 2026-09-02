// NegotiationChat — multi-turn fiyat pazarlığı (Faz 10)
// Şu an skeleton + minimal UI, gerçek negotiation agent Faz 10'da tamamlanacak

import { Handshake } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";

export interface NegotiationOffer {
  id: string;
  from: "buyer" | "seller" | "agent";
  amount: number;
  currency: string;
  message: string;
  turnNumber: number;
  createdAt: number;
}

interface Props {
  offers: NegotiationOffer[];
  agreedAmount?: number;
  status: "active" | "agreed" | "rejected" | "expired";
  currentOffer?: NegotiationOffer;
  onAccept?: () => void;
  onCounter?: (amount: number) => void;
  onReject?: () => void;
}

export function NegotiationChat({ offers, status, currentOffer, agreedAmount, onAccept, onCounter, onReject }: Props) {
  const { t } = useTranslation();

  if (status === "agreed" && agreedAmount) {
    return (
      <View className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <View className="items-center">
          <Handshake size={32} color="#10B981" />
          <Text className="text-green-900 font-bold text-lg mt-2">Anlaşma Sağlandı!</Text>
          <Text className="text-green-700 text-2xl font-bold mt-2">
            {agreedAmount.toLocaleString()}
          </Text>
          <Text className="text-xs text-green-600 mt-2">Sözleşme taslağı hazırlanıyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Handshake size={16} color="#0EA5E9" />
          <Text className="ml-2 text-sm font-bold text-slate-900">
            Fiyat Pazarlığı
          </Text>
        </View>
        <Text className="text-xs text-slate-500">Tur {offers.length}</Text>
      </View>

      <ScrollView className="max-h-80 mb-3">
        {offers.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-slate-400 text-sm">Henüz teklif yok</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View
              key={offer.id}
              className={`mb-2 ${offer.from === "buyer" ? "items-end" : "items-start"}`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  offer.from === "buyer" ? "bg-primary-600" : "bg-slate-100"
                }`}
                style={offer.from === "buyer" ? { backgroundColor: "#0284C7" } : {}}
              >
                <Text
                  className={`text-sm font-semibold ${
                    offer.from === "buyer" ? "text-white" : "text-slate-900"
                  }`}
                >
                  {offer.amount.toLocaleString()} {offer.currency}
                </Text>
                {offer.message && (
                  <Text
                    className={`text-xs mt-0.5 ${
                      offer.from === "buyer" ? "text-white/85" : "text-slate-600"
                    }`}
                  >
                    {offer.message}
                  </Text>
                )}
              </View>
              <Text className="text-[10px] text-slate-400 mt-0.5">
                Tur {offer.turnNumber} · {offer.from === "buyer" ? "Alıcı" : "Satıcı"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {currentOffer && status === "active" && (
        <View className="border-t border-slate-200 pt-3 flex-row gap-2">
          {onAccept && (
            <View
              className="flex-1 bg-green-600 rounded-xl py-3 items-center"
              style={{ backgroundColor: "#10B981" }}
              onTouchEnd={onAccept}
            >
              <Text className="text-white font-bold text-sm">Kabul Et</Text>
            </View>
          )}
          {onReject && (
            <View
              className="flex-1 bg-red-50 border border-red-200 rounded-xl py-3 items-center"
              onTouchEnd={onReject}
            >
              <Text className="text-red-600 font-bold text-sm">Reddet</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}