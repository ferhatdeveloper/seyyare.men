// VoiceInput — push-to-talk mikrofon bileşeni
// SDK 54 notu: expo-audio 1.x sadece playback sağlıyor.
// Recording SDK 54 ile çalışmıyor — geçici olarak disabled UI.

import { Mic } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Alert, Text, TouchableOpacity, View } from "react-native";

interface Props {
  onTranscript: (text: string, language: string) => void;
  locale: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceInput({ onTranscript: _onTranscript, locale: _locale, size = "md" }: Props) {
  const { t: _t } = useTranslation();
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };
  const iconSizes = { sm: 18, md: 24, lg: 32 };

  return (
    <View>
      <TouchableOpacity
        className={`${sizeClasses[size]} rounded-full bg-slate-300 items-center justify-center opacity-50`}
        disabled
        onPress={() => Alert.alert("Ses girişi", "SDK 54 ile recording desteği sonraki sürümde eklenecek.")}
      >
        <Mic size={iconSizes[size]} color="#94A3B8" />
      </TouchableOpacity>
      {size === "lg" && (
        <Text className="text-xs text-slate-400 text-center mt-2">
          (Ses girişi yakında)
        </Text>
      )}
    </View>
  );
}