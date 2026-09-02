import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ImageUploader,
  type UploadedImage,
} from "../../components/ImageUploader";
import { PriceBreakdown } from "../../components/agent/PriceBreakdown";
import { CardHost } from "../../components/agent/CardHost";
import { runAgent } from "../../lib/agent-client";
import { useUIStore } from "../../lib/ui-store";

export default function SellScreen() {
  const { t } = useTranslation();
  const forms = useUIStore((s) => s.forms);

  // Agent-driven form auto-fill state
  const autofill = forms["sell-form"];
  const recognized = autofill?.fields ?? {};

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [activeRun, setActiveRun] = useState(false);

  // Agent'tan gelen form_autofill directive'lerini state'e uygula
  useEffect(() => {
    if (recognized.make && !make) setMake(String(recognized.make));
    if (recognized.model && !model) setModel(String(recognized.model));
    if (recognized.year && !year) setYear(String(recognized.year));
  }, [recognized, make, model, year]);

  const handleImagesSelected = async (newImages: UploadedImage[]) => {
    setImages(newImages);

    // İlk görsel için orchestrator'ı tetikle (vision + pricing + fraud paralel)
    if (newImages.length > 0) {
      setActiveRun(true);
      const run = runAgent({
        text: "İlan vermek istiyorum, araç fotoğrafımı yükledim",
        images: newImages.slice(0, 3).map((img) => img.uri),
        locale: "tr",
        vehicleData: { source: "sell_screen" },
      });
      await run.promise;
      setActiveRun(false);
    }
  };

  const generateDescription = async () => {
    if (!make || !model || !year) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setActiveRun(true);
    try {
      const run = runAgent({
        text: `İlan açıklaması üret: ${make} ${model} ${year}, ${mileage || "?"} km`,
        locale: "tr",
      });
      // UI store'dan description'ı çekmek için polling
      await run.promise;
      // TODO: stream_message directive'ten description'ı al
      Alert.alert("Açıklama üretildi", "Kart ekranında görüntülenebilir");
    } finally {
      setActiveRun(false);
    }
  };

  const publishListing = async () => {
    if (!price) {
      Alert.alert(t("sell.priceRequired"));
      return;
    }
    setActiveRun(true);
    try {
      const run = runAgent({
        text: `İlanı yayınla: ${make} ${model} ${year}, ${price}`,
        locale: "tr",
        vehicleData: {
          source: "publish",
          make,
          model,
          year: Number(year),
          price: Number(price),
        },
      });
      await run.promise;
      Alert.alert("Yayınlandı", "İlanınız admin onayından sonra yayına alınacak");
    } finally {
      setActiveRun(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          <View className="px-5 py-4 border-b border-slate-200">
            <Text className="text-2xl font-bold text-slate-900">{t("sell.title")}</Text>
          </View>

          {/* Image uploader */}
          <View className="px-5 pt-5">
            <ImageUploader
              images={images}
              onChange={handleImagesSelected}
            />
          </View>

          {/* AI Vision hint (görsel yoksa) */}
          {images.length === 0 && (
            <View className="mx-5 mt-3 bg-primary-50 border border-primary-100 rounded-xl p-3">
              <Text className="text-primary-800 text-xs leading-4">
                <Text className="font-bold">{t("sell.aiVisionTitle")}: </Text>
                {t("sell.aiVisionDesc")}
              </Text>
            </View>
          )}

          {/* Agent-driven cards (recognition result, price suggestion, fraud check) */}
          <View className="px-5 mt-4">
            <CardHost />
          </View>

          {/* Basic Info */}
          <View className="px-5 mt-5">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Marka</Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-3"
              value={make}
              onChangeText={setMake}
              placeholder="Örn. Toyota"
            />

            <Text className="text-sm font-semibold text-slate-700 mb-2">Model</Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-3"
              value={model}
              onChangeText={setModel}
              placeholder="Örn. Corolla"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Yıl</Text>
                <TextInput
                  className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                  placeholder="2020"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-700 mb-2">KM</Text>
                <TextInput
                  className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="numeric"
                  placeholder="50000"
                />
              </View>
            </View>
          </View>

          {/* Price + AI Suggestion button */}
          <View className="px-5 mt-5">
            <Text className="text-sm font-semibold text-slate-700 mb-2">
              Fiyat <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 mb-3"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="250000"
            />

            {make && model && year && (
              <TouchableOpacity
                className="bg-amber-500 rounded-xl py-3 items-center mb-3"
                onPress={() =>
                  runAgent({
                    text: `Fiyat öner: ${make} ${model} ${year}`,
                    locale: "tr",
                    vehicleData: { make, model, year: Number(year) },
                  })
                }
                disabled={activeRun}
              >
                <View className="flex-row items-center">
                  <Sparkles size={14} color="#FFFFFF" />
                  <Text className="ml-2 text-white font-bold text-sm">
                    {t("sell.getPriceSuggestion")}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          <View className="px-5 mt-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-slate-700">
                Açıklama
              </Text>
              <TouchableOpacity
                className="flex-row items-center bg-primary-50 rounded-full px-3 py-1"
                onPress={generateDescription}
                disabled={activeRun}
              >
                <Sparkles size={12} color="#0EA5E9" />
                <Text className="text-primary-700 text-xs font-semibold ml-1">
                  {t("sell.generateDescription")}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900 min-h-[120px]"
              value={description}
              onChangeText={setDescription}
              placeholder="Aracınızın detaylarını yazın veya AI ile oluşturun"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Publish */}
          <TouchableOpacity
            className="mx-5 mt-6 bg-primary-600 rounded-2xl py-4 items-center"
            style={{ backgroundColor: "#0284C7", opacity: activeRun ? 0.5 : 1 }}
            disabled={activeRun}
            onPress={publishListing}
          >
            <Text className="text-white font-bold text-base">
              {activeRun ? "AI çalışıyor..." : t("sell.publish")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}