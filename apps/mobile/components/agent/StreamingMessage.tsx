import { Loader } from "lucide-react-native";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

interface Props {
  messageId?: string;
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
    <View style={[styles.wrap, maxHeight ? { maxHeight } : undefined]}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.headerLabel}>AI Asistan</Text>
        {targetMessage.isStreaming ? (
          <View style={styles.streamingRow}>
            <ActivityIndicator size="small" color={colors.flame} />
            <Text style={styles.streamingText}>yazıyor...</Text>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.scroll}>
        <Text style={styles.content}>
          {targetMessage.content}
          {targetMessage.isStreaming ? <Text style={styles.cursor}>▊</Text> : null}
        </Text>
      </ScrollView>

      {targetMessage.tokens !== undefined && !targetMessage.isStreaming ? (
        <View style={styles.footer}>
          <Text style={styles.footerMeta}>{targetMessage.tokens} token</Text>
          <Text style={styles.footerMeta}>{targetMessage.role}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StreamingIndicator() {
  const messages = useUIStore((s) => s.streamMessages);
  const streaming = Object.values(messages).some((m) => m.isStreaming);

  if (!streaming) return null;

  return (
    <View style={styles.indicator}>
      <Loader size={14} color={colors.flame} />
      <Text style={styles.indicatorText}>AI yazıyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    borderRadius: radius.lg,
    padding: space.lg,
    marginVertical: space.sm,
    ...shadow.soft,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.flame,
    marginRight: space.sm,
  },
  headerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkMuted,
    flex: 1,
  },
  streamingRow: { flexDirection: "row", alignItems: "center" },
  streamingText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flame,
    marginLeft: 6,
  },
  scroll: { maxHeight: 320 },
  content: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
  },
  cursor: { color: colors.flame },
  footer: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: "#FFD8B8",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerMeta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.flameSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFD8B8",
  },
  indicatorText: {
    marginLeft: space.sm,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.flameDeep,
  },
});
