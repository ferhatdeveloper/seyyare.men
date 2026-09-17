import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, fonts, radius } from "../../lib/theme";

type Tone = "viridian" | "ink" | "brass" | "mist" | "danger";

const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  viridian: { bg: colors.viridianSoft, fg: colors.viridianDeep, border: "#FFD8B8" },
  ink: { bg: colors.ink, fg: colors.white, border: colors.ink },
  brass: { bg: colors.brassSoft, fg: colors.brass, border: "#F0DCC4" },
  mist: { bg: colors.mist, fg: colors.inkMuted, border: colors.line },
  danger: { bg: "#FCECEC", fg: colors.danger, border: "#F0CACA" },
};

interface Props {
  label: string;
  tone?: Tone;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, tone = "mist", icon, style }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
