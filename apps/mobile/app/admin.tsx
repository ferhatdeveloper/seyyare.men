import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { DollarSign, Activity, Cpu } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen, ScreenHeader } from "../components/ui/Screen";
import { orchestrator } from "../lib/clients";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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
  const { t: _t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      fetch(`${orchestrator.url}/admin/orchestrator/stats`).then((r) => r.json() as Promise<OrchestratorStats>),
    refetchInterval: 30_000,
  });

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Yönetim Paneli" onBack={() => router.back()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.flame} />
          </View>
        ) : data ? (
          <>
            <View style={styles.statRow}>
              <StatCard
                icon={<Activity size={18} color={colors.flame} />}
                label="Aktif Thread"
                value={data.activeThreads}
                tint={colors.flameSoft}
              />
              <StatCard
                icon={<DollarSign size={18} color={colors.flameDeep} />}
                label="7 Gün Maliyet"
                value={`$${data.totalCost7d.toFixed(2)}`}
                tint={colors.brassSoft}
              />
              <StatCard
                icon={<Cpu size={18} color={colors.inkMuted} />}
                label="7 Gün Çağrı"
                value={data.totalCalls7d.toLocaleString()}
                tint={colors.mist}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ajan Performansı (7 gün)</Text>
              {data.agents.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.muted}>Henüz veri yok</Text>
                </View>
              ) : (
                data.agents.map((a) => (
                  <View key={a.agent} style={styles.agentCard}>
                    <View style={styles.agentHeader}>
                      <View>
                        <Text style={styles.agentName}>{a.agent}</Text>
                        <Text style={styles.agentMeta}>
                          {a.totalCalls} çağrı · {a.successRate ? Math.round(a.successRate * 100) : 0}% başarı
                        </Text>
                      </View>
                      <Text style={styles.agentCost}>${a.totalCost.toFixed(3)}</Text>
                    </View>
                    <View style={styles.metricsRow}>
                      <Metric label="Ort. maliyet" value={`$${a.avgCost.toFixed(4)}`} />
                      <Metric label="Ort. süre" value={`${Math.round(a.avgDuration)}ms`} />
                      {a.avgConfidence > 0 ? (
                        <Metric label="Ort. güven" value={`${Math.round(a.avgConfidence * 100)}%`} />
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            {data.dailyCosts.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Günlük Maliyet</Text>
                <View style={styles.chartCard}>
                  <View style={styles.chart}>
                    {data.dailyCosts.map((d, i) => {
                      const maxCost = Math.max(...data.dailyCosts.map((x) => x.costUsd), 0.01);
                      const height = Math.max(8, (d.costUsd / maxCost) * 100);
                      return (
                        <View key={i} style={styles.barCol}>
                          <View style={[styles.bar, { height: `${height}%` as `${number}%` }]} />
                          <Text style={styles.barLabel}>{d.day.slice(5)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}

            {data.costByIntent.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Intent Bazlı Maliyet</Text>
                <View style={styles.listCard}>
                  {data.costByIntent.slice(0, 10).map((i) => (
                    <View key={i.intent} style={styles.listRow}>
                      <Text style={styles.listLabel}>{i.intent}</Text>
                      <View style={styles.listRight}>
                        <Text style={styles.listMuted}>{i.calls}×</Text>
                        <Text style={styles.listValue}>${i.cost.toFixed(3)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {data.costByModel.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Model Bazlı Maliyet</Text>
                <View style={styles.listCard}>
                  {data.costByModel.slice(0, 10).map((m) => (
                    <View key={m.model} style={styles.listRow}>
                      <Text style={styles.mono} numberOfLines={1}>
                        {m.model}
                      </Text>
                      <View style={styles.listRight}>
                        <Text style={styles.listMuted}>{m.calls}×</Text>
                        <Text style={styles.listValue}>${m.cost.toFixed(3)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.loading}>
            <Text style={styles.muted}>Veri yüklenemedi</Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: tint }]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.section },
  loading: { paddingVertical: space.section * 2, alignItems: "center" },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint },
  statRow: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  statIcon: { marginBottom: space.sm },
  statValue: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  section: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  sectionTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: space.md,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.xxl,
    alignItems: "center",
  },
  agentCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.sm,
    ...shadow.soft,
  },
  agentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  agentName: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
    textTransform: "capitalize",
  },
  agentMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  agentCost: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flameDeep,
  },
  metricsRow: { flexDirection: "row", justifyContent: "space-between" },
  metricLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
  },
  metricValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 128, gap: 4 },
  barCol: { flex: 1, alignItems: "center" },
  bar: {
    width: "100%",
    backgroundColor: colors.flame,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
  },
  listCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.flameSoft,
  },
  listLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  mono: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  listRight: { flexDirection: "row", alignItems: "center", gap: space.sm },
  listMuted: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  listValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.flameDeep,
  },
});
