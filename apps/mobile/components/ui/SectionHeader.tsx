import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, fonts, space } from "../../lib/theme";

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  padded?: boolean;
}

export function SectionHeader({ title, actionLabel, onAction, padded = true }: Props) {
  return (
    <View style={[styles.row, padded && styles.padded]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  padded: { paddingHorizontal: space.xl },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.35,
  },
  action: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.viridian,
  },
});
