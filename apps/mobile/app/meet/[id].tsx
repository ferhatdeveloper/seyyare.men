import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radius, space } from "../../lib/theme";

// WebRTC scaffold: orchestrator POST /meet/signal echoes SDP/ICE in an
// in-memory Map keyed by roomId (params.id). Wire RTCPeerConnection later.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function MeetScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const peer =
    (Array.isArray(params.name) ? params.name[0] : params.name) ||
    "Satıcı";
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnecting(false), 1400);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (connecting) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [connecting]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Text style={styles.badge}>{t("meet.inAppBadge")}</Text>
        <Text style={styles.title}>{t("meet.title")}</Text>
        <Text style={styles.peer}>{peer}</Text>
        <Text style={styles.status}>
          {connecting ? t("meet.connecting") : `${pad(mm)}:${pad(ss)}`}
        </Text>

        <Animated.View style={[styles.avatar, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.avatarText}>{peer.charAt(0).toUpperCase()}</Text>
        </Animated.View>

        <Text style={styles.hint}>{t("meet.hint")}</Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrl, muted && styles.ctrlOn]}
            onPress={() => setMuted((m) => !m)}
            activeOpacity={0.85}
          >
            {muted ? (
              <MicOff size={22} color={colors.white} strokeWidth={2} />
            ) : (
              <Mic size={22} color={colors.ink} strokeWidth={2} />
            )}
            <Text style={[styles.ctrlLabel, muted && styles.ctrlLabelOn]}>
              {muted ? t("meet.unmute") : t("meet.mute")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => router.back()}
            activeOpacity={0.9}
          >
            <PhoneOff size={26} color={colors.white} strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctrl} activeOpacity={0.85}>
            <Volume2 size={22} color={colors.ink} strokeWidth={2} />
            <Text style={styles.ctrlLabel}>{t("meet.speaker")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  safe: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
  },
  badge: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.flame,
    backgroundColor: "rgba(255,106,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: space.md,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  peer: {
    marginTop: 6,
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
  },
  status: {
    marginTop: space.md,
    fontFamily: fonts.bodyMed,
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1,
  },
  avatar: {
    marginTop: space.section,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.flame,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 44,
    color: colors.white,
  },
  hint: {
    marginTop: space.xxl,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: space.lg,
  },
  controls: {
    marginTop: "auto",
    marginBottom: space.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xl,
  },
  ctrl: {
    width: 72,
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  ctrlOn: { backgroundColor: colors.flameDeep },
  ctrlLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
  },
  ctrlLabelOn: { color: colors.white },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
});
