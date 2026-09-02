// Agent Inspector — kullanıcı Central Agent'in hangi worker'ları çalıştırdığını görsün
// Plan execution timeline + worker durumları + message bus logu

import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { orchestrator } from "../lib/clients";

interface WorkerStatus {
  name: string;
  status: "active" | "paused" | "disabled";
  capabilities: string[];
  recentCalls: number;
  successRate: number;
  avgCost: number;
  avgDurationMs: number;
}

interface CentralHealth {
  central_agent: string;
  workers: {
    active: number;
    total: number;
    paused: number;
    disabled: number;
  };
  capabilities: string[];
  timestamp: number;
}

interface MessageBusEntry {
  id: string;
  type: string;
  from: string;
  to: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export default function AgentInspector() {
  const { t } = useTranslation();

  const healthQuery = useQuery({
    queryKey: ["central-health"],
    queryFn: () =>
      fetch(`${orchestrator.url}/central/health`).then((r) => r.json() as Promise<CentralHealth>),
    refetchInterval: 5_000,
  });

  const workersQuery = useQuery({
    queryKey: ["central-workers"],
    queryFn: () =>
      fetch(`${orchestrator.url}/central/workers`).then(
        (r) => r.json() as Promise<{ workers: WorkerStatus[] }>,
      ),
    refetchInterval: 10_000,
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Cpu size={20} color="#0EA5E9" />
        <Text className="ml-2 text-lg font-bold text-slate-900">Agent Inspector</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Central Agent Header */}
        <View className="px-5 pt-4 pb-3">
          <View className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-4" style={{ backgroundColor: "#0EA5E9" }}>
            <View className="flex-row items-center">
              <Zap size={24} color="#FFFFFF" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-base">Central Agent</Text>
                <Text className="text-white/85 text-xs mt-0.5">
                  Tüm worker'ları yöneten merkez ajan
                </Text>
              </View>
            </View>
            <View className="flex-row mt-3 pt-3 border-t border-white/20">
              <HeaderStat
                icon={<Activity size={14} color="#FFFFFF" />}
                label="Aktif Worker"
                value={`${healthQuery.data?.workers.active ?? 0}/${healthQuery.data?.workers.total ?? 0}`}
              />
              <HeaderStat
                icon={<Cpu size={14} color="#FFFFFF" />}
                label="Yetenek"
                value={`${healthQuery.data?.capabilities.length ?? 0}`}
              />
            </View>
          </View>
        </View>

        {/* Workers List */}
        <View className="px-5 pb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-900">Worker'lar</Text>
            <Text className="text-xs text-slate-500">Son 24 saat</Text>
          </View>

          {workersQuery.isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#0EA5E9" />
            </View>
          ) : (
            (workersQuery.data?.workers ?? []).map((w) => (
              <WorkerCard key={w.name} worker={w} />
            ))
          )}
        </View>

        {/* Architecture Diagram */}
        <View className="px-5 pb-8">
          <Text className="text-base font-bold text-slate-900 mb-3">Mimari</Text>
          <View className="bg-white border border-slate-200 rounded-2xl p-4">
            <ArchRow icon="🎯" label="Central Agent" sub="intent → plan → dispatch → compose" color="bg-primary-100" />
            <View className="h-3 ml-7 border-l-2 border-dashed border-slate-300" />
            <ArchRow icon="📋" label="Task Planner" sub="DAG + dependency-aware" color="bg-blue-100" />
            <View className="h-3 ml-7 border-l-2 border-dashed border-slate-300" />
            <ArchRow icon="⚡" label="Worker Registry" sub="retry + fallback" color="bg-amber-100" />
            <View className="h-3 ml-7 border-l-2 border-dashed border-slate-300" />
            <ArchRow icon="🚌" label="Agent Message Bus" sub="JSON-RPC" color="bg-green-100" />
            <View className="h-3 ml-7 border-l-2 border-dashed border-slate-300" />
            <ArchRow icon="🧠" label="Central Memory" sub="Redis + DB" color="bg-purple-100" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center">
        {icon}
        <Text className="ml-1.5 text-[10px] text-white/80">{label}</Text>
      </View>
      <Text className="text-white font-bold text-lg mt-0.5">{value}</Text>
    </View>
  );
}

function WorkerCard({ worker }: { worker: WorkerStatus }) {
  const statusColor = {
    active: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
    paused: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    disabled: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500", dot: "bg-slate-400" },
  }[worker.status];

  const successIcon = worker.successRate >= 0.9 ? <CheckCircle2 size={12} color="#10B981" /> :
                       worker.successRate >= 0.7 ? <Clock size={12} color="#F59E0B" /> :
                       <XCircle size={12} color="#EF4444" />;

  return (
    <View className={`${statusColor.bg} border ${statusColor.border} rounded-2xl p-3 mb-2`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className={`w-2 h-2 rounded-full ${statusColor.dot} mr-2`} />
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-slate-900 capitalize">{worker.name}</Text>
              <Text className={`ml-2 text-[10px] font-semibold ${statusColor.text} uppercase`}>
                {worker.status}
              </Text>
            </View>
            <Text className="text-[10px] text-slate-500 mt-0.5">
              {worker.capabilities.slice(0, 3).join(" · ")}
              {worker.capabilities.length > 3 && ` +${worker.capabilities.length - 3}`}
            </Text>
          </View>
        </View>
      </View>

      {worker.recentCalls > 0 && (
        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-current/10">
          <View className="flex-row items-center">
            {successIcon}
            <Text className="text-xs text-slate-700 ml-1.5">
              {worker.recentCalls} çağrı · {Math.round(worker.successRate * 100)}% başarı
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-slate-500">
              ${worker.avgCost.toFixed(4)} · {Math.round(worker.avgDurationMs)}ms
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function ArchRow({
  icon,
  label,
  sub,
  color,
}: {
  icon: string;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className={`w-12 h-12 rounded-xl ${color} items-center justify-center`}>
        <Text className="text-2xl">{icon}</Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-slate-900">{label}</Text>
        <Text className="text-[10px] text-slate-500 mt-0.5">{sub}</Text>
      </View>
    </View>
  );
}