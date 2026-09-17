import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { colors, fonts, radius } from "../../lib/theme";

type Variant = "primary" | "ink" | "soft" | "danger" | "ghost";

interface Props extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<
  Variant,
  { btn: ViewStyle; text: TextStyle; spinner: string }
> = {
  primary: {
    btn: { backgroundColor: colors.viridian },
    text: { color: colors.white },
    spinner: colors.white,
  },
  ink: {
    btn: { backgroundColor: colors.ink },
    text: { color: colors.white },
    spinner: colors.white,
  },
  soft: {
    btn: { backgroundColor: colors.viridianSoft, borderWidth: 1, borderColor: "#FFD8B8" },
    text: { color: colors.viridianDeep },
    spinner: colors.viridian,
  },
  danger: {
    btn: { backgroundColor: "#FCECEC", borderWidth: 1, borderColor: "#F0CACA" },
    text: { color: colors.danger },
    spinner: colors.danger,
  },
  ghost: {
    btn: { backgroundColor: "transparent" },
    text: { color: colors.viridian },
    spinner: colors.viridian,
  },
};

export function Button({
  label,
  loading,
  variant = "ink",
  disabled,
  style,
  textStyle,
  ...rest
}: Props) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        v.btn,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text style={[styles.label, v.text, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
