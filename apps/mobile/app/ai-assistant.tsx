import { ChevronLeft, Send, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "../components/brand";
import { api } from "../lib/api";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

interface Message {
  role: "user" | "assistant";
  content: string;
  filters?: Record<string, unknown>;
  vehicles?: Array<{ id: string; summary: string }>;
}

const QUICK_PROMPTS = [
  "2020 sonrası otomatik SUV İstanbul'da ne kadar?",
  "50.000 km altı hibrit sedan öner",
  "10.000 EUR altı ikinci el hatchback",
  "Aile için geniş bagajlı araç önerisi",
];

export default function AIAssistantScreen() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.aiAssistant(
        [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        i18n.language,
      );

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply ?? "Üzgünüm, bir hata oluştu.",
          filters: res.suggestedFilters,
          vehicles: res.matchedVehicles,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Şu an yanıt veremiyorum, lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <BrandMark size="sm" style={styles.headerPin} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t("home.aiAssistant")}</Text>
            <Text style={styles.headerSub}>seyyare.men</Text>
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyHero}>
                <View style={styles.emptyIconWrap}>
                  <Sparkles size={22} color={colors.flame} strokeWidth={2} />
                </View>
                <Text style={styles.greetingTitle}>Nasıl bir araç arıyorsun?</Text>
                <Text style={styles.greeting}>
                  Bütçe, şehir, yakıt veya gövde tipi söyle — filtre ve ilan önerisi çıkarayım.
                </Text>
              </View>

              <Text style={styles.quickLabel}>Hızlı sorular</Text>
              <View style={styles.chipWrap}>
                {QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.quickChip} onPress={() => sendMessage(p)}>
                    <View style={styles.chipDot} />
                    <Text style={styles.quickText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[styles.msgRow, m.role === "user" ? styles.msgRowUser : styles.msgRowAi]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === "user" ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAi}>
                  {m.content}
                </Text>
              </View>

              {m.filters && (
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/search",
                      params: m.filters as Record<string, string>,
                    })
                  }
                >
                  <Text style={styles.filterBtnText}>Bu filtreyle ara →</Text>
                </TouchableOpacity>
              )}

              {m.vehicles && m.vehicles.length > 0 && (
                <View style={styles.vehicleList}>
                  <Text style={styles.vehicleLabel}>İlgili ilanlar</Text>
                  {m.vehicles.slice(0, 3).map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={styles.vehicleCard}
                      onPress={() => router.push(`/vehicle/${v.id}`)}
                    >
                      <Text style={styles.vehicleSummary}>{v.summary}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={styles.msgRowAi}>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator size="small" color={colors.flame} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Aracını sor..."
            placeholderTextColor={colors.inkFaint}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            <Send size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
    gap: space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerPin: { marginRight: 0 },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
    marginTop: 1,
  },
  chatContent: { paddingHorizontal: space.xl, paddingVertical: space.lg, paddingBottom: space.xxl },
  empty: { paddingTop: space.sm },
  emptyHero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xl,
    marginBottom: space.xl,
    ...shadow.soft,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  greetingTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: space.sm,
  },
  greeting: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  quickLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: space.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipWrap: { gap: space.sm },
  quickChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.sm,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.flame,
    marginTop: 7,
  },
  quickText: {
    flex: 1,
    fontFamily: fonts.bodyMed,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  msgRow: { marginBottom: space.md },
  msgRowUser: { alignItems: "flex-end" },
  msgRowAi: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  bubbleUser: {
    backgroundColor: colors.flame,
    borderBottomRightRadius: 6,
    ...shadow.soft,
  },
  bubbleAi: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  bubbleTextUser: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextAi: {
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  filterBtn: {
    marginTop: space.sm,
    backgroundColor: colors.flameSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  filterBtnText: {
    fontFamily: fonts.bodySemi,
    color: colors.flameDeep,
    fontSize: 12,
  },
  vehicleList: { marginTop: space.sm, width: "100%" },
  vehicleLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  vehicleCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: 6,
  },
  vehicleSummary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
    gap: space.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
