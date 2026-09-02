import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { auth } from "../../lib/auth";

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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="p-6">
          <Text className="text-3xl font-bold text-slate-900 mb-2">{t("auth.login")}</Text>
          <Text className="text-sm text-slate-500 mb-8">{t("auth.loginSubtitle")}</Text>

          <Text className="text-sm font-semibold text-slate-700 mb-2">
            {t("auth.email")} / {t("auth.phone")}
          </Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-4"
            placeholder="ornek@seyyare.men"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text className="text-sm font-semibold text-slate-700 mb-2">{t("auth.password")}</Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-6"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: "#0284C7", opacity: loading ? 0.6 : 1 }}
            disabled={loading}
            onPress={onLogin}
          >
            <Text className="text-white font-bold text-base">
              {loading ? t("common.loading") : t("auth.login")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={() => router.replace("/auth/register")}
          >
            <Text className="text-primary-600 font-semibold">
              {t("auth.noAccount")} {t("auth.register")}
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-slate-400 text-center mt-6 px-4">
            {t("auth.termsNotice")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}