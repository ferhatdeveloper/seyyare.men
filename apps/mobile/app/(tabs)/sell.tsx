import { Camera, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SellScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-5 py-4 border-b border-slate-200">
          <Text className="text-2xl font-bold text-slate-900">{t("sell.title")}</Text>
        </View>

        {/* AI Vision Card */}
        <TouchableOpacity
          className="m-5 bg-gradient-to-br rounded-2xl p-6"
          style={{ backgroundColor: "#0EA5E9" }}
        >
          <Sparkles size={32} color="#FFFFFF" />
          <Text className="text-white font-bold text-lg mt-3">
            {t("sell.aiVisionTitle")}
          </Text>
          <Text className="text-white/85 text-sm mt-2 leading-5">
            {t("sell.aiVisionDesc")}
          </Text>
          <View className="flex-row mt-5">
            <TouchableOpacity className="bg-white/20 rounded-xl py-2.5 px-4 flex-row items-center mr-2">
              <Camera size={16} color="#FFFFFF" />
              <Text className="text-white font-semibold text-sm ml-1.5">
                {t("sell.uploadPhoto")}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Form placeholder */}
        <View className="px-5">
          <View className="bg-slate-50 rounded-2xl p-5 mb-3">
            <Text className="text-slate-900 font-bold mb-2">{t("sell.basicInfo")}</Text>
            <Text className="text-slate-500 text-sm">
              Faz 2'de AI araç tanıma burada otomatik dolduracak.
            </Text>
          </View>

          <View className="bg-slate-50 rounded-2xl p-5 mb-3">
            <Text className="text-slate-900 font-bold mb-2">{t("sell.pricing")}</Text>
            <Text className="text-slate-500 text-sm">
              Faz 2'de AI fiyat tahmini ve açıklama üretimi entegre olacak.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="mx-5 mt-3 bg-primary-600 rounded-2xl py-4 items-center"
          style={{ backgroundColor: "#0284C7" }}
        >
          <Text className="text-white font-bold text-base">{t("sell.publish")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}