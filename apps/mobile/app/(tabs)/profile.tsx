import { router } from "expo-router";
import { LogIn, Globe, Heart, Bookmark, Bell, Info, Cpu } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, type StoredUser } from "../../lib/auth";
import { localeNativeName, supportedLocales, type LocaleCode } from "../../lib/locales";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [currentLocale, setCurrentLocale] = useState<LocaleCode>(
    i18n.language as LocaleCode,
  );

  useEffect(() => {
    void auth.getUser().then(setUser);
  }, []);

  const changeLocale = (locale: LocaleCode) => {
    void i18n.changeLanguage(locale);
    setCurrentLocale(locale);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-5 py-4 border-b border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">{t("profile.title")}</Text>
        </View>

        {user ? (
          <View className="px-5 py-6 border-b border-slate-200">
            <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-3">
              <Text className="text-2xl font-bold text-primary-700">
                {(user.displayName ?? user.email ?? user.phone ?? "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-lg font-bold text-slate-900">
              {user.email ?? user.phone}
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              {user.role === "dealer" ? "Dealer" : "User"}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="mx-5 mt-5 bg-primary-600 rounded-2xl py-4 flex-row items-center justify-center"
            style={{ backgroundColor: "#0284C7" }}
            onPress={() => router.push("/auth/login")}
          >
            <LogIn size={20} color="#FFFFFF" />
            <Text className="text-white font-bold text-base ml-2">
              {t("auth.login")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View className="mt-6">
          <MenuItem icon={<Heart size={20} color="#64748B" />} label={t("profile.favorites")} onPress={() => router.push("/favorites")} />
          <MenuItem icon={<Bookmark size={20} color="#64748B" />} label={t("profile.savedSearches")} />
          <MenuItem icon={<Bell size={20} color="#64748B" />} label={t("profile.notifications")} />
          <MenuItem icon={<Cpu size={20} color="#0EA5E9" />} label="Agent Inspector" onPress={() => router.push("/agents")} />
          <MenuItem icon={<Info size={20} color="#64748B" />} label={t("profile.about")} />
        </View>

        {/* Language selector */}
        <View className="mt-6 px-5">
          <View className="flex-row items-center mb-3">
            <Globe size={18} color="#64748B" />
            <Text className="ml-2 text-base font-semibold text-slate-700">
              {t("profile.language")}
            </Text>
          </View>
          <View className="bg-slate-50 rounded-2xl overflow-hidden">
            {supportedLocales.map((loc) => (
              <TouchableOpacity
                key={loc}
                className={`px-4 py-3 flex-row items-center justify-between border-b border-slate-100 ${
                  currentLocale === loc ? "bg-primary-50" : ""
                }`}
                onPress={() => changeLocale(loc)}
              >
                <Text
                  className={`text-sm ${
                    currentLocale === loc ? "text-primary-700 font-semibold" : "text-slate-700"
                  }`}
                >
                  {localeNativeName[loc]}
                </Text>
                {currentLocale === loc && (
                  <View className="w-2 h-2 rounded-full bg-primary-600" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {user && (
          <TouchableOpacity
            className="mx-5 mt-8 bg-red-50 border border-red-200 rounded-2xl py-3 items-center"
            onPress={async () => {
              await auth.clear();
              setUser(null);
            }}
          >
            <Text className="text-red-600 font-semibold">{t("auth.logout")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity className="px-5 py-4 flex-row items-center border-b border-slate-100" onPress={onPress}>
      {icon}
      <Text className="ml-3 text-base text-slate-700 flex-1">{label}</Text>
      <Text className="text-slate-300">›</Text>
    </TouchableOpacity>
  );
}