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
import { auth, type UserGender } from "../../lib/auth";
import { useDriverStore } from "../../lib/driver-store";
import { useModeStore } from "../../lib/mode-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type RegisterIntent = "user" | "dealer" | "driver";

/** Soft-live Erbil center — used when registering as taxi driver. */
const DRIVER_BOOT_LAT = 36.1911;
const DRIVER_BOOT_LNG = 44.0094;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [intent, setIntent] = useState<RegisterIntent>("user");
  const [gender, setGender] = useState<UserGender | null>(null);
  const [loading, setLoading] = useState(false);
  const setDriver = useDriverStore((s) => s.setDriver);
  const chooseMode = useModeStore((s) => s.choose);

  const onRegister = async () => {
    if (!email && !phone) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setLoading(true);
    try {
      const authRole = intent === "dealer" ? "dealer" : "user";
      const res = await api.register({
        email: email || undefined,
        phone: phone || undefined,
        password,
        displayName: displayName || undefined,
        role: authRole,
      });
      if (res.error) {
        Alert.alert(res.error);
        return;
      }
      await auth.saveTokens({
        ...res,
        user: { ...res.user, gender: gender ?? undefined },
      });
      if (gender) {
        await auth.updateUser({ gender });
      }

      const asDriver = intent === "driver";
      await setDriver(asDriver);
      if (asDriver) {
        await chooseMode("ride");
      }

      if (asDriver && res.user?.id) {
        try {
          await api.rpc("upsert_driver_location", {
            p_user_id: res.user.id,
            lat: DRIVER_BOOT_LAT,
            lng: DRIVER_BOOT_LNG,
            p_online: true,
            p_gender:
              gender === "female" || gender === "male" ? gender : "male",
          });
        } catch {
          /* panel still works offline/demo */
        }
      }

      router.replace(asDriver ? "/driver" : "/(tabs)");
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
            <Text style={styles.title}>{t("auth.register")}</Text>
            <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>

            <View style={styles.roleRow}>
              {(
                [
                  ["user", t("auth.roleUser")],
                  ["dealer", t("auth.roleDealer")],
                  ["driver", t("auth.roleDriver")],
                ] as Array<[RegisterIntent, string]>
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.roleBtn, intent === value && styles.roleBtnActive]}
                  onPress={() => setIntent(value)}
                >
                  <Text
                    style={[styles.roleText, intent === value && styles.roleTextActive]}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.genderLabel}>{t("gender.label")}</Text>
            <Text style={styles.genderHint}>{t("gender.hint")}</Text>
            <View style={styles.genderRow}>
              {(
                [
                  ["female", t("gender.female")],
                  ["male", t("gender.male")],
                  ["unspecified", t("gender.unspecified")],
                ] as Array<[UserGender, string]>
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.genderBtn, gender === value && styles.genderBtnActive]}
                  onPress={() => setGender(value)}
                >
                  <Text
                    style={[styles.genderText, gender === value && styles.genderTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label={t("auth.displayName")}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
            <Field
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label={t("auth.phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.passwordField}
            />

            <Button
              label={loading ? t("common.loading") : t("auth.register")}
              variant="primary"
              loading={loading}
              disabled={loading}
              onPress={onRegister}
            />

            <TouchableOpacity
              style={styles.linkWrap}
              onPress={() => router.replace("/auth/login")}
            >
              <Text style={styles.linkMuted}>
                {t("auth.hasAccount")}{" "}
                <Text style={styles.link}>{t("auth.login")}</Text>
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
    height: 280,
  },
  scroll: { flexGrow: 1, paddingBottom: space.section },
  brand: {
    alignItems: "center",
    paddingTop: space.lg,
    paddingBottom: space.xl,
    paddingHorizontal: space.xl,
  },
  logo: {
    marginBottom: 10,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
    minHeight: 520,
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
    marginBottom: space.xl,
  },
  roleRow: {
    flexDirection: "row",
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: space.xl,
    gap: 2,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  roleBtnActive: {
    backgroundColor: colors.flame,
  },
  roleText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: "center",
  },
  roleTextActive: { color: colors.white },
  genderLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
  },
  genderHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: space.sm,
    lineHeight: 16,
  },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: space.xl,
  },
  genderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.mist,
  },
  genderBtnActive: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  genderText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  genderTextActive: { color: colors.white },
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
