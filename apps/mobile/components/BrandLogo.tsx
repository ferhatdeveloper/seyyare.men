import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { brandLogoCandidates } from "../lib/brand-logos";
import { colors, fonts } from "../lib/theme";

type Props = {
  name: string;
  /** English name for CDN slug (localized labels break Latin paths) */
  nameEn?: string | null;
  logoUrl?: string | null;
  size?: number;
  style?: ViewStyle;
};

/** Marka logosu — CDN zinciri; hepsi başarısızsa baş harf */
export function BrandLogo({ name, nameEn, logoUrl, size = 40, style }: Props) {
  const candidates = brandLogoCandidates(name, logoUrl, nameEn);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [name, nameEn, logoUrl]);

  const uri = candidates[idx];
  const initial = (name || "?").charAt(0).toUpperCase();

  if (!uri) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size * 0.28 },
          style,
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}
    >
      <Image
        key={uri}
        source={{ uri }}
        style={{ width: size * 0.78, height: size * 0.78 }}
        resizeMode="contain"
        onError={() => setIdx((i) => i + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: fonts.display,
    color: colors.flameDeep,
  },
});
