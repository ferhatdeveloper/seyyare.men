import { LinearGradient } from "expo-linear-gradient";
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
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

export default function LoginScreen() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!identifier || !password) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(identifier, password);
      if (res.error) {
        Alert.alert(t("auth.invalidCredentials"));
        return;
      }
      await auth.saveTokens(res);
      router.replace("/(tabs)");
    } catch {
      Alert.alert(t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  };

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
              label={loading ? t("common.loading") : t("auth.login")}
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={onLogin}
            />

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
