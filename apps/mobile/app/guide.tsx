import { router } from "expo-router";
import { BookOpen, ChevronRight, Newspaper } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Screen, ScreenHeader } from "../components/ui/Screen";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const ARTICLES = [
  {
    id: "1",
    kind: "guide" as const,
    title: "Erbil’de ikinci el alırken kontrol listesi",
    meta: "Rehber · 6 dk",
  },
  {
    id: "2",
    kind: "news" as const,
    title: "Hatwan kuru: IQD/USD haftalık özet",
    meta: "Haber · Bugün",
  },
  {
    id: "3",
    kind: "guide" as const,
    title: "Havalimanı transferi vs şehir taksisi",
    meta: "Rehber · 4 dk",
  },
  {
    id: "4",
    kind: "news" as const,
    title: "Togg ve Çin markaları Kürdistan’da",
    meta: "Haber · Dün",
  },
];

export default function GuideScreen() {
  const { t } = useTranslation();

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title={t("hub.guide")}
        subtitle={t("guide.subtitle")}
        onBack={() => router.back()}
        right={<Newspaper size={18} color={colors.flame} strokeWidth={2} />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ARTICLES.map((a) => (
          <TouchableOpacity key={a.id} style={styles.card} activeOpacity={0.9}>
            <View
              style={[
                styles.kind,
                a.kind === "news" ? styles.kindNews : styles.kindGuide,
              ]}
            >
              {a.kind === "news" ? (
                <Newspaper size={16} color={colors.white} strokeWidth={2} />
              ) : (
                <BookOpen size={16} color={colors.flame} strokeWidth={2} />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.meta}>{a.meta}</Text>
            </View>
            <ChevronRight size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        ))}
        <Text style={styles.note}>{t("guide.demoNote")}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.section,
    gap: space.md,
  },
  flex: { flex: 1 },
  card: {
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
  kind: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  kindGuide: { backgroundColor: colors.flameSoft },
  kindNews: { backgroundColor: colors.ink },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  note: {
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: "center",
  },
});
