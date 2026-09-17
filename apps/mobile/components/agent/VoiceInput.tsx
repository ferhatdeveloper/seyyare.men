import { router } from "expo-router";
import { Mic } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, fonts, radius, space } from "../../lib/theme";

interface Props {
  onTranscript: (text: string, language: string) => void;
  locale: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceInput({ onTranscript: _onTranscript, locale: _locale, size = "md" }: Props) {
  const { t: _t } = useTranslation();
  const sizes = { sm: 40, md: 56, lg: 80 };
  const iconSizes = { sm: 18, md: 24, lg: 32 };
  const dim = sizes[size];

  return (
    <View>
      <TouchableOpacity
        style={[styles.btn, { width: dim, height: dim, borderRadius: radius.md }]}
        activeOpacity={0.85}
        onPress={() => router.push("/voice")}
        accessibilityRole="button"
        accessibilityLabel="Sesli asistan"
      >
        <Mic size={iconSizes[size]} color={colors.flame} />
      </TouchableOpacity>
      {size === "lg" ? (
        <Text style={styles.hint}>Sesli asistanı aç</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: "#FFD8B8",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: space.sm,
  },
});
