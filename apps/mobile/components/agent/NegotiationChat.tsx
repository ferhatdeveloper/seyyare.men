import { Handshake, MessageCircle } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui/Button";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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

function partyLabel(from: NegotiationOffer["from"]) {
  if (from === "buyer") return "Siz";
  if (from === "agent") return "AI";
  return "Satıcı";
}

export function NegotiationChat({
  offers,
  status,
  currentOffer,
  agreedAmount,
  onAccept,
  onReject,
}: Props) {
  if (status === "agreed" && agreedAmount) {
    return (
      <View style={styles.agreedWrap}>
        <View style={styles.agreedInner}>
          <Handshake size={32} color={colors.flame} />
          <Text style={styles.agreedTitle}>Anlaşma sağlandı</Text>
          <Text style={styles.agreedAmount}>{agreedAmount.toLocaleString("tr-TR")}</Text>
          <Text style={styles.agreedSub}>Sözleşme taslağı hazırlanıyor…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Handshake size={14} color={colors.flame} />
          </View>
          <Text style={styles.headerTitle}>Teklif geçmişi</Text>
        </View>
        <Text style={styles.turn}>Tur {offers.length}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {offers.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={22} color={colors.flame} />
            </View>
            <Text style={styles.emptyTitle}>Henüz teklif yok</Text>
            <Text style={styles.emptyText}>
              İlk teklifinizi aşağıdan gönderin; AI karşı teklifi değerlendirir.
            </Text>
          </View>
        ) : (
          offers.map((offer) => {
            const isBuyer = offer.from === "buyer";
            const isAgent = offer.from === "agent";
            return (
              <View
                key={offer.id}
                style={[styles.offerRow, isBuyer ? styles.offerRowBuyer : styles.offerRowSeller]}
              >
                <View
                  style={[
                    styles.bubble,
                    isBuyer ? styles.bubbleBuyer : isAgent ? styles.bubbleAgent : styles.bubbleSeller,
                  ]}
                >
                  <Text
                    style={[
                      styles.amount,
                      isBuyer ? styles.amountBuyer : styles.amountOther,
                    ]}
                  >
                    {offer.amount.toLocaleString("tr-TR")} {offer.currency}
                  </Text>
                  {offer.message ? (
                    <Text
                      style={[styles.msg, isBuyer ? styles.msgBuyer : styles.msgOther]}
                    >
                      {offer.message}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  Tur {offer.turnNumber} · {partyLabel(offer.from)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {currentOffer && status === "active" ? (
        <View style={styles.actions}>
          {onAccept ? (
            <Button
              label="Kabul et"
              variant="primary"
              onPress={onAccept}
              style={styles.actionBtn}
            />
          ) : null}
          {onReject ? (
            <Button
              label="Reddet"
              variant="danger"
              onPress={onReject}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  agreedWrap: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.xl,
    ...shadow.soft,
  },
  agreedInner: { alignItems: "center" },
  agreedTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.flameDeep,
    marginTop: space.sm,
  },
  agreedAmount: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    marginTop: space.sm,
  },
  agreedSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.flame,
    marginTop: space.sm,
  },
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    padding: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.sm,
  },
  headerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  turn: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  scroll: { maxHeight: 320, marginBottom: space.md },
  empty: {
    alignItems: "center",
    paddingVertical: space.xxl,
    paddingHorizontal: space.md,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  emptyTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 18,
  },
  offerRow: { marginBottom: space.sm },
  offerRowBuyer: { alignItems: "flex-end" },
  offerRowSeller: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  bubbleBuyer: {
    backgroundColor: colors.flame,
    borderBottomRightRadius: 4,
  },
  bubbleSeller: {
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderBottomLeftRadius: 4,
  },
  amount: { fontFamily: fonts.bodySemi, fontSize: 15 },
  amountBuyer: { color: colors.white },
  amountOther: { color: colors.ink },
  msg: { fontFamily: fonts.body, fontSize: 12, marginTop: 4, lineHeight: 16 },
  msgBuyer: { color: "rgba(255,255,255,0.92)" },
  msgOther: { color: colors.inkMuted },
  meta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: BORDER_FLAME,
    paddingTop: space.md,
    flexDirection: "row",
    gap: space.sm,
  },
  actionBtn: { flex: 1 },
});
