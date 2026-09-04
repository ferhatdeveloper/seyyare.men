import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Send, ChevronLeft } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../lib/api";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  media_url?: string;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.get(`/messages?conversation_id=eq.${id}&order=created_at.asc`),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      api.post("/messages", { conversation_id: id, body }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["messages", id] });
    },
    onError: () => Alert.alert(t("errors.serverError")),
  });

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3 border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Sohbet</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 py-3"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading ? (
            <ActivityIndicator color="#0EA5E9" className="mt-8" />
          ) : messages && messages.length > 0 ? (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const isFirst = !prev || prev.sender_id !== m.sender_id;
              const isMine = m.sender_id === "me"; // TODO: gerçek user_id
              return (
                <View
                  key={m.id}
                  className={`mb-2 ${isMine ? "items-end" : "items-start"} ${
                    isFirst ? "mt-3" : "mt-0.5"
                  }`}
                >
                  <View
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      isMine ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    style={isMine ? { backgroundColor: "#0284C7" } : {}}
                  >
                    <Text className={`text-sm ${isMine ? "text-white" : "text-slate-900"}`}>
                      {m.body}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-slate-400 mt-0.5 px-1">
                    {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            })
          ) : (
            <View className="items-center mt-16 px-8">
              <Text className="text-slate-400 text-sm text-center">
                Henüz mesaj yok. İlk mesajı göndererek iletişime geçin.
              </Text>
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-3 border-t border-slate-200 flex-row items-center">
          <TextInput
            className="flex-1 bg-slate-100 rounded-full px-4 py-3 text-sm text-slate-900"
            placeholder="Mesaj yazın..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            className="ml-2 bg-primary-600 rounded-full w-11 h-11 items-center justify-center"
            style={{ backgroundColor: "#0284C7", opacity: text.trim() ? 1 : 0.4 }}
            onPress={send}
            disabled={!text.trim() || sendMutation.isPending}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}