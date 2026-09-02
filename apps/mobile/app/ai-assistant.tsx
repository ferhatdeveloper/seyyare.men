import { router } from "expo-router";
import { Send } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../lib/api";

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
      const res = await api.fetch(`${process.env.EXPO_PUBLIC_AI_URL}/ai/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          locale: i18n.language,
        }),
      }).then((r) => r.json());

      const aiMsg: Message = {
        role: "assistant",
        content: res.reply ?? "Üzgünüm, bir hata oluştu.",
        filters: res.suggestedFilters,
        vehicles: res.matchedVehicles,
      };
      setMessages((m) => [...m, aiMsg]);
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
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View className="px-5 py-4 border-b border-slate-200 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-primary-600">‹</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">{t("home.aiAssistant")}</Text>
        </View>

        <ScrollView className="flex-1 px-5 py-4">
          {messages.length === 0 && (
            <View>
              <Text className="text-slate-600 mb-4">
                Merhaba! Sana nasıl bir araç aramanda yardımcı olabilirim?
              </Text>
              <View>
                <Text className="text-xs font-semibold text-slate-500 mb-2">Hızlı Sorular:</Text>
                {QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    className="bg-slate-100 rounded-xl p-3 mb-2"
                    onPress={() => sendMessage(p)}
                  >
                    <Text className="text-sm text-slate-700">{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              className={`mb-3 ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <View
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "user" ? "bg-primary-600" : "bg-slate-100"
                }`}
                style={m.role === "user" ? { backgroundColor: "#0284C7" } : {}}
              >
                <Text
                  className={`text-sm leading-5 ${
                    m.role === "user" ? "text-white" : "text-slate-900"
                  }`}
                >
                  {m.content}
                </Text>
              </View>

              {m.filters && (
                <TouchableOpacity
                  className="mt-2 bg-primary-50 rounded-xl px-3 py-2 flex-row items-center"
                  onPress={() =>
                    router.push({ pathname: "/(tabs)/search", params: m.filters as Record<string, string> })
                  }
                >
                  <Text className="text-primary-700 text-xs font-semibold">
                    Bu filtreyle ara →
                  </Text>
                </TouchableOpacity>
              )}

              {m.vehicles && m.vehicles.length > 0 && (
                <View className="mt-2 w-full">
                  <Text className="text-xs text-slate-500 mb-1">İlgili ilanlar:</Text>
                  {m.vehicles.slice(0, 3).map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 mb-1.5"
                      onPress={() => router.push(`/vehicle/${v.id}`)}
                    >
                      <Text className="text-sm text-slate-700">{v.summary}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View className="items-start mb-3">
              <View className="bg-slate-100 rounded-2xl px-4 py-3">
                <ActivityIndicator size="small" color="#64748B" />
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-3 border-t border-slate-200 flex-row items-center">
          <TextInput
            className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm text-slate-900"
            placeholder="Aracını sor..."
            value={input}
            onChangeText={setInput}
            multiline
            editable={!loading}
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            className="ml-2 bg-primary-600 rounded-full w-11 h-11 items-center justify-center"
            style={{ backgroundColor: "#0284C7" }}
            onPress={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}