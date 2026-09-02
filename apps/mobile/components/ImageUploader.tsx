import * as ImagePicker from "expo-image-picker";
import { Camera, Upload, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { api } from "../lib/api";

interface UploadedImage {
  uri: string;
  uploading?: boolean;
  recognized?: {
    make: string;
    model: string;
    year: number | null;
    confidence: number;
    bodyType?: string | null;
    color?: string | null;
  };
  error?: string;
}

interface Props {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  onRecognized?: (rec: NonNullable<UploadedImage["recognized"]>) => void;
}

export function ImageUploader({ images, onChange, maxImages = 8, onRecognized }: Props) {
  const { t } = useTranslation();
  const [analyzing, setAnalyzing] = useState(false);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Galeri izni gerekli");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality: 0.85,
      exif: false,
    });

    if (!result.canceled) {
      const newImages: UploadedImage[] = result.assets.map((a) => ({ uri: a.uri }));
      const updated = [...images, ...newImages].slice(0, maxImages);
      onChange(updated);

      // İlk görsel için AI tanıma tetikle
      if (images.length === 0 && newImages.length > 0 && onRecognized) {
        void runRecognition(newImages[0], onRecognized, setAnalyzing);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Kamera izni gerekli");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      const newImage: UploadedImage = { uri: result.assets[0].uri };
      const updated = [...images, newImage].slice(0, maxImages);
      onChange(updated);

      if (images.length === 0 && onRecognized) {
        void runRecognition(newImage, onRecognized, setAnalyzing);
      }
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const setCover = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const [cover] = updated.splice(index, 1);
    updated.unshift(cover);
    onChange(updated);
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-slate-700">
          Fotoğraflar ({images.length}/{maxImages})
        </Text>
        {analyzing && (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#0EA5E9" />
            <Text className="ml-2 text-xs text-primary-600">{t("sell.recognizing")}</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {images.map((img, i) => (
          <TouchableOpacity
            key={`${img.uri}-${i}`}
            onPress={() => setCover(i)}
            className="mr-2 relative"
          >
            <Image
              source={{ uri: img.uri }}
              className="w-24 h-24 rounded-xl bg-slate-100"
              resizeMode="cover"
            />
            {i === 0 && (
              <View className="absolute top-1 left-1 bg-primary-600 px-2 py-0.5 rounded">
                <Text className="text-white text-[10px] font-bold">KAPAK</Text>
              </View>
            )}
            <TouchableOpacity
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
              onPress={() => removeImage(i)}
            >
              <X size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {images.length < maxImages && (
          <>
            <TouchableOpacity
              className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50 mr-2"
              onPress={pickFromGallery}
            >
              <Upload size={24} color="#64748B" />
              <Text className="text-[10px] text-slate-500 mt-1">Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50"
              onPress={takePhoto}
            >
              <Camera size={24} color="#64748B" />
              <Text className="text-[10px] text-slate-500 mt-1">Kamera</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {images.length > 0 && (
        <Text className="text-xs text-slate-500">
          {t("sell.selectCover")}
        </Text>
      )}
    </View>
  );
}

async function runRecognition(
  img: UploadedImage,
  onRecognized: (rec: NonNullable<UploadedImage["recognized"]>) => void,
  setAnalyzing: (b: boolean) => void,
) {
  setAnalyzing(true);
  try {
    const formData = new FormData();
    // RN'de FormData + file için blob URL'i fetch ile çevir
    const response = await fetch(img.uri);
    const blob = await response.blob();
    formData.append("images", blob as unknown as Blob, "car.jpg");

    const result = await api.aiRecognize(formData);
    if (result.make) {
      onRecognized({
        make: result.make,
        model: result.model ?? "",
        year: result.year ?? null,
        confidence: result.overallConfidence ?? 0,
        bodyType: result.bodyType,
        color: result.color,
      });
    }
  } catch (err) {
    console.warn("AI recognition failed:", err);
  } finally {
    setAnalyzing(false);
  }
}