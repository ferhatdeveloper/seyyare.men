import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  colors: readonly string[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
};

function pickFill(colors: readonly string[]) {
  const first = colors[0] ?? "transparent";
  const last = colors[colors.length - 1] ?? first;
  if (
    /transparent/i.test(first) ||
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)/i.test(first)
  ) {
    return last;
  }
  return first;
}

/**
 * Expo Go-safe gradient stand-in.
 * Avoids ViewManagerAdapter_ExpoLinearGradient crashes when the native
 * module is missing/mismatched.
 */
export function SoftGradient({ colors, style, children, pointerEvents }: Props) {
  const fill = pickFill(colors);
  return (
    <View
      style={[styles.base, { backgroundColor: fill }, style]}
      pointerEvents={pointerEvents ?? (children ? "box-none" : "none")}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
