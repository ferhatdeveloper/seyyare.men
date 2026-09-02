import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1">
        <View className="px-5 py-8 items-center">
          <Text className="text-slate-900 font-bold text-lg mb-2">
            {t("vehicle.specs")}
          </Text>
          <Text className="text-slate-500 text-sm">ID: {id}</Text>
          <Text className="text-slate-400 text-sm mt-4 text-center px-8">
            Faz 3'te galeri, harita ve AI analiz burada olacak.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}