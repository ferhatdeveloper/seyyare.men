// LoadingOverlay — orchestrator'ın aktif agent loading state'lerini gösterir

import { ActivityIndicator, View, Text } from "react-native";
import { useUIStore } from "../../lib/ui-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function LoadingOverlay() {
  const loading = useUIStore((s) => s.loading);
  const insets = useSafeAreaInsets();

  const entries = Object.entries(loading);

  if (entries.length === 0) return null;

  return (
    <View
      className="absolute left-0 right-0 z-40 px-4"
      style={{ bottom: insets.bottom + 80 }}
      pointerEvents="none"
    >
      {entries.map(([agent, state]) => (
        <View
          key={agent}
          className="bg-slate-900/90 rounded-2xl px-4 py-3 mb-2 flex-row items-center"
        >
          <ActivityIndicator size="small" color="#FFFFFF" />
          <View className="ml-3 flex-1">
            <Text className="text-white text-sm font-semibold">
              {state.message ?? `${agent} çalışıyor`}
            </Text>
            <Text className="text-white/70 text-[10px]">
              {agent}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}