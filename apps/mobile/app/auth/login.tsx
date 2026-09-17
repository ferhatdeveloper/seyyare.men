import { SoftGradient as LinearGradient } from "../../components/SoftGradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark, BrandWordmark } from "../../components/brand";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import { useDriverStore } from "../../lib/driver-store";
import { useModeStore } from "../../lib/mode-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const DEMO_PASSWORD = "Demo123!";

const DEMO_ACCOUNTS = [
  { role: "user" as const, email: "demo@seyyare.men", labelKey: "auth.demoUser", home: "/(tabs)" as const },
  { role: "dealer" as const, email: "premium@seyyare.men", labelKey: "auth.demoDealer", home: "/(tabs)" as const },
  { role: "driver" as const, email: "driver@seyyare.men", labelKey: "auth.demoDriver", home: "/driver" as const },
  { role: "admin" as const, email: "admin@seyyare.men", labelKey: "auth.demoAdmin", home: "/(tabs)" as const },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const setDriver = useDriverStore((s) => s.setDriver);
  const chooseMode = useModeStore((s) => s.choose);

  const completeLogin = async (
    id: string,
    pw: string,
    opts?: { asDriver?: boolean; home?: "/(tabs)" | "/driver" },
  ) => {
    const res = await api.login(id, pw);
    if (res.error) {
      Alert.alert(t("auth.invalidCredentials"));
      return false;
    }
    await auth.saveTokens(res);
    await setDriver(Boolean(opts?.asDriver));
    if (opts?.asDriver) {
      await chooseMode("ride");
    }
    router.replace(opts?.home ?? "/(tabs)");
    return true;
  };

  const onLogin = async () => {
    if (!identifier || !password) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setLoading(true);
    try {
      const asDriver =
        identifier.trim().toLowerCase() === "driver@seyyare.men";
      await completeLogin(identifier, password, {
        asDriver,
        home: asDriver ? "/driver" : "/(tabs)",
      });
    } catch {
      Alert.alert(t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const onDemoLogin = async (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setIdentifier(acc.email);
    setPassword(DEMO_PASSWORD);
    setDemoLoading(acc.email);
    setLoading(true);
    try {
      await completeLogin(acc.email, DEMO_PASSWORD, {
        asDriver: acc.role === "driver",
        home: acc.home,
      });
    } catch {
      Alert.alert(t("errors.serverError"));
    } finally {
      setDemoLoading(null);
      setLoading(false);
    }
  };

  const busy = loading || demoLoading !== null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.ink, "#141414", colors.paper]}
        locations={[0, 0.45, 0.85]}
        style={styles.heroWash}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.brand}>
              <BrandMark size="lg" style={styles.logo} />
              <BrandWordmark script="latin" size={32} tone="light" />
            </View>
          </SafeAreaView>

          <View style={styles.sheet}>
            <Text style={styles.title}>{t("auth.login")}</Text>
            <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>

            <Field
              label={`${t("auth.email")} / ${t("auth.phone")}`}
              placeholder="ornek@seyyare.men"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Field
              label={t("auth.password")}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              containerStyle={styles.passwordField}
            />

            <Button
              label={loading && !demoLoading ? t("common.loading") : t("auth.login")}
              variant="primary"
              loading={loading && !demoLoading}
              disabled={busy}
              onPress={onLogin}
            />

            <View style={styles.demoBlock}>
              <Text style={styles.demoTitle}>{t("auth.demoAccounts")}</Text>
              <Text style={styles.demoHint}>Demo123!</Text>
              <View style={styles.demoRow}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <TouchableOpacity
                    key={acc.email}
                    style={[
                      styles.demoChip,
                      demoLoading === acc.email && styles.demoChipActive,
                    ]}
                    disabled={busy}
                    activeOpacity={0.75}
                    onPress={() => void onDemoLogin(acc)}
                  >
                    <Text
                      style={[
                        styles.demoChipLabel,
                        demoLoading === acc.email && styles.demoChipLabelActive,
                      ]}
                    >
                      {demoLoading === acc.email
                        ? t("common.loading")
                        : t(acc.labelKey)}
                    </Text>
                    <Text style={styles.demoChipEmail} numberOfLines={1}>
                      {acc.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.linkWrap}
              onPress={() => router.replace("/auth/register")}
            >
              <Text style={styles.linkMuted}>
                {t("auth.noAccount")}{" "}
                <Text style={styles.link}>{t("auth.register")}</Text>
              </Text>
            </TouchableOpacity>

            <Text style={styles.terms}>{t("auth.termsNotice")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    height: 320,
  },
  scroll: { flexGrow: 1, paddingBottom: space.section },
  brand: {
    alignItems: "center",
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    paddingHorizontal: space.xl,
  },
  logo: {
    marginBottom: 12,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
    minHeight: 420,
    ...shadow.soft,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    marginBottom: space.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: space.section,
  },
  passwordField: { marginBottom: space.xxl },
  demoBlock: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  demoTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  demoHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: space.md,
  },
  demoRow: {
    gap: space.sm,
  },
  demoChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    backgroundColor: colors.mist,
  },
  demoChipActive: {
    borderColor: colors.flame,
    backgroundColor: colors.flameSoft,
  },
  demoChipLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  demoChipLabelActive: {
    color: colors.flameDeep,
  },
  demoChipEmail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  linkWrap: { alignItems: "center", paddingVertical: space.md, marginTop: space.sm },
  linkMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  link: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flame,
  },
  terms: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: space.xl,
    paddingHorizontal: space.lg,
    lineHeight: 16,
  },
});
