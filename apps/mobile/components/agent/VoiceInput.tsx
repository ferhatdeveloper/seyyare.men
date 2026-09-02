// VoiceInput — push-to-talk mikrofon bileşeni
// OpenRouter audio transcription kullanır

import { Audio } from "expo-av";
import { Mic, Square, Loader } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";

import { orchestrator } from "../../lib/clients";

interface Props {
  onTranscript: (text: string, language: string) => void;
  locale: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceInput({ onTranscript, locale, size = "md" }: Props) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recordingObj, setRecordingObj] = useState<Audio.Recording | null>(null);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };
  const iconSizes = { sm: 18, md: 24, lg: 32 };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Mikrofon izni gerekli");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecordingObj(rec);
      setRecording(true);
    } catch (err) {
      console.error("[voice] start failed:", err);
      Alert.alert("Kayıt başlatılamadı");
    }
  };

  const stopAndTranscribe = async () => {
    if (!recordingObj) return;
    setRecording(false);
    setProcessing(true);

    try {
      await recordingObj.stopAndUnloadAsync();
      const uri = recordingObj.getURI();
      setRecordingObj(null);

      if (!uri) {
        Alert.alert("Kayıt alınamadı");
        return;
      }

      // Ses dosyasını base64'e çevir
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Backend'e gönder
      const res = await fetch(`${orchestrator.url}/voice/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: "audio/m4a",
          language: locale,
        }),
      });

      if (!res.ok) {
        Alert.alert("Transkripsiyon başarısız");
        return;
      }

      const data = (await res.json()) as { text: string; language: string };
      onTranscript(data.text, data.language);
    } catch (err) {
      console.error("[voice] stop/transcribe failed:", err);
      Alert.alert("Hata oluştu");
    } finally {
      setProcessing(false);
    }
  };

  const cancel = async () => {
    if (recordingObj) {
      try {
        await recordingObj.stopAndUnloadAsync();
      } catch {}
      setRecordingObj(null);
    }
    setRecording(false);
  };

  if (processing) {
    return (
      <View className={`${sizeClasses[size]} rounded-full bg-slate-200 items-center justify-center`}>
        <ActivityIndicator size={size === "lg" ? "large" : "small"} color="#0EA5E9" />
      </View>
    );
  }

  if (recording) {
    return (
      <View className="flex-row items-center">
        <TouchableOpacity
          className={`${sizeClasses[size]} rounded-full bg-red-500 items-center justify-center`}
          onPress={stopAndTranscribe}
        >
          <Square size={iconSizes[size]} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          className="ml-2 px-3 py-1.5 bg-slate-200 rounded-full"
          onPress={cancel}
        >
          <Text className="text-xs text-slate-700">İptal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      className={`${sizeClasses[size]} rounded-full bg-primary-600 items-center justify-center`}
      style={{ backgroundColor: "#0284C7" }}
      onPress={startRecording}
    >
      <Mic size={iconSizes[size]} color="#FFFFFF" />
    </TouchableOpacity>
  );
}