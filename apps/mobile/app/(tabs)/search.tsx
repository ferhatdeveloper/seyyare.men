import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 py-4 border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900">{t("search.title")}</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-slate-400 text-sm text-center">
          Faz 3'te gelişmiş filtreler ve AI arama burada olacak.
        </Text>
      </View>
    </SafeAreaView>
  );
}