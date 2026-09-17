import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

export function LoadingOverlay() {
  const loading = useUIStore((s) => s.loading);
  const insets = useSafeAreaInsets();

  const entries = Object.entries(loading);

  if (entries.length === 0) return null;

  return (
    <View style={[styles.host, { bottom: insets.bottom + 80 }]} pointerEvents="none">
      {entries.map(([agent, state]) => (
        <View key={agent} style={styles.toast}>
          <ActivityIndicator size="small" color={colors.flame} />
          <View style={styles.textWrap}>
            <Text style={styles.message}>{state.message ?? `${agent} çalışıyor`}</Text>
            <Text style={styles.agent}>{agent}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: space.lg,
  },
  toast: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.35)",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },
  textWrap: { marginLeft: space.md, flex: 1 },
  message: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
  },
  agent: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.flameMid,
    marginTop: 2,
  },
});
