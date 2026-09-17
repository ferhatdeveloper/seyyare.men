import { useColorScheme } from "react-native";
import { Image, type ImageStyle, type StyleProp, StyleSheet } from "react-native";

const markDark = require("../../assets/brand/seyyare-mark-dark.png");
const markLight = require("../../assets/brand/seyyare-mark-light.png");
const markMonoDark = require("../../assets/brand/seyyare-mark-mono-dark.png");
const markMonoLight = require("../../assets/brand/seyyare-mark-mono-light.png");

type Size = "sm" | "md" | "lg" | "xl";
type Tone = "auto" | "dark" | "light" | "mono-dark" | "mono-light";

const SIZES: Record<Size, number> = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 104,
};

const SOURCES = {
  dark: markDark,
  light: markLight,
  "mono-dark": markMonoDark,
  "mono-light": markMonoLight,
} as const;

type Props = {
  size?: Size | number;
  /** dark = siyah zemin; light = beyaz zemin; mono-* = tek renk */
  tone?: Tone;
  style?: StyleProp<ImageStyle>;
};

/** App mark — S + road pin. Transparent canvas. */
export function BrandMark({ size = "md", tone = "auto", style }: Props) {
  const scheme = useColorScheme();
  const dim = typeof size === "number" ? size : SIZES[size];

  let resolved: keyof typeof SOURCES = "dark";
  if (tone === "auto") {
    // App chrome is mostly dark; light screens pass tone="light"
    resolved = scheme === "light" ? "light" : "dark";
  } else if (tone === "dark" || tone === "light" || tone === "mono-dark" || tone === "mono-light") {
    resolved = tone;
  }

  return (
    <Image
      source={SOURCES[resolved]}
      accessibilityLabel="Seyyare"
      style={[styles.mark, { width: dim, height: dim }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: "transparent",
  },
});
