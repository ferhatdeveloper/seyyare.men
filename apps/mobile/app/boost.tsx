import { router } from "expo-router";
import { Check, Megaphone, Share2, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";

import { Button } from "../components/ui/Button";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { auth, type StoredUser } from "../lib/auth";
import { useCurrencyStore } from "../lib/currency-store";
import {
  BOOST_FEES_IQD,
  type BoostChannel,
  useWalletStore,
} from "../lib/wallet-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const CHANNELS: Array<{
  key: BoostChannel;
  Icon: typeof Smartphone;
  titleKey: string;
  hintKey: string;
}> = [
  { key: "app", Icon: Smartphone, titleKey: "boost.app", hintKey: "boost.appHint" },
  { key: "social", Icon: Share2, titleKey: "boost.social", hintKey: "boost.socialHint" },
  { key: "both", Icon: Megaphone, titleKey: "boost.both", hintKey: "boost.bothHint" },
];

export default function BoostScreen() {
  const { t } = useTranslation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [channel, setChannel] = useState<BoostChannel>("both");
  const [loading, setLoading] = useState(false);
  const balanceIqd = useWalletStore((s) => s.balanceIqd);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const chargeBoost = useWalletStore((s) => s.chargeBoost);
  const formatListing = useCurrencyStore((s) => s.formatListing);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      void hydrateWallet();
      void auth.getUser().then(setUser);
    }, [hydrateWallet]),
  );

  useEffect(() => {
    void auth.getUser().then(setUser);
  }, []);

  const isSeller = user?.role === "dealer" || user?.role === "admin";
  const fee = BOOST_FEES_IQD[channel];

  const onPay = async () => {
    if (!user) {
      Alert.alert(t("boost.loginFirst"));
      router.push("/auth/login");
      return;
    }
    if (!isSeller) {
      Alert.alert(t("boost.title"), t("boost.sellerOnly"));
      return;
    }
    setLoading(true);
    try {
      const res = await chargeBoost(channel);
      if (!res.ok) {
        Alert.alert(
          t("boost.title"),
          t("boost.needFunds", {
            need: formatListing(res.need, "IQD"),
          }),
          [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("hub.pay"), onPress: () => router.push("/wallet") },
          ],
        );
        return;
      }
      Alert.alert(
        t("boost.successTitle"),
        t("boost.successBody", {
          channel: t(`boost.${channel}`),
          amount: formatListing(res.fee, "IQD"),
        }),
        [
          ...(channel === "social" || channel === "both"
            ? [
                {
                  text: t("hub.socialAgency"),
                  onPress: () => router.push("/social-agency"),
                },
              ]
            : []),
          { text: t("common.done"), onPress: () => router.back() },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("boost.title")}
        subtitle={t("boost.subtitle")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isSeller ? (
          <Text style={styles.warn}>{t("boost.sellerOnly")}</Text>
        ) : null}

        <Text style={styles.balance}>
          {t("hub.pay")}: {formatListing(balanceIqd, "IQD")}
        </Text>

        <Text style={styles.section}>{t("boost.pickChannel")}</Text>
        {CHANNELS.map((c) => {
          const Icon = c.Icon;
          const selected = channel === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.card, selected && styles.cardActive]}
              onPress={() => setChannel(c.key)}
              activeOpacity={0.88}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                <Icon
                  size={20}
                  color={selected ? colors.white : colors.flame}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, selected && styles.cardTitleActive]}>
                  {t(c.titleKey)}
                </Text>
                <Text style={styles.cardHint}>{t(c.hintKey)}</Text>
              </View>
              <View style={styles.priceCol}>
                <Text style={[styles.price, selected && styles.priceActive]}>
                  {formatListing(BOOST_FEES_IQD[c.key], "IQD")}
                </Text>
                {selected ? <Check size={16} color={colors.flame} strokeWidth={2.4} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <Button
          label={loading ? t("common.loading") : t("boost.pay")}
          variant="primary"
          loading={loading}
          disabled={loading || !isSeller}
          onPress={() => void onPay()}
          style={styles.payBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.section },
  flex: { flex: 1, minWidth: 0 },
  warn: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.flameDeep,
    backgroundColor: colors.flameSoft,
    padding: space.md,
    borderRadius: radius.md,
    marginBottom: space.lg,
  },
  balance: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: space.lg,
  },
  section: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    marginBottom: space.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
    ...shadow.soft,
  },
  cardActive: {
    borderColor: colors.flame,
    backgroundColor: colors.flameSoft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.flame },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  cardTitleActive: { color: colors.flameDeep },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  priceCol: { alignItems: "flex-end", gap: 4 },
  price: {
    fontFamily: fonts.displayMed,
    fontSize: 13,
    color: colors.ink,
  },
  priceActive: { color: colors.flameDeep },
  payBtn: { marginTop: space.xl },
});
