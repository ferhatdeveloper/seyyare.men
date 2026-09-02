import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";
import { auth } from "../../lib/auth";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"user" | "dealer">("user");
  const [loading, setLoading] = useState(false);

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
      const res = await api.register({
        email: email || undefined,
        phone: phone || undefined,
        password,
        displayName: displayName || undefined,
        role,
      });
      if (res.error) {
        Alert.alert(res.error);
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
          <Text className="text-3xl font-bold text-slate-900 mb-2">
            {t("auth.register")}
          </Text>
          <Text className="text-sm text-slate-500 mb-8">{t("auth.registerSubtitle")}</Text>

          {/* Role selector */}
          <View className="flex-row mb-6 bg-slate-100 rounded-xl p-1">
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-lg ${role === "user" ? "bg-white" : ""}`}
              onPress={() => setRole("user")}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  role === "user" ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Bireysel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-lg ${role === "dealer" ? "bg-white" : ""}`}
              onPress={() => setRole("dealer")}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  role === "dealer" ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Galeri / Bayi
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-semibold text-slate-700 mb-2">{t("auth.displayName")}</Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-4"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />

          <Text className="text-sm font-semibold text-slate-700 mb-2">{t("auth.email")}</Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-4"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text className="text-sm font-semibold text-slate-700 mb-2">{t("auth.phone")}</Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-4"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text className="text-sm font-semibold text-slate-700 mb-2">{t("auth.password")}</Text>
          <TextInput
            className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-6"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 items-center mb-4"
            style={{ backgroundColor: "#0284C7", opacity: loading ? 0.6 : 1 }}
            disabled={loading}
            onPress={onRegister}
          >
            <Text className="text-white font-bold text-base">
              {loading ? t("common.loading") : t("auth.register")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-3" onPress={() => router.back()}>
            <Text className="text-primary-600 font-semibold">
              {t("auth.hasAccount")} {t("auth.login")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}