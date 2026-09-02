// FraudBadge — fraud agent'tan gelen risk değerlendirmesini badge olarak göster
// Yeşil: low risk, Sarı: medium, Kırmızı: high (manual review)

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react-native";
import { Text, View } from "react-native";

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

export function FraudBadge({ riskScore, riskLevel, flags, explanation }: Props) {
  const colors = {
    low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", subtext: "text-green-700", icon: "#10B981", Icon: ShieldCheck },
    medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", subtext: "text-amber-700", icon: "#F59E0B", Icon: Shield },
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", subtext: "text-red-700", icon: "#EF4444", Icon: ShieldAlert },
  }[riskLevel];

  const { Icon } = colors as { Icon: typeof ShieldCheck; bg: string; border: string; text: string; subtext: string };

  const label = {
    low: "Düşük Risk",
    medium: "Manuel İnceleme",
    high: "Yüksek Risk",
  }[riskLevel];

  return (
    <View className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
      <View className="flex-row items-center mb-2">
        <Icon size={20} color={colors.icon} />
        <View className="ml-2 flex-1">
          <Text className={`text-sm font-bold ${colors.text}`}>
            {label}
          </Text>
          <Text className={`text-xs ${colors.subtext}`}>
            Risk skoru: {riskScore}/100
          </Text>
        </View>
      </View>

      {explanation && (
        <Text className={`text-xs ${colors.text} mb-2 leading-4`}>{explanation}</Text>
      )}

      {flags.length > 0 && (
        <View className="border-t border-current/10 pt-2 mt-2">
          {flags.map((f, i) => (
            <View key={i} className="flex-row items-start mb-1">
              <Text
                className={`mr-2 text-xs ${
                  f.severity === "critical"
                    ? "text-red-600"
                    : f.severity === "warning"
                      ? "text-amber-600"
                      : "text-slate-500"
                }`}
              >
                {f.severity === "critical" ? "⚠" : f.severity === "warning" ? "!" : "i"}
              </Text>
              <Text className={`text-xs ${colors.subtext} flex-1 leading-4`}>
                {f.message}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}