import { router } from "expo-router";
import { Clapperboard, Sparkles, Stars } from "lucide-react-native";
import { useCallback } from "react";
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

import { Screen, ScreenHeader } from "../components/ui/Screen";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const PACKS = [
  {
    key: "basic",
    Icon: Clapperboard,
    titleKey: "socialAgency.packBasic",
    bodyKey: "socialAgency.packBasicBody",
    price: "150,000 IQD / ay",
  },
  {
    key: "pro",
    Icon: Sparkles,
    titleKey: "socialAgency.packPro",
    bodyKey: "socialAgency.packProBody",
    price: "350,000 IQD / ay",
  },
  {
    key: "agency",
    Icon: Stars,
    titleKey: "socialAgency.packAgency",
    bodyKey: "socialAgency.packAgencyBody",
    price: "Özel teklif",
  },
] as const;

export default function SocialAgencyScreen() {
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, []),
  );

  const request = (packTitle: string) => {
    Alert.alert(t("socialAgency.sentTitle"), t("socialAgency.sentBody", { pack: packTitle }));
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("socialAgency.title")}
        subtitle={t("socialAgency.subtitle")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>{t("socialAgency.lead")}</Text>

        {PACKS.map((p) => {
          const Icon = p.Icon;
          return (
            <View key={p.key} style={styles.card}>
              <View style={styles.icon}>
                <Icon size={20} color={colors.flame} strokeWidth={2.2} />
              </View>
              <Text style={styles.title}>{t(p.titleKey)}</Text>
              <Text style={styles.body}>{t(p.bodyKey)}</Text>
              <Text style={styles.price}>{p.price}</Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => request(t(p.titleKey))}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaText}>{t("socialAgency.cta")}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.section, gap: space.md },
  lead: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: space.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow.soft,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 4,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
    marginBottom: space.sm,
  },
  price: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
    marginBottom: space.md,
  },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
});
