import { Image, type ImageStyle, type StyleProp, StyleSheet } from "react-native";

const mark = require("../../assets/brand/seyyare-mark.png");

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, number> = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 104,
};

type Props = {
  size?: Size | number;
  style?: StyleProp<ImageStyle>;
};

/** App mark only — S + road pin. No clipping. */
export function BrandMark({ size = "md", style }: Props) {
  const dim = typeof size === "number" ? size : SIZES[size];
  return (
    <Image
      source={mark}
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
