import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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

import { Screen, ScreenHeader } from "../../components/ui/Screen";
import { api } from "../../lib/api";
import { getDemoMessages } from "../../lib/demo-data";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

const BORDER_FLAME = "#FFD8B8";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  media_url?: string;
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const id = String(Array.isArray(params.id) ? params.id[0] : params.id ?? "");
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const isDemoChat = id.startsWith("demo");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () =>
      api.get<Message[]>(`/messages?conversation_id=eq.${id}&order=created_at.asc`),
    refetchInterval: isDemoChat ? false : 5000,
    enabled: !!id,
  });

  useEffect(() => {
    if (isLoading) return;
    const remote = Array.isArray(messages) ? messages : [];
    if (remote.length > 0) {
      setLocalMessages(remote);
      return;
    }
    if (isDemoChat) {
      setLocalMessages(getDemoMessages(id) as Message[]);
    } else {
      setLocalMessages([]);
    }
  }, [messages, isLoading, isDemoChat, id]);

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (isDemoChat) {
        const next: Message = {
          id: `demo-local-${Date.now()}`,
          sender_id: "me",
          body,
          created_at: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, next]);
        return next;
      }
      return api.post("/messages", { conversation_id: id, body });
    },
    onSuccess: () => {
      setText("");
      if (!isDemoChat) void qc.invalidateQueries({ queryKey: ["messages", id] });
    },
    onError: () => Alert.alert(t("errors.serverError")),
  });

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [localMessages]);

  const send = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  const canSend = text.trim().length > 0 && !sendMutation.isPending;
  const displayMessages = localMessages;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Sohbet" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.flame} style={styles.loader} />
          ) : displayMessages.length > 0 ? (
            displayMessages.map((m: Message, i: number) => {
              const prev = displayMessages[i - 1];
              const isFirst = !prev || prev.sender_id !== m.sender_id;
              const isMine = m.sender_id === "me";
              return (
                <View
                  key={m.id}
                  style={[
                    styles.msgRow,
                    isMine ? styles.msgRowUser : styles.msgRowOther,
                    isFirst ? styles.msgGap : styles.msgTight,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isMine ? styles.bubbleMine : styles.bubbleOther,
                      isMine ? styles.bubbleMineTail : styles.bubbleOtherTail,
                    ]}
                  >
                    <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextOther}>{m.body}</Text>
                  </View>
                  <Text style={styles.time}>
                    {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Henüz mesaj yok. İlk mesajı göndererek iletişime geçin.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.inkFaint}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Send size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatContent: { paddingHorizontal: space.lg, paddingVertical: space.md },
  loader: { marginTop: space.section },
  msgRow: { marginBottom: space.sm },
  msgRowUser: { alignItems: "flex-end" },
  msgRowOther: { alignItems: "flex-start" },
  msgGap: { marginTop: space.md },
  msgTight: { marginTop: 2 },
  bubble: {
    maxWidth: "80%",
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: space.sm,
  },
  bubbleMine: {
    backgroundColor: colors.flame,
    ...shadow.soft,
  },
  bubbleOther: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
  },
  bubbleMineTail: { borderBottomRightRadius: radius.sm },
  bubbleOtherTail: { borderBottomLeftRadius: radius.sm },
  bubbleTextMine: { fontFamily: fonts.body, fontSize: 14, color: colors.white, lineHeight: 20 },
  bubbleTextOther: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
  time: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  empty: { alignItems: "center", marginTop: space.section * 2, paddingHorizontal: space.xxl },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 20,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: BORDER_FLAME,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: space.sm,
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.float,
  },
  sendBtnDisabled: {
    backgroundColor: colors.flameMid,
    opacity: 0.45,
  },
});
