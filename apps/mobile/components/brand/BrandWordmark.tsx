import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { colors, fonts } from "../../lib/theme";

export type BrandScript = "latin" | "arabic" | "kurdish";

const NAMES: Record<BrandScript, string> = {
  latin: "seyyare",
  arabic: "سيّارة",
  kurdish: "سیارە",
};

type Props = {
  /** Default UI is always Latin. Splash may cycle scripts. */
  script?: BrandScript;
  size?: number;
  tone?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
  nameStyle?: StyleProp<TextStyle>;
  menStyle?: StyleProp<TextStyle>;
};

export function BrandWordmark({
  script = "latin",
  size = 32,
  tone = "light",
  style,
  nameStyle,
  menStyle,
}: Props) {
  const nameColor = tone === "light" ? colors.white : colors.ink;
  const isRtlScript = script === "arabic" || script === "kurdish";

  return (
    <View
      style={[styles.row, isRtlScript && styles.rowRtl, style]}
      accessibilityRole="text"
      accessibilityLabel={`seyyare.men (${script})`}
    >
      <Text
        style={[
          styles.name,
          {
            fontSize: size,
            color: nameColor,
            lineHeight: size * 1.15,
          },
          script !== "latin" && styles.nameRtl,
          nameStyle,
        ]}
      >
        {NAMES[script]}
      </Text>
      <Text
        style={[
          styles.men,
          {
            fontSize: size,
            lineHeight: size * 1.15,
          },
          menStyle,
        ]}
      >
        .men
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 1,
    maxWidth: "100%",
  },
  rowRtl: {
    // Keep visual order: name then .men (LTR layout for mixed script)
    flexDirection: "row",
  },
  name: {
    fontFamily: fonts.display,
    letterSpacing: -1,
    flexShrink: 1,
  },
  nameRtl: {
    letterSpacing: 0,
    writingDirection: "rtl",
  },
  men: {
    fontFamily: fonts.display,
    color: colors.flame,
    letterSpacing: -1,
  },
});
