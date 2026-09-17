import { Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUIStore } from "../../lib/ui-store";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.host, { top: insets.top + 8 }]} pointerEvents="none">
      {toasts.map((t) => {
        const level = {
          info: { bg: colors.flameDeep, Icon: Info },
          success: { bg: colors.flame, Icon: CheckCircle },
          warning: { bg: colors.brass, Icon: AlertTriangle },
          error: { bg: colors.danger, Icon: AlertCircle },
        }[t.level];

        const { Icon } = level;

        return (
          <View key={t.id} style={[styles.toast, { backgroundColor: level.bg }]}>
            <Icon size={18} color={colors.white} />
            <Text style={styles.message} numberOfLines={2}>
              {t.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: space.lg,
  },
  toast: {
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },
  message: {
    marginLeft: space.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.white,
    flex: 1,
  },
});
