import { Camera, Check, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ImageUploader,
  type UploadedImage,
} from "../../components/ImageUploader";
import { CardHost } from "../../components/agent/CardHost";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { runAgent } from "../../lib/agent-client";
import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const STEPS = [
  { key: "photos", label: "Foto" },
  { key: "details", label: "Detay" },
  { key: "price", label: "Fiyat" },
  { key: "publish", label: "Yayın" },
] as const;

export default function SellScreen() {
  const { t } = useTranslation();
  const forms = useUIStore((s) => s.forms);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
    }, []),
  );

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

  useEffect(() => {
    if (recognized.make && !make) setMake(String(recognized.make));
    if (recognized.model && !model) setModel(String(recognized.model));
    if (recognized.year && !year) setYear(String(recognized.year));
  }, [recognized, make, model, year]);

  const stepIndex = useMemo(() => {
    if (!images.length) return 0;
    if (!make || !model || !year) return 1;
    if (!price) return 2;
    return 3;
  }, [images.length, make, model, year, price]);

  const handleImagesSelected = async (newImages: UploadedImage[]) => {
    setImages(newImages);

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
      await run.promise;
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
    <Screen edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title={t("sell.title")}
            subtitle="Birkaç adımda ilanını yayınla"
            large
          />

          <View style={styles.steps}>
            {STEPS.map((step, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                    ]}
                  >
                    {done ? (
                      <Check size={12} color={colors.white} strokeWidth={3} />
                    ) : (
                      <Text
                        style={[
                          styles.stepNum,
                          (done || active) && styles.stepNumOn,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (done || active) && styles.stepLabelOn,
                    ]}
                  >
                    {step.label}
                  </Text>
                  {i < STEPS.length - 1 ? (
                    <View
                      style={[styles.stepLine, done && styles.stepLineDone]}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>

          <SectionHeader title="1 · Fotoğraflar" />
          <View style={styles.photoZone}>
            {images.length === 0 ? (
              <View style={styles.photoEmpty}>
                <View style={styles.photoIconWrap}>
                  <Camera size={22} color={colors.flame} strokeWidth={2} />
                </View>
                <Text style={styles.photoEmptyTitle}>Kapak fotoğrafı ekle</Text>
                <Text style={styles.photoEmptySub}>
                  Net dış çekimler AI tanımayı güçlendirir
                </Text>
              </View>
            ) : null}
            <ImageUploader images={images} onChange={handleImagesSelected} />
          </View>

          {images.length === 0 ? (
            <View style={styles.visionHint}>
              <Sparkles size={14} color={colors.viridianDeep} strokeWidth={2} />
              <Text style={styles.visionHintText}>
                <Text style={styles.visionHintBold}>{t("sell.aiVisionTitle")}: </Text>
                {t("sell.aiVisionDesc")}
              </Text>
            </View>
          ) : null}

          <View style={styles.cardHostWrap}>
            <CardHost />
          </View>

          <SectionHeader title="2 · Araç bilgileri" />
          <View style={styles.formCard}>
            <Field label="Marka" value={make} onChangeText={setMake} placeholder="Örn. Toyota" />
            <Field label="Model" value={model} onChangeText={setModel} placeholder="Örn. Corolla" />
            <View style={styles.row}>
              <View style={styles.half}>
                <Field
                  label="Yıl"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                  placeholder="2020"
                />
              </View>
              <View style={styles.half}>
                <Field
                  label="KM"
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="numeric"
                  placeholder="50000"
                />
              </View>
            </View>
          </View>

          <SectionHeader title="3 · Fiyat" />
          <View style={styles.formCard}>
            <Field
              label="Fiyat"
              required
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="250000"
            />

            {make && model && year ? (
              <TouchableOpacity
                style={styles.priceSuggestBtn}
                onPress={() =>
                  runAgent({
                    text: `Fiyat öner: ${make} ${model} ${year}`,
                    locale: "tr",
                    vehicleData: { make, model, year: Number(year) },
                  })
                }
                disabled={activeRun}
                activeOpacity={0.85}
              >
                <Sparkles size={14} color={colors.white} />
                <Text style={styles.priceSuggestText}>{t("sell.getPriceSuggestion")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <SectionHeader title="Açıklama" />
          <View style={styles.formCard}>
            <View style={styles.descHeader}>
              <Text style={styles.descLabel}>İlan metni</Text>
              <TouchableOpacity
                style={styles.aiChip}
                onPress={generateDescription}
                disabled={activeRun}
                activeOpacity={0.85}
              >
                <Sparkles size={12} color={colors.viridian} />
                <Text style={styles.aiChipText}>{t("sell.generateDescription")}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Aracınızın detaylarını yazın veya AI ile oluşturun"
              placeholderTextColor={colors.inkFaint}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.stickyCta}>
          <Button
            label={activeRun ? "AI çalışıyor..." : t("sell.publish")}
            variant="primary"
            disabled={activeRun}
            loading={activeRun}
            style={styles.publishBtn}
            onPress={publishListing}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.xl },

  steps: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: space.xl,
    marginBottom: space.lg,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.mist,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepDotActive: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  stepDotDone: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  stepNum: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.inkFaint,
  },
  stepNumOn: { color: colors.white },
  stepLabel: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  stepLabelOn: {
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  stepLine: {
    position: "absolute",
    top: 13,
    left: "55%",
    right: "-45%",
    height: 2,
    backgroundColor: colors.line,
    zIndex: 0,
  },
  stepLineDone: { backgroundColor: colors.ink },

  photoZone: {
    marginHorizontal: space.xl,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow.soft,
  },
  photoEmpty: {
    alignItems: "center",
    paddingVertical: space.md,
    marginBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  photoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  photoEmptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  photoEmptySub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 4,
    textAlign: "center",
  },

  visionHint: {
    marginHorizontal: space.xl,
    marginTop: space.md,
    padding: space.md,
    backgroundColor: colors.viridianSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  visionHintText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.viridianDeep,
    lineHeight: 17,
  },
  visionHintBold: { fontFamily: fonts.bodySemi },

  cardHostWrap: {
    paddingHorizontal: space.xl,
    marginTop: space.lg,
  },

  formCard: {
    marginHorizontal: space.xl,
    marginBottom: space.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    ...shadow.soft,
  },
  row: { flexDirection: "row", gap: space.md },
  half: { flex: 1 },

  priceSuggestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginBottom: space.md,
    gap: space.sm,
  },
  priceSuggestText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.white,
  },

  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  descLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
  },
  aiChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.viridianSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  aiChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.viridianDeep,
  },
  textArea: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    minHeight: 120,
    marginBottom: space.md,
  },

  stickyCta: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: Platform.OS === "ios" ? space.lg : space.md,
    ...shadow.soft,
  },
  publishBtn: {
    ...shadow.float,
  },
});
