import { router } from "expo-router";
import { ChevronLeft, Loader, Volume2 } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createAudioPlayer } from "expo-audio";

import { BrandMark } from "../components/brand";
import { VoiceInput } from "../components/agent/VoiceInput";
import { Screen } from "../components/ui/Screen";
import { runAgent } from "../lib/agent-client";
import { orchestrator } from "../lib/clients";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string;
  audioUrl?: string;
}

export default function VoiceScreen() {
  const { t: _t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleTranscript = async (text: string, language: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      language,
    };
    setMessages((m) => [...m, userMsg]);
    setProcessing(true);

    try {
      const handle = runAgent({
        text,
        locale: language.startsWith("ku") ? (language as "ku-bad" | "ku-sor") : "tr",
      });
      await handle.promise;

      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: "Anlaşıldı, ilgili aramalar başlatılıyor...",
        language,
      };
      setMessages((m) => [...m, aiMsg]);

      if (text.trim()) {
        router.push({ pathname: "/(tabs)/search", params: { q: text.trim() } });
      }

      try {
        const ttsRes = await fetch(`${orchestrator.url}/voice/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: aiMsg.content,
            voice: "alloy",
            format: "mp3",
          }),
        });
        if (ttsRes.ok) {
          const data = (await ttsRes.json()) as { audioBase64: string; mimeType: string };
          await playAudio(data.audioBase64, data.mimeType);
        }
      } catch (err) {
        console.warn("[voice] TTS failed:", err);
      }
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setProcessing(false);
    }
  };

  const playAudio = async (base64: string, mimeType: string) => {
    try {
      const player = createAudioPlayer({ uri: `data:${mimeType};base64,${base64}` });
      player.play();
      setTimeout(() => player.release(), 30000);
    } catch (err) {
      console.warn("[voice] audio playback failed:", err);
    }
  };

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <BrandMark size="sm" style={styles.headerPin} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Sesli Asistan</Text>
          <Text style={styles.headerSub}>seyyare.men</Text>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.chat}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Volume2 size={28} color={colors.flame} />
              </View>
              <Text style={styles.emptyTitle}>Mikrofona bas ve konuş</Text>
              <Text style={styles.emptySub}>
                "BMW 320i 2020 model İstanbul'da ne kadar?" gibi sorular sorabilirsin. Tüm dillerde çalışır.
              </Text>
            </View>
          </View>
        ) : null}

        {messages.map((m) => (
          <View key={m.id} style={[styles.msgRow, m.role === "user" ? styles.msgRowUser : styles.msgRowAi]}>
            <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={m.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAi}>{m.content}</Text>
              {m.audioUrl ? (
                <Text style={styles.audioNote}>Audio response oynatıldı</Text>
              ) : null}
            </View>
          </View>
        ))}

        {processing ? (
          <View style={styles.msgRowAi}>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingRow]}>
              <Loader size={16} color={colors.flame} />
              <Text style={styles.typingText}>AI düşünüyor...</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <VoiceInput onTranscript={handleTranscript} locale="tr" size="lg" />
        <Text style={[styles.footerHint, processing && styles.footerHintActive]}>
          {processing ? "AI yanıt veriyor..." : "Konuşmak için dokun"}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  headerPin: {},
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
  chat: { paddingHorizontal: space.lg, paddingVertical: space.lg },
  empty: { alignItems: "center", paddingVertical: space.xl },
  emptyCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xxl,
    alignItems: "center",
    ...shadow.soft,
  },
  emptyIcon: {
    backgroundColor: colors.flameSoft,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    marginBottom: space.sm,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 20,
  },
  msgRow: { marginBottom: space.md },
  msgRowUser: { alignItems: "flex-end" },
  msgRowAi: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "85%",
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
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
  },
  bubbleTextAi: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  audioNote: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    fontStyle: "italic",
  },
  typingRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  typingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
  },
  footer: {
    alignItems: "center",
    paddingVertical: space.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  footerHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: space.md,
  },
  footerHintActive: {
    color: colors.flame,
    fontFamily: fonts.bodySemi,
  },
});
