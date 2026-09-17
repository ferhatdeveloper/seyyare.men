import { router } from "expo-router";
import { Plus, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "../components/ui/Button";
import { Screen, ScreenHeader } from "../components/ui/Screen";
import { useCurrencyStore } from "../lib/currency-store";
import {
  GLOBAL_METHODS,
  IRAQ_METHODS,
  LOCAL_METHODS,
  type PayMethodId,
  getPayMethod,
} from "../lib/payment-methods";
import {
  LISTING_FEE_IQD,
  TOP_UP_PACKAGES_IQD,
  useWalletStore,
} from "../lib/wallet-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

function MethodTile({
  selected,
  onPress,
  brand,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  brand: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.tilePressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.tileMark, selected && styles.tileMarkOn]}>
        <Text style={[styles.tileBrand, selected && styles.tileBrandOn]} numberOfLines={1}>
          {brand.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.tileLabel, selected && styles.tileLabelOn]} numberOfLines={2}>
        {label}
      </Text>
      {selected ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

export default function WalletScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const balanceIqd = useWalletStore((s) => s.balanceIqd);
  const hydrate = useWalletStore((s) => s.hydrate);
  const topUp = useWalletStore((s) => s.topUp);
  const [method, setMethod] = useState<PayMethodId>("fastpay");
  const [loading, setLoading] = useState(false);
  const selected = getPayMethod(method);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const doTopUp = useCallback(
    async (amount: number) => {
      setLoading(true);
      try {
        await topUp(amount);
        Alert.alert(
          t("wallet.topUpDoneTitle"),
          t("wallet.topUpDoneBody", {
            amount: formatListing(amount, "IQD"),
            method: t(`wallet.methods.${selected.labelKey}`),
          }),
        );
      } finally {
        setLoading(false);
      }
    },
    [topUp, t, formatListing, selected.labelKey],
  );

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("hub.pay")}
        subtitle={t("wallet.subtitle")}
        onBack={() => router.back()}
        right={<Wallet size={18} color={colors.flame} strokeWidth={2} />}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t("wallet.balance")}</Text>
          <Text style={styles.balanceValue}>{formatListing(balanceIqd, "IQD")}</Text>
          <Text style={styles.balanceHint}>
            {t("wallet.listingFeeNote", {
              fee: formatListing(LISTING_FEE_IQD, "IQD"),
            })}
          </Text>
        </View>

        <Text style={styles.section}>{t("wallet.topUpPackages")}</Text>
        <View style={styles.packages}>
          {TOP_UP_PACKAGES_IQD.map((amount) => (
            <TouchablePackage
              key={amount}
              label={formatListing(amount, "IQD")}
              loading={loading}
              onPress={() => void doTopUp(amount)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("wallet.groups.local")}</Text>
        <View style={styles.grid}>
          {LOCAL_METHODS.map((m) => (
            <MethodTile
              key={m.id}
              brand={m.brand}
              label={t(`wallet.methods.${m.labelKey}`)}
              selected={method === m.id}
              onPress={() => setMethod(m.id)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("wallet.groups.iraq")}</Text>
        <Text style={styles.sectionHint}>{t("wallet.iraqHint")}</Text>
        <View style={styles.grid}>
          {IRAQ_METHODS.map((m) => (
            <MethodTile
              key={m.id}
              brand={m.brand}
              label={t(`wallet.methods.${m.labelKey}`)}
              selected={method === m.id}
              onPress={() => setMethod(m.id)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("wallet.groups.global")}</Text>
        <Text style={styles.sectionHint}>{t("wallet.globalHint")}</Text>
        <View style={styles.grid}>
          {GLOBAL_METHODS.map((m) => (
            <MethodTile
              key={m.id}
              brand={m.brand}
              label={t(`wallet.methods.${m.labelKey}`)}
              selected={method === m.id}
              onPress={() => setMethod(m.id)}
            />
          ))}
        </View>

        <View style={styles.txCard}>
          <View style={styles.txIcon}>
            <Plus size={16} color={colors.flame} strokeWidth={2.2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.txTitle}>{t("wallet.lastTopUp")}</Text>
            <Text style={styles.txMeta}>
              {t(`wallet.methods.${selected.labelKey}`)} · Erbil
            </Text>
          </View>
        </View>

        <Button
          label={t("wallet.useInTaxi")}
          variant="ink"
          onPress={() =>
            router.push({ pathname: "/taxi", params: { pay: method } })
          }
        />

        <Text style={styles.pspNote}>{t("wallet.pspNote")}</Text>
      </ScrollView>
    </Screen>
  );
}

function TouchablePackage({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.pkg, pressed && styles.tilePressed]}
    >
      <Text style={styles.pkgLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.sm,
  },
  flex: { flex: 1 },
  balanceCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: space.xl,
    marginBottom: space.sm,
    ...shadow.soft,
  },
  balanceLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
  balanceValue: {
    marginTop: 6,
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
  },
  balanceHint: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 17,
  },
  section: {
    marginTop: space.md,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 4,
  },
  packages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pkg: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.flame,
    minWidth: "22%",
    alignItems: "center",
  },
  pkgLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    maxWidth: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
  },
  tileSelected: {
    borderColor: colors.flame,
    backgroundColor: colors.flameSoft,
  },
  tilePressed: { opacity: 0.9 },
  tileMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  tileMarkOn: { backgroundColor: colors.ink },
  tileBrand: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkMuted,
  },
  tileBrandOn: { color: colors.white },
  tileLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
    textAlign: "center",
  },
  tileLabelOn: { color: colors.flameDeep },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.flame,
  },
  txCard: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  txMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  pspNote: {
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 16,
  },
});
