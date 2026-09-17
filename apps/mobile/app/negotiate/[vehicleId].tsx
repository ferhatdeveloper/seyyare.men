import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, TrendingUp } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { NegotiationChat, type NegotiationOffer } from "../../components/agent/NegotiationChat";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import { runAgent } from "../../lib/agent-client";
import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, space } from "../../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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
  const { vehicleId: vehicleIdParam } = useLocalSearchParams();
  const vehicleId = String(
    Array.isArray(vehicleIdParam) ? vehicleIdParam[0] : vehicleIdParam ?? "",
  );
  const { t } = useTranslation();
  const cards = useUIStore((s) => s.cards);

  const [offerAmount, setOfferAmount] = useState("");
  const [buyerMax, setBuyerMax] = useState("");
  const [activeRun, setActiveRun] = useState(false);

  const vehicle = useMemo(() => {
    return vehicleId ? api.getDemoVehicle(vehicleId) : undefined;
  }, [vehicleId]);

  const vehicleTitle =
    vehicle?.title ??
    (vehicle ? `${vehicle.make_name ?? ""} ${vehicle.model ?? ""}`.trim() : null);
  const vehiclePrice =
    vehicle?.price_amount != null
      ? `${Number(vehicle.price_amount).toLocaleString("tr-TR")} ${vehicle.price_currency ?? "TRY"}`
      : null;

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
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Fiyat Pazarlığı"
        subtitle={`Tur ${negotiationData?.turnNumber ?? 0} / ${negotiationData?.maxTurns ?? 10}`}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {(vehicleTitle || vehiclePrice) && (
          <View style={styles.vehicleStrip}>
            {vehicle?.cover_url ? (
              <Image source={{ uri: vehicle.cover_url }} style={styles.vehicleThumb} />
            ) : (
              <View style={[styles.vehicleThumb, styles.vehicleThumbPlaceholder]} />
            )}
            <View style={styles.vehicleMeta}>
              {vehicleTitle ? (
                <Text style={styles.vehicleTitle} numberOfLines={1}>
                  {vehicleTitle}
                </Text>
              ) : null}
              {vehiclePrice ? <Text style={styles.vehiclePrice}>{vehiclePrice}</Text> : null}
              {vehicle?.year || vehicle?.city ? (
                <Text style={styles.vehicleSub} numberOfLines={1}>
                  {[vehicle?.year, vehicle?.city].filter(Boolean).join(" · ")}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {activeRun ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.flame} />
              <Text style={styles.loadingText}>Teklif değerlendiriliyor…</Text>
            </View>
          ) : null}

          <NegotiationChat
            offers={offers}
            status={status}
            currentOffer={currentOffer ?? undefined}
            agreedAmount={agreedAmount}
            onAccept={acceptOffer}
            onReject={rejectOffer}
          />

          {agentSuggestion && status === "active" ? (
            <View style={styles.suggestion}>
              <View style={styles.suggestionHeader}>
                <Sparkles size={16} color={colors.flame} />
                <Text style={styles.suggestionTitle}>AI önerisi</Text>
              </View>
              <Text style={styles.suggestionAmount}>
                {agentSuggestion.amount.toLocaleString("tr-TR")} USD
              </Text>
              <Text style={styles.suggestionReason}>{agentSuggestion.reasoning}</Text>
              <Button
                label="Bu teklifi kullan"
                variant="primary"
                onPress={() => setOfferAmount(String(agentSuggestion.amount))}
                style={styles.useSuggestionBtn}
                textStyle={styles.useSuggestionText}
              />
            </View>
          ) : null}
        </ScrollView>

        {status === "active" ? (
          <View style={styles.composer}>
            <Text style={styles.offerLabel}>Teklifiniz</Text>
            <View style={styles.offerRow}>
              <Field
                value={offerAmount}
                onChangeText={setOfferAmount}
                keyboardType="numeric"
                placeholder="Örn. 25000"
                containerStyle={styles.offerFieldInline}
                style={styles.offerInput}
              />
              <Button
                label="Gönder"
                variant="primary"
                onPress={sendOffer}
                loading={activeRun}
                disabled={activeRun}
                style={styles.sendBtn}
              />
            </View>
            <Field
              label="Üst sınırınız (yalnızca siz görürsünüz)"
              value={buyerMax}
              onChangeText={setBuyerMax}
              keyboardType="numeric"
              placeholder="Örn. 30000"
              containerStyle={styles.maxField}
            />
            <View style={styles.composerHintRow}>
              <TrendingUp size={12} color={colors.flame} />
              <Text style={styles.composerHint}>
                Karşı teklifler AI destekli pazarlıkla yanıtlanır
              </Text>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  vehicleStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    gap: space.md,
  },
  vehicleThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.mist,
  },
  vehicleThumbPlaceholder: {
    borderWidth: 1,
    borderColor: BORDER_FLAME,
  },
  vehicleMeta: { flex: 1, minWidth: 0 },
  vehicleTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  vehiclePrice: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.flameDeep,
    marginTop: 2,
  },
  vehicleSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  scroll: { paddingHorizontal: space.lg, paddingVertical: space.md, paddingBottom: space.xl },
  loading: { alignItems: "center", paddingVertical: space.lg },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: space.xs,
  },
  suggestion: {
    marginTop: space.lg,
    padding: space.lg,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
  },
  suggestionHeader: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  suggestionTitle: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  suggestionAmount: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.flameDeep,
  },
  suggestionReason: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: space.xs,
    lineHeight: 18,
  },
  useSuggestionBtn: {
    alignSelf: "flex-start",
    marginTop: space.md,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  useSuggestionText: { fontSize: 13 },
  composer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: BORDER_FLAME,
    backgroundColor: colors.white,
  },
  offerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  offerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    marginBottom: space.sm,
  },
  offerFieldInline: { flex: 1, marginBottom: 0 },
  offerInput: {
    minHeight: 48,
    borderColor: BORDER_FLAME,
  },
  sendBtn: {
    minWidth: 96,
    paddingHorizontal: space.lg,
  },
  maxField: { marginBottom: space.sm },
  composerHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  composerHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    flex: 1,
  },
});
