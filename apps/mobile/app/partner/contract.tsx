import { router } from "expo-router";
import { FileText, Languages } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { useCurrencyStore } from "../../lib/currency-store";
import { DEMO_RENTALS, DEMO_VEHICLES } from "../../lib/demo-data";
import {
  localeNativeName,
  supportedLocales,
  type LocaleCode,
} from "../../lib/locales";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

type ContractType = "sale" | "rental";

const TEMPLATES: Record<
  ContractType,
  Partial<Record<LocaleCode, string>> & { en: string; tr: string; ar: string }
> = {
  sale: {
    tr: "İşbu satış sözleşmesi ile satıcı, aşağıda belirtilen aracı alıcıya teslim etmeyi; alıcı ise bedeli ödemeyi kabul eder. Araç durumu teslim tutanağına işlenir. Ödeme: IQD / anlaşmalı yöntem.",
    en: "This sales agreement: seller delivers the vehicle described below; buyer pays the agreed price. Condition is recorded at handover. Payment: IQD / agreed method.",
    ar: "بموجب عقد البيع هذا يسلم البائع المركبة الموضحة أدناه ويقبل المشتري دفع الثمن. تُسجَّل حالة المركبة عند التسليم. الدفع بالدينار العراقي أو بالطريقة المتفق عليها.",
    "ku-sor": "ئەم گرێبەستی فرۆشتنە: فرۆشیار ئۆتۆمبێلەکە دەدات و کڕیار نرخەکە دەدات. دۆخی ئۆتۆمبێل لە کاتی گەیاندن تۆمار دەکرێت.",
    "ku-bad": "Ev peymana firotinê: firoşkar erebê radest dike û kiryar nirxê dide. Rewşa erebê di radestkirinê de tê tomar kirin.",
    fa: "طبق این قرارداد فروش، فروشنده خودرو را تحویل می‌دهد و خریدار مبلغ توافق‌شده را می‌پردازد.",
  },
  rental: {
    tr: "İşbu kiralama sözleşmesi ile kiraya veren aracı belirtilen tarihlerde kiracıya verir. Depozito, yakıt ve hasar kuralları geçerlidir. Erken iade / gecikme şartlara tabidir.",
    en: "This rental agreement: lessor provides the vehicle for the dates below. Deposit, fuel and damage rules apply. Early return / late fees per terms.",
    ar: "بموجب عقد الإيجار هذا يُسلّم المؤجر المركبة للمستأجر في التواريخ المحددة. تطبق قواعد التأمين والوقود والضرر.",
    "ku-sor": "ئەم گرێبەستی کرێیە: خاوەن ئۆتۆمبێل لە بەرواری دیاریکراو دەیدات. یاسای دیپۆزیت و سووتەمەنی جێبەجێ دەبێت.",
    "ku-bad": "Ev peymana kirêyê: xwedî erebê di dîrokên diyarkirî de dide. Destûrên depozît û sotemeniyê derbas dibin.",
    fa: "طبق این قرارداد اجاره، موجر خودرو را در تاریخ‌های مشخص به مستأجر می‌دهد. قوانین ودیعه و سوخت اعمال می‌شود.",
  },
};

export default function PartnerContractScreen() {
  const { t } = useTranslation();
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const [type, setType] = useState<ContractType>("sale");
  const [locale, setLocale] = useState<LocaleCode>("ar");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [vehicleId, setVehicleId] = useState(
    type === "sale" ? DEMO_VEHICLES[0]?.id : DEMO_RENTALS[0]?.id,
  );

  const vehicles = useMemo(
    () =>
      type === "sale"
        ? DEMO_VEHICLES.slice(0, 5).map((v) => ({
            id: v.id,
            label: v.title ?? `${v.make_name} ${v.model}`,
          }))
        : DEMO_RENTALS.map((r) => ({
            id: r.id,
            label: r.vehicle.title_original ?? r.id,
          })),
    [type],
  );

  const body =
    TEMPLATES[type][locale] ??
    TEMPLATES[type].en ??
    TEMPLATES[type].tr;

  const create = () => {
    if (!party.trim() || !amount.trim()) {
      Alert.alert(t("errors.validationError"));
      return;
    }
    Alert.alert(
      t("partner.contractCreatedTitle"),
      t("partner.contractCreatedBody", {
        type: t(`partner.contractType.${type}`),
        lang: localeNativeName[locale],
        amount: formatListing(Number(amount), "IQD"),
      }),
      [{ text: t("common.done"), onPress: () => router.back() }],
    );
  };

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("partner.newContract")}
        subtitle={t("partner.contractSubtitle")}
        onBack={() => router.back()}
        right={<FileText size={18} color={colors.flame} strokeWidth={2} />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>{t("partner.contractTypeLabel")}</Text>
        <View style={styles.row}>
          <Chip
            label={t("partner.contractType.sale")}
            selected={type === "sale"}
            onPress={() => {
              setType("sale");
              setVehicleId(DEMO_VEHICLES[0]?.id);
            }}
          />
          <Chip
            label={t("partner.contractType.rental")}
            selected={type === "rental"}
            onPress={() => {
              setType("rental");
              setVehicleId(DEMO_RENTALS[0]?.id);
            }}
          />
        </View>

        <Text style={styles.section}>{t("partner.contractVehicle")}</Text>
        <View style={styles.row}>
          {vehicles.map((v) => (
            <Chip
              key={v.id}
              label={v.label}
              selected={vehicleId === v.id}
              onPress={() => setVehicleId(v.id)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("partner.contractParty")}</Text>
        <TextInput
          style={styles.input}
          value={party}
          onChangeText={setParty}
          placeholder={t("partner.contractPartyPh")}
          placeholderTextColor={colors.inkFaint}
        />

        <Text style={styles.section}>{t("partner.contractAmount")}</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="72000000"
          placeholderTextColor={colors.inkFaint}
        />

        <View style={styles.langHeader}>
          <Languages size={16} color={colors.flame} strokeWidth={2.2} />
          <Text style={styles.sectionInline}>{t("partner.contractLocale")}</Text>
        </View>
        <View style={styles.row}>
          {supportedLocales.map((loc) => (
            <Chip
              key={loc}
              label={localeNativeName[loc]}
              selected={locale === loc}
              onPress={() => setLocale(loc)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("partner.contractPreview")}</Text>
        <View style={styles.preview}>
          <Text style={styles.previewBody}>{body}</Text>
        </View>

        <Button
          label={t("partner.createContract")}
          variant="primary"
          onPress={create}
          style={styles.cta}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.sm,
  },
  section: {
    marginTop: space.md,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  sectionInline: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  langHeader: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  preview: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    ...shadow.soft,
  },
  previewBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  cta: { marginTop: space.lg },
});
