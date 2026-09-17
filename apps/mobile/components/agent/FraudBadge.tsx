import { Shield, ShieldCheck, ShieldAlert } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, space } from "../../lib/theme";

interface FraudFlag {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface Props {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  flags: FraudFlag[];
  explanation: string;
}

const LEVEL = {
  low: {
    bg: colors.flameSoft,
    border: "#FFD8B8",
    text: colors.flameDeep,
    sub: colors.flame,
    icon: colors.flame,
    Icon: ShieldCheck,
  },
  medium: {
    bg: colors.brassSoft,
    border: "#FFD8B8",
    text: colors.ink,
    sub: colors.brass,
    icon: colors.brass,
    Icon: Shield,
  },
  high: {
    bg: "#FCECEC",
    border: "#F0CACA",
    text: colors.danger,
    sub: colors.danger,
    icon: colors.danger,
    Icon: ShieldAlert,
  },
} as const;

export function FraudBadge({ riskScore, riskLevel, flags, explanation }: Props) {
  const level = LEVEL[riskLevel];
  const { Icon } = level;

  const label = {
    low: "Düşük Risk",
    medium: "Manuel İnceleme",
    high: "Yüksek Risk",
  }[riskLevel];

  return (
    <View style={[styles.wrap, { backgroundColor: level.bg, borderColor: level.border }]}>
      <View style={styles.header}>
        <Icon size={20} color={level.icon} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: level.text }]}>{label}</Text>
          <Text style={[styles.sub, { color: level.sub }]}>Risk skoru: {riskScore}/100</Text>
        </View>
      </View>

      {explanation ? (
        <Text style={[styles.explanation, { color: level.text }]}>{explanation}</Text>
      ) : null}

      {flags.length > 0 ? (
        <View style={styles.flags}>
          {flags.map((f, i) => (
            <View key={i} style={styles.flagRow}>
              <Text
                style={[
                  styles.flagMark,
                  f.severity === "critical"
                    ? styles.critical
                    : f.severity === "warning"
                      ? styles.warning
                      : styles.info,
                ]}
              >
                {f.severity === "critical" ? "!" : f.severity === "warning" ? "·" : "i"}
              </Text>
              <Text style={[styles.flagText, { color: level.sub }]}>{f.message}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: space.sm },
  headerText: { marginLeft: space.sm, flex: 1 },
  title: { fontFamily: fonts.bodySemi, fontSize: 14 },
  sub: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  explanation: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginBottom: space.sm,
    lineHeight: 16,
  },
  flags: {
    borderTopWidth: 1,
    borderTopColor: "rgba(10,10,10,0.06)",
    paddingTop: space.sm,
    marginTop: space.sm,
  },
  flagRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  flagMark: { marginRight: space.sm, fontFamily: fonts.bodySemi, fontSize: 11 },
  critical: { color: colors.danger },
  warning: { color: colors.brass },
  info: { color: colors.flame },
  flagText: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
});
