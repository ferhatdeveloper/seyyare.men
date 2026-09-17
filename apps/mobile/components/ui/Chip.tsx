import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

import { colors, fonts, radius } from "../../lib/theme";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, icon, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: {
    backgroundColor: colors.flameSoft,
    borderColor: colors.flame,
  },
  pressed: { opacity: 0.88 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  labelSelected: { color: colors.flameDeep },
});
