import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Activity,
  Cpu,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen, ScreenHeader } from "../components/ui/Screen";
import { orchestrator } from "../lib/clients";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

const BORDER_FLAME = "#FFD8B8";

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

const STATUS_TR: Record<WorkerStatus["status"], string> = {
  active: "AKTİF",
  paused: "DURAKLATILDI",
  disabled: "KAPALI",
};

export default function AgentInspector() {
  const { t: _t } = useTranslation();

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
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Ajan Denetçisi"
        onBack={() => router.back()}
        right={<Cpu size={20} color={colors.flame} />}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Zap size={24} color={colors.white} />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Merkez Ajan</Text>
              <Text style={styles.heroSub}>Tüm worker'ları yöneten merkez ajan</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeaderStat
              icon={<Activity size={14} color={colors.white} />}
              label="Aktif Worker"
              value={`${healthQuery.data?.workers.active ?? 0}/${healthQuery.data?.workers.total ?? 0}`}
            />
            <HeaderStat
              icon={<Cpu size={14} color={colors.white} />}
              label="Yetenek"
              value={`${healthQuery.data?.capabilities.length ?? 0}`}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Worker'lar</Text>
            <Text style={styles.sectionMeta}>Son 24 saat</Text>
          </View>

          {workersQuery.isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.flame} />
            </View>
          ) : (
            (workersQuery.data?.workers ?? []).map((w) => <WorkerCard key={w.name} worker={w} />)
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mimari</Text>
          <View style={styles.archCard}>
            <ArchRow label="Merkez Ajan" sub="intent → plan → dispatch → compose" />
            <View style={styles.archLine} />
            <ArchRow label="Görev Planlayıcı" sub="DAG + bağımlılık farkındalığı" />
            <View style={styles.archLine} />
            <ArchRow label="Worker Kaydı" sub="retry + fallback" />
            <View style={styles.archLine} />
            <ArchRow label="Ajan Mesaj Bus" sub="JSON-RPC" />
            <View style={styles.archLine} />
            <ArchRow label="Merkez Bellek" sub="Redis + DB" />
          </View>
        </View>
      </ScrollView>
    </Screen>
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
    <View style={styles.headerStat}>
      <View style={styles.headerStatLabelRow}>
        {icon}
        <Text style={styles.headerStatLabel}>{label}</Text>
      </View>
      <Text style={styles.headerStatValue}>{value}</Text>
    </View>
  );
}

function WorkerCard({ worker }: { worker: WorkerStatus }) {
  const palette = {
    active: {
      bg: colors.flameSoft,
      border: BORDER_FLAME,
      text: colors.flameDeep,
      dot: colors.flame,
    },
    paused: {
      bg: colors.brassSoft,
      border: BORDER_FLAME,
      text: colors.brass,
      dot: colors.brass,
    },
    disabled: {
      bg: colors.mist,
      border: colors.line,
      text: colors.inkFaint,
      dot: colors.inkFaint,
    },
  }[worker.status];

  const successIcon =
    worker.successRate >= 0.9 ? (
      <CheckCircle2 size={12} color={colors.flame} />
    ) : worker.successRate >= 0.7 ? (
      <Clock size={12} color={colors.brass} />
    ) : (
      <XCircle size={12} color={colors.danger} />
    );

  return (
    <View style={[styles.workerCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.workerTop}>
        <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
        <View style={styles.workerInfo}>
          <View style={styles.workerTitleRow}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={[styles.workerStatus, { color: palette.text }]}>
              {STATUS_TR[worker.status]}
            </Text>
          </View>
          <Text style={styles.workerCaps}>
            {worker.capabilities.slice(0, 3).join(" · ")}
            {worker.capabilities.length > 3 ? ` +${worker.capabilities.length - 3}` : ""}
          </Text>
        </View>
      </View>

      {worker.recentCalls > 0 ? (
        <View style={styles.workerFooter}>
          <View style={styles.workerFooterLeft}>
            {successIcon}
            <Text style={styles.workerFooterText}>
              {worker.recentCalls} çağrı · {Math.round(worker.successRate * 100)}% başarı
            </Text>
          </View>
          <Text style={styles.workerCost}>
            ${worker.avgCost.toFixed(4)} · {Math.round(worker.avgDurationMs)}ms
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ArchRow({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={styles.archRow}>
      <View style={styles.archIcon}>
        <Text style={styles.archIconText}>{label.charAt(0)}</Text>
      </View>
      <View style={styles.archText}>
        <Text style={styles.archLabel}>{label}</Text>
        <Text style={styles.archSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.section },
  hero: {
    marginHorizontal: space.xl,
    marginTop: space.lg,
    backgroundColor: colors.flameDeep,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroText: { marginLeft: space.md, flex: 1 },
  heroTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.white,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  headerStat: { flex: 1 },
  headerStatLabelRow: { flexDirection: "row", alignItems: "center" },
  headerStatLabel: {
    marginLeft: 6,
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
  },
  headerStatValue: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.white,
    marginTop: 2,
  },
  section: { paddingHorizontal: space.xl, paddingTop: space.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  sectionTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  loading: { paddingVertical: space.xxl, alignItems: "center" },
  workerCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    ...shadow.soft,
  },
  workerTop: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: space.sm },
  workerInfo: { flex: 1 },
  workerTitleRow: { flexDirection: "row", alignItems: "center" },
  workerName: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
    textTransform: "capitalize",
  },
  workerStatus: {
    marginLeft: space.sm,
    fontFamily: fonts.bodySemi,
    fontSize: 9,
  },
  workerCaps: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
  },
  workerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: BORDER_FLAME,
  },
  workerFooterLeft: { flexDirection: "row", alignItems: "center" },
  workerFooterText: {
    marginLeft: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  workerCost: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
  },
  archCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.soft,
  },
  archRow: { flexDirection: "row", alignItems: "center" },
  archIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.flameSoft,
    borderWidth: 1,
    borderColor: BORDER_FLAME,
    alignItems: "center",
    justifyContent: "center",
  },
  archIconText: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.flameDeep,
  },
  archText: { marginLeft: space.md, flex: 1 },
  archLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  archSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
  },
  archLine: {
    height: 12,
    marginLeft: 21,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: BORDER_FLAME,
  },
});
