import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send, Sparkles, TrendingUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NegotiationChat, type NegotiationOffer } from "../../components/agent/NegotiationChat";
import { useUIStore } from "../../lib/ui-store";
import { runAgent } from "../../lib/agent-client";

interface NegotiationData {
  negotiationId: string;
  status: "active" | "agreed" | "rejected" | "expired";
  offers: NegotiationOffer[];
  currentOffer: NegotiationOffer | null;
  agreedAmount?: number;
  agentSuggestion?: { amount: number; reasoning: string };
  turnNumber: number;
  maxTurns: number;
}

export default function NegotiateScreen() {
  const { vehicleId } = useLocalSearchParams();
  const { t } = useTranslation();
  const cards = useUIStore((s) => s.cards);

  const [offerAmount, setOfferAmount] = useState("");
  const [buyerMax, setBuyerMax] = useState("");
  const [activeRun, setActiveRun] = useState(false);

  // UI store'dan negotiation_card'ı bul
  const negotiationCard = Object.values(cards).find(
    (c) => c.type === "negotiation_offer",
  ) as { data: NegotiationData } | undefined;

  const negotiationData = negotiationCard?.data;
  const negotiationId = negotiationData?.negotiationId;
  const offers = negotiationData?.offers ?? [];
  const status = negotiationData?.status ?? "active";
  const currentOffer = negotiationData?.currentOffer ?? null;
  const agreedAmount = negotiationData?.agreedAmount;
  const agentSuggestion = negotiationData?.agentSuggestion;

  useEffect(() => {
    // İlk girişte negotiation'ı başlat
    if (!negotiationId) {
      setActiveRun(true);
      runAgent({
        text: "Fiyat pazarlığı başlat",
        locale: "tr",
        vehicleId,
        vehicleData: {
          negotiationId: "",
          vehicleId,
          action: "start",
        },
      }).promise.finally(() => setActiveRun(false));
    }
  }, []);

  const sendOffer = async () => {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Geçerli bir teklif girin");
      return;
    }
    if (!negotiationId) {
      Alert.alert("Pazarlık henüz başlatılmadı");
      return;
    }

    setActiveRun(true);
    try {
      await runAgent({
        text: `Teklif: ${amount}`,
        locale: "tr",
        vehicleId,
        vehicleData: {
          negotiationId,
          vehicleId,
          action: "counter",
          offerAmount: amount,
          buyerMaxOffer: buyerMax ? Number(buyerMax) : undefined,
        },
      }).promise;
      setOfferAmount("");
    } finally {
      setActiveRun(false);
    }
  };

  const acceptOffer = async () => {
    if (!negotiationId) return;
    setActiveRun(true);
    try {
      await runAgent({
        text: "Teklifi kabul et",
        locale: "tr",
        vehicleId,
        vehicleData: {
          negotiationId,
          vehicleId,
          action: "accept",
        },
      }).promise;
    } finally {
      setActiveRun(false);
    }
  };

  const rejectOffer = async () => {
    if (!negotiationId) return;
    Alert.alert("Teklifi reddet", "Emin misiniz?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: "Reddet",
        style: "destructive",
        onPress: async () => {
          setActiveRun(true);
          try {
            await runAgent({
              text: "Teklifi reddet",
              locale: "tr",
              vehicleId,
              vehicleData: {
                negotiationId,
                vehicleId,
                action: "reject",
              },
            }).promise;
            router.back();
          } finally {
            setActiveRun(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3 border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Fiyat Pazarlığı</Text>
          <Text className="text-xs text-slate-500">
            Tur {negotiationData?.turnNumber ?? 0} / {negotiationData?.maxTurns ?? 10}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView className="flex-1 px-4 py-3">
          {activeRun && (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="#0EA5E9" />
              <Text className="text-xs text-slate-500 mt-1">AI çalışıyor...</Text>
            </View>
          )}

          <NegotiationChat
            offers={offers}
            status={status}
            currentOffer={currentOffer ?? undefined}
            agreedAmount={agreedAmount}
            onAccept={acceptOffer}
            onReject={rejectOffer}
          />

          {agentSuggestion && status === "active" && (
            <View className="mt-4 bg-primary-50 border border-primary-200 rounded-2xl p-4">
              <View className="flex-row items-center mb-2">
                <Sparkles size={16} color="#0EA5E9" />
                <Text className="ml-2 text-sm font-bold text-primary-900">
                  AI Önerisi
                </Text>
              </View>
              <Text className="text-2xl font-bold text-primary-700">
                {agentSuggestion.amount.toLocaleString()} USD
              </Text>
              <Text className="text-xs text-primary-700 mt-1 leading-4">
                {agentSuggestion.reasoning}
              </Text>
              <TouchableOpacity
                className="mt-3 bg-primary-600 rounded-xl py-2 px-4 self-start flex-row items-center"
                style={{ backgroundColor: "#0284C7" }}
                onPress={() => setOfferAmount(String(agentSuggestion.amount))}
              >
                <TrendingUp size={12} color="#FFFFFF" />
                <Text className="ml-1.5 text-white font-semibold text-xs">
                  Bu teklifi kullan
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {status === "active" && (
          <View className="px-4 py-3 border-t border-slate-200">
            <Text className="text-xs font-semibold text-slate-700 mb-1.5">
              Senin teklifin (USD)
            </Text>
            <View className="flex-row gap-2 mb-2">
              <TextInput
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder="25000"
              />
              <TouchableOpacity
                className="bg-primary-600 rounded-xl w-12 items-center justify-center"
                style={{ backgroundColor: "#0284C7", opacity: activeRun ? 0.5 : 1 }}
                onPress={sendOffer}
                disabled={activeRun}
              >
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-slate-500 mb-1">Max teklifin (PRIVATE, satıcı görmez)</Text>
            <TextInput
              className="bg-slate-50 rounded-xl px-4 py-2 text-sm text-slate-700"
              value={buyerMax}
              onChangeText={setBuyerMax}
              keyboardType="numeric"
              placeholder="30000"
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}