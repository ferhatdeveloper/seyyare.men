// ToastHost — aktif toasts'ları ekranın üstünde gösterir

import { Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react-native";
import { useUIStore } from "../../lib/ui-store";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 z-50 px-4"
      style={{ top: insets.top + 8 }}
      pointerEvents="none"
    >
      {toasts.map((t) => {
        const styles = {
          info: { bg: "bg-blue-600", Icon: Info },
          success: { bg: "bg-green-600", Icon: CheckCircle },
          warning: { bg: "bg-amber-600", Icon: AlertTriangle },
          error: { bg: "bg-red-600", Icon: AlertCircle },
        }[t.level];

        const { Icon } = styles;

        return (
          <View
            key={t.id}
            className={`${styles.bg} rounded-2xl px-4 py-3 mb-2 flex-row items-center shadow-lg`}
          >
            <Icon size={18} color="#FFFFFF" />
            <Text className="ml-3 text-white text-sm flex-1" numberOfLines={2}>
              {t.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}