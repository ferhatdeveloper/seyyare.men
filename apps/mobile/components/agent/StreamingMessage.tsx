// StreamingMessage — orchestrator'dan gelen token stream'i smooth animation ile göster
// Her yeni chunk UI'da typewriter effect yaratır

import { Loader } from "lucide-react-native";
import { useUIStore } from "../../lib/ui-store";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

interface Props {
  messageId?: string; // specific message, yoksa en sonuncusunu gösterir
  maxHeight?: number;
}

export function StreamingMessage({ messageId, maxHeight = 400 }: Props) {
  const messages = useUIStore((s) => s.streamMessages);

  if (Object.keys(messages).length === 0) return null;

  const targetMessage = messageId
    ? messages[messageId]
    : Object.values(messages).sort((a, b) => b.startedAt - a.startedAt)[0];

  if (!targetMessage) return null;

  return (
    <View
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-2"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <View className="flex-row items-center mb-2">
        <View className="w-2 h-2 rounded-full bg-primary-500 mr-2" />
        <Text className="text-xs font-semibold text-slate-600">
          AI Asistan
        </Text>
        {targetMessage.isStreaming && (
          <View className="ml-2 flex-row items-center">
            <ActivityIndicator size="small" color="#0EA5E9" />
            <Text className="text-xs text-primary-600 ml-1.5">yazıyor...</Text>
          </View>
        )}
      </View>

      <ScrollView className="max-h-80">
        <Text className="text-sm text-slate-900 leading-6">
          {targetMessage.content}
          {targetMessage.isStreaming && (
            <Text className="text-primary-500 animate-pulse">▊</Text>
          )}
        </Text>
      </ScrollView>

      {targetMessage.tokens !== undefined && !targetMessage.isStreaming && (
        <View className="mt-2 pt-2 border-t border-slate-200 flex-row items-center justify-between">
          <Text className="text-[10px] text-slate-500">
            {targetMessage.tokens} token
          </Text>
          <Text className="text-[10px] text-slate-500">
            {targetMessage.role}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Compact streaming indicator — sadece typing dots
 */
export function StreamingIndicator() {
  const messages = useUIStore((s) => s.streamMessages);
  const streaming = Object.values(messages).some((m) => m.isStreaming);

  if (!streaming) return null;

  return (
    <View className="flex-row items-center bg-slate-100 rounded-full px-3 py-1.5 self-start">
      <View className="flex-row items-center">
        <View className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-1 animate-pulse" />
        <View className="w-1.5 h-1.5 rounded-full bg-primary-500 mr-1 animate-pulse" style={{ animationDelay: 150 }} />
        <View className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: 300 }} />
      </View>
      <Text className="ml-2 text-xs text-slate-600">AI yazıyor...</Text>
    </View>
  );
}