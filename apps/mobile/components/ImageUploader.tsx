import * as ImagePicker from "expo-image-picker";
import { Camera, Upload, X } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../lib/api";
import { colors, fonts, radius, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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
      <View style={styles.header}>
        <Text style={styles.title}>
          Fotoğraflar ({images.length}/{maxImages})
        </Text>
        {analyzing ? (
          <View style={styles.analyzing}>
            <ActivityIndicator size="small" color={colors.flame} />
            <Text style={styles.analyzingText}>{t("sell.recognizing")}</Text>
          </View>
        ) : null}
      </View>

      {images.length === 0 ? (
        <View style={styles.dropZone}>
          <View style={styles.dropIconWrap}>
            <Upload size={24} color={colors.flame} />
          </View>
          <Text style={styles.dropTitle}>Fotoğraf ekleyin</Text>
          <Text style={styles.dropSub}>Galeri veya kameradan yükleyin</Text>
          <View style={styles.dropActions}>
            <TouchableOpacity style={styles.dropAction} onPress={pickFromGallery} activeOpacity={0.85}>
              <Upload size={16} color={colors.flame} />
              <Text style={styles.dropActionText}>Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropAction} onPress={takePhoto} activeOpacity={0.85}>
              <Camera size={16} color={colors.flame} />
              <Text style={styles.dropActionText}>Kamera</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
            {images.map((img, i) => (
              <TouchableOpacity key={`${img.uri}-${i}`} onPress={() => setCover(i)} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} resizeMode="cover" />
                {i === 0 ? (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Kapak</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                  <X size={14} color={colors.white} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {images.length < maxImages ? (
              <>
                <TouchableOpacity style={styles.addBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                  <View style={styles.addIconWrap}>
                    <Upload size={20} color={colors.flame} />
                  </View>
                  <Text style={styles.addLabel}>Galeri</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={takePhoto} activeOpacity={0.85}>
                  <View style={styles.addIconWrap}>
                    <Camera size={20} color={colors.flame} />
                  </View>
                  <Text style={styles.addLabel}>Kamera</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
          <Text style={styles.hint}>{t("sell.selectCover")}</Text>
        </>
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

export type { UploadedImage };

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.inkMuted,
  },
  analyzing: { flexDirection: "row", alignItems: "center" },
  analyzingText: {
    marginLeft: space.sm,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
  },
  scroll: { marginBottom: space.md },
  thumbWrap: { marginRight: space.sm, position: "relative" },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
  },
  coverBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: colors.flame,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 9,
    color: colors.white,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.flameSoft,
    marginRight: space.sm,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  addLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.flameDeep,
    marginTop: 2,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER_FLAME,
    backgroundColor: colors.flameSoft,
    borderRadius: radius.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: "center",
    marginBottom: space.sm,
  },
  dropIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  dropTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  dropSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 4,
  },
  dropActions: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.lg,
  },
  dropAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  dropActionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.flameDeep,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
});
