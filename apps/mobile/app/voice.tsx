import { router } from "expo-router";
import { ChevronLeft, Loader, Volume2 } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-audio";
import { SafeAreaView } from "react-native-safe-area-context";

import { VoiceInput } from "../components/agent/VoiceInput";
import { runAgent } from "../lib/agent-client";
import { orchestrator } from "../lib/clients";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string;
  audioUrl?: string;
}

export default function VoiceScreen() {
  const { t } = useTranslation();
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
      // AI agent'a gönder
      const handle = runAgent({
        text,
        locale: language.startsWith("ku") ? (language as "ku-bad" | "ku-sor") : "tr",
      });
      await handle.promise;

      // UI store'dan AI asistan reply card'ını bul
      // (production'da event stream ile mesajlar gelir)
      // Şimdilik placeholder yanıt
      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: "Anlaşıldı, ilgili aramalar başlatılıyor...",
        language,
      };
      setMessages((m) => [...m, aiMsg]);

      // Speech response üret (TTS)
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
          // Base64'i çal
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
      // Base64 → Blob → File URI (expo-audio)
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // expo-audio v1.x: createAudioPlayer + play
      const player = await Audio.createAudioPlayer(url);
      player.play();
      // Player otomatik temizlenmez — release sonrası
      setTimeout(() => player.release(), 30000);
    } catch (err) {
      console.warn("[voice] audio playback failed:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3 border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Volume2 size={20} color="#0EA5E9" />
        <Text className="ml-2 text-lg font-bold text-slate-900">Sesli Asistan</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {messages.length === 0 && (
          <View className="items-center py-12">
            <View className="bg-primary-50 rounded-full p-6 mb-4">
              <Volume2 size={48} color="#0EA5E9" />
            </View>
            <Text className="text-slate-900 font-bold text-lg mb-2">
              Mikrofona bas ve konuş
            </Text>
            <Text className="text-slate-500 text-sm text-center px-8 leading-5">
              "BMW 320i 2020 model İstanbul'da ne kadar?" gibi sorular sorabilirsin. Tüm dillerde çalışır.
            </Text>
          </View>
        )}

        {messages.map((m) => (
          <View
            key={m.id}
            className={`mb-3 ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <View
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user" ? "bg-primary-600" : "bg-slate-100"
              }`}
              style={m.role === "user" ? { backgroundColor: "#0284C7" } : {}}
            >
              <Text className={`text-sm leading-5 ${m.role === "user" ? "text-white" : "text-slate-900"}`}>
                {m.content}
              </Text>
              {m.audioUrl && (
                <Text className="text-[10px] text-slate-500 mt-1 italic">
                  Audio response oynatıldı
                </Text>
              )}
            </View>
          </View>
        ))}

        {processing && (
          <View className="items-start mb-3">
            <View className="bg-slate-100 rounded-2xl px-4 py-3 flex-row items-center">
              <Loader size={16} color="#64748B" className="mr-2" />
              <Text className="text-sm text-slate-700">AI düşünüyor...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="items-center py-6 border-t border-slate-200">
        <VoiceInput onTranscript={handleTranscript} locale="tr" size="lg" />
        <Text className="text-xs text-slate-500 mt-3">
          {processing ? "AI yanıt veriyor..." : "Konuşmak için dokun"}
        </Text>
      </View>
    </SafeAreaView>
  );
}