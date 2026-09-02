import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RentalsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 py-4 border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900">{t("rentals.title")}</Text>
      </View>
      <ScrollView className="flex-1">
        <View className="px-5 py-8 items-center">
          <Text className="text-slate-400 text-sm text-center px-8">
            Faz 4'te takvim, dinamik fiyatlandırma ve rezervasyon akışı burada olacak.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}