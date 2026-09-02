import { Sparkles } from "lucide-react-native";
import { useState } from "react";
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
import {
  PricePredictor,
  PriceSuggestionCard,
} from "../../components/PricePredictor";
import { api } from "../../lib/api";

interface PriceSuggestion {
  suggestedPrice: number;
  rangeLow: number;
  rangeHigh: number;
  factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; weight: number; value: string }>;
  explanation: string;
  marketComparisons: number;
}

export default function SellScreen() {
  const { t } = useTranslation();

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const onRecognized = (rec: NonNullable<UploadedImage["recognized"]>) => {
    setMake(rec.make);
    setModel(rec.model);
    if (rec.year) setYear(String(rec.year));
    Alert.alert(
      "AI Tanıma Tamamlandı",
      `${rec.make} ${rec.model}${rec.year ? ` (${rec.year})` : ""} tespit edildi. Lütfen doğrulayın.`,
    );
  };

  const generateDescription = async () => {
    if (!make || !model || !year) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    setGeneratingDesc(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_AI_URL}/ai/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: {
            make,
            model,
            year: Number(year),
            mileageKm: Number(mileage) || undefined,
            condition: "used",
          },
          locale: "tr",
          tone: "professional",
          maxLength: 600,
        }),
      }).then((r) => r.json());

      if (res.description) {
        setDescription(res.description);
      }
    } catch {
      Alert.alert(t("errors.serverError"));
    } finally {
      setGeneratingDesc(false);
    }
  };

  const publishListing = async () => {
    if (!price) {
      Alert.alert(t("sell.priceRequired"));
      return;
    }
    Alert.alert(
      "Yayınla",
      "İlan taslağı admin onayından sonra yayına alınacak.",
      [{ text: t("common.confirm") }],
    );
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
            <ImageUploader images={images} onChange={setImages} onRecognized={onRecognized} />
          </View>

          {/* AI Vision hint */}
          {images.length === 0 && (
            <View className="mx-5 mt-3 bg-primary-50 border border-primary-100 rounded-xl p-3">
              <Text className="text-primary-800 text-xs leading-4">
                <Text className="font-bold">{t("sell.aiVisionTitle")}: </Text>
                {t("sell.aiVisionDesc")}
              </Text>
            </View>
          )}

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

          {/* Price + AI Suggestion */}
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
              <View className="mb-4">
                <PricePredictor
                  vehicle={{
                    make,
                    model,
                    year: Number(year),
                    mileageKm: Number(mileage) || undefined,
                  }}
                  onSuggestion={(s) =>
                    setPriceSuggestion({
                      suggestedPrice: s.suggestedPrice,
                      rangeLow: s.rangeLow,
                      rangeHigh: s.rangeHigh,
                      factors: s.factors,
                      explanation: s.explanation,
                      marketComparisons: s.marketComparisons,
                    })
                  }
                  currentPrice={Number(price) || 0}
                />
              </View>
            )}

            {priceSuggestion && (
              <PriceSuggestionCard
                suggested={priceSuggestion.suggestedPrice}
                rangeLow={priceSuggestion.rangeLow}
                rangeHigh={priceSuggestion.rangeHigh}
                currency="USD"
                factors={priceSuggestion.factors}
                explanation={priceSuggestion.explanation}
                marketComparisons={priceSuggestion.marketComparisons}
                currentPrice={Number(price) || undefined}
              />
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
                disabled={generatingDesc}
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
            style={{ backgroundColor: "#0284C7" }}
            onPress={publishListing}
          >
            <Text className="text-white font-bold text-base">{t("sell.publish")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}