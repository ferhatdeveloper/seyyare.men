import { Camera, Check, Sparkles, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
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
import { api } from "../../lib/api";
import { auth } from "../../lib/auth";
import { useCityStore } from "../../lib/city-store";
import { useCurrencyStore } from "../../lib/currency-store";
import { useUIStore } from "../../lib/ui-store";
import {
  LISTING_FEE_IQD,
  useWalletStore,
} from "../../lib/wallet-store";
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
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const balanceIqd = useWalletStore((s) => s.balanceIqd);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const chargeListingFee = useWalletStore((s) => s.chargeListingFee);
  const city = useCityStore((s) => s.city);
  const canAfford = balanceIqd >= LISTING_FEE_IQD;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      void hydrateWallet();
    }, [hydrateWallet]),
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
      Alert.alert(t("errors.validationError"), t("sell.priceRequired"));
      return;
    }
    const charged = await chargeListingFee();
    if (!charged.ok) {
      Alert.alert(
        t("sell.balanceRequiredTitle"),
        t("sell.balanceRequiredBody", {
          fee: formatListing(LISTING_FEE_IQD, "IQD"),
          balance: formatListing(balanceIqd, "IQD"),
          need: formatListing(charged.need, "IQD"),
        }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("sell.topUpNow"),
            onPress: () => router.push("/wallet"),
          },
        ],
      );
      return;
    }
    setActiveRun(true);
    try {
      let inserted = false;
      try {
        const user = await auth.getUser();
        if (user?.id) {
          const yearNum = Number(year);
          const priceNum = Number(price);
          const mileageNum = mileage.trim() ? Number(mileage) : null;
          const title = `${make} ${model} ${year}`.trim();
          const row = await api.createVehicle({
            seller_id: user.id,
            make_custom: make.trim() || null,
            model: model.trim() || null,
            year: Number.isFinite(yearNum) ? yearNum : null,
            mileage_km:
              mileageNum != null && Number.isFinite(mileageNum) ? mileageNum : null,
            price_amount: Number.isFinite(priceNum) ? Math.round(priceNum) : null,
            price_currency: "IQD",
            title_original: title || null,
            description_original: description.trim() || null,
            status: "draft",
            condition: "used",
            country_code: "IQ",
            city: city !== "all" ? city : "Baghdad",
            negotiable: true,
          });
          inserted = row != null && typeof row.id === "string";
        }
      } catch {
        inserted = false;
      }

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
      } catch {
        /* agent optional */
      }

      const feeLabel = formatListing(charged.fee, "IQD");
      const afterPublish = [
        {
          text: t("hub.boost"),
          onPress: () => router.push("/boost"),
        },
        { text: t("common.done") },
      ];
      if (inserted) {
        Alert.alert(
          t("sell.publishedTitle"),
          charged.remote
            ? t("sell.publishedBody", { fee: feeLabel })
            : t("sell.publishedBodyNoFee"),
          afterPublish,
        );
      } else {
        Alert.alert(
          t("sell.publishedTitle"),
          charged.remote
            ? t("sell.publishedDemoFeeBody", { fee: feeLabel })
            : t("sell.publishedDemoBody"),
          afterPublish,
        );
      }
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
            subtitle={t("app.tagline")}
            large
          />

          <TouchableOpacity
            style={[styles.feeCard, !canAfford && styles.feeCardWarn]}
            onPress={() => router.push("/wallet")}
            activeOpacity={0.9}
          >
            <View style={styles.feeIcon}>
              <Wallet size={18} color={canAfford ? colors.flame : colors.danger} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.feeTitle}>{t("sell.listingFeeTitle")}</Text>
              <Text style={styles.feeBody}>
                {t("sell.listingFeeBody", {
                  fee: formatListing(LISTING_FEE_IQD, "IQD"),
                  balance: formatListing(balanceIqd, "IQD"),
                })}
              </Text>
            </View>
            <Text style={styles.feeCta}>
              {canAfford ? t("sell.balanceOk") : t("sell.topUpNow")}
            </Text>
          </TouchableOpacity>

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
          <Text style={styles.feeStickyHint}>
            {canAfford
              ? t("sell.publishWithFee", { fee: formatListing(LISTING_FEE_IQD, "IQD") })
              : t("sell.needBalanceHint")}
          </Text>
          <Button
            label={
              activeRun
                ? "AI çalışıyor..."
                : canAfford
                  ? t("sell.publish")
                  : t("sell.topUpToPublish")
            }
            variant="primary"
            disabled={activeRun}
            loading={activeRun}
            style={styles.publishBtn}
            onPress={() => {
              if (!canAfford) {
                router.push("/wallet");
                return;
              }
              void publishListing();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.xl },

  feeCard: {
    marginHorizontal: space.xl,
    marginBottom: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    ...shadow.soft,
  },
  feeCardWarn: {
    borderColor: "#F0CACA",
    backgroundColor: "#FFF8F8",
  },
  feeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  feeTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  feeBody: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    lineHeight: 17,
  },
  feeCta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.flameDeep,
  },
  feeStickyHint: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: space.sm,
  },

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
