import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ChevronLeft, TrendingUp, DollarSign, Activity, Cpu } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orchestrator } from "../lib/clients";

interface AgentMetrics {
  agent: string;
  totalCalls: number;
  totalCost: number;
  avgCost: number;
  avgDuration: number;
  successRate: number;
  avgConfidence: number;
}

interface OrchestratorStats {
  totalThreads: number;
  activeThreads: number;
  totalCost7d: number;
  totalCalls7d: number;
  agents: AgentMetrics[];
  dailyCosts: Array<{ day: string; costUsd: number; calls: number }>;
  costByModel: Array<{ model: string; calls: number; cost: number }>;
  costByIntent: Array<{ intent: string; calls: number; cost: number }>;
}

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      fetch(`${orchestrator.url}/admin/orchestrator/stats`).then((r) => r.json() as Promise<OrchestratorStats>),
    refetchInterval: 30_000,
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Admin Dashboard</Text>
      </View>

      <ScrollView className="flex-1">
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#0EA5E9" />
          </View>
        ) : data ? (
          <>
            {/* Top stats */}
            <View className="px-5 py-4 flex-row gap-3">
              <StatCard
                icon={<Activity size={18} color="#0EA5E9" />}
                label="Aktif Thread"
                value={data.activeThreads}
                bg="bg-blue-50"
                border="border-blue-200"
              />
              <StatCard
                icon={<DollarSign size={18} color="#F59E0B" />}
                label="7 Gün Maliyet"
                value={`$${data.totalCost7d.toFixed(2)}`}
                bg="bg-amber-50"
                border="border-amber-200"
              />
              <StatCard
                icon={<Cpu size={18} color="#10B981" />}
                label="7 Gün Çağrı"
                value={data.totalCalls7d.toLocaleString()}
                bg="bg-green-50"
                border="border-green-200"
              />
            </View>

            {/* Agent metrics */}
            <View className="px-5 pb-5">
              <Text className="text-base font-bold text-slate-900 mb-3">
                Agent Performansı (7 gün)
              </Text>
              {data.agents.length === 0 ? (
                <View className="bg-white border border-slate-200 rounded-2xl p-6 items-center">
                  <Text className="text-slate-400 text-sm">Henüz veri yok</Text>
                </View>
              ) : (
                data.agents.map((a) => (
                  <View
                    key={a.agent}
                    className="bg-white border border-slate-200 rounded-2xl p-4 mb-2"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View>
                        <Text className="text-base font-bold text-slate-900 capitalize">
                          {a.agent}
                        </Text>
                        <Text className="text-xs text-slate-500">
                          {a.totalCalls} çağrı · {a.successRate ? Math.round(a.successRate * 100) : 0}% başarı
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-amber-600">
                        ${a.totalCost.toFixed(3)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Metric label="Ort. maliyet" value={`$${a.avgCost.toFixed(4)}`} />
                      <Metric label="Ort. süre" value={`${Math.round(a.avgDuration)}ms`} />
                      {a.avgConfidence > 0 && (
                        <Metric
                          label="Ort. güven"
                          value={`${Math.round(a.avgConfidence * 100)}%`}
                        />
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Daily cost */}
            {data.dailyCosts.length > 0 && (
              <View className="px-5 pb-5">
                <Text className="text-base font-bold text-slate-900 mb-3">
                  Günlük Maliyet
                </Text>
                <View className="bg-white border border-slate-200 rounded-2xl p-4">
                  <View className="flex-row items-end h-32 gap-1">
                    {data.dailyCosts.map((d, i) => {
                      const maxCost = Math.max(...data.dailyCosts.map((x) => x.costUsd), 0.01);
                      const height = Math.max(8, (d.costUsd / maxCost) * 100);
                      return (
                        <View key={i} className="flex-1 items-center">
                          <View
                            className="w-full bg-amber-500 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                          <Text className="text-[10px] text-slate-500 mt-1">
                            {d.day.slice(5)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Cost by intent */}
            {data.costByIntent.length > 0 && (
              <View className="px-5 pb-5">
                <Text className="text-base font-bold text-slate-900 mb-3">
                  Intent Bazlı Maliyet
                </Text>
                <View className="bg-white border border-slate-200 rounded-2xl p-4">
                  {data.costByIntent.slice(0, 10).map((i) => (
                    <View
                      key={i.intent}
                      className="flex-row items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <Text className="text-sm text-slate-700">{i.intent}</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-slate-500">{i.calls}×</Text>
                        <Text className="text-sm font-semibold text-amber-700">
                          ${i.cost.toFixed(3)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Cost by model */}
            {data.costByModel.length > 0 && (
              <View className="px-5 pb-8">
                <Text className="text-base font-bold text-slate-900 mb-3">
                  Model Bazlı Maliyet
                </Text>
                <View className="bg-white border border-slate-200 rounded-2xl p-4">
                  {data.costByModel.slice(0, 10).map((m) => (
                    <View
                      key={m.model}
                      className="flex-row items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <Text className="text-xs text-slate-700 font-mono" numberOfLines={1}>
                        {m.model}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-slate-500">{m.calls}×</Text>
                        <Text className="text-sm font-semibold text-amber-700">
                          ${m.cost.toFixed(3)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View className="py-12 items-center">
            <Text className="text-slate-400">Veri yüklenemedi</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
  border: string;
}) {
  return (
    <View className={`flex-1 ${bg} border ${border} rounded-2xl p-3`}>
      <View className="mb-2">{icon}</View>
      <Text className="text-base font-bold text-slate-900">{value}</Text>
      <Text className="text-[10px] text-slate-600 mt-0.5">{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] text-slate-500">{label}</Text>
      <Text className="text-xs font-semibold text-slate-900">{value}</Text>
    </View>
  );
}