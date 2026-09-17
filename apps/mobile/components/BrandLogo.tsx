import { useState } from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { brandLogoUrl } from "../lib/brand-logos";
import { colors, fonts } from "../lib/theme";

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: number;
  style?: ViewStyle;
};

/** Marka logosu — yüklenemezse baş harf fallback */
export function BrandLogo({ name, logoUrl, size = 40, style }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = logoUrl || brandLogoUrl(name);
  const initial = (name || "?").charAt(0).toUpperCase();

  if (failed || !uri) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
        <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <Image
        source={{ uri }}
        style={{ width: size * 0.72, height: size * 0.72 }}
        resizeMode="contain"
        onError={() => setFailed(true)}
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
