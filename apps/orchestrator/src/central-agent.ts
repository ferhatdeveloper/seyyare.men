// Central Agent — Multi-Agent sistemin beyni
// Tüm worker agent'ları yönetir, planlama yapar, sonuçları compose eder
// Mimari: Plan → Dispatch → Monitor → Compose → Respond

import { nanoid } from "nanoid";
import { classifyIntent, type Intent } from "./intent.js";
import { checkpointer, type ThreadState } from "./checkpointer.js";
import { audit } from "./audit.js";
import { memory } from "./memory.js";
import { composeAgents, sortDirectives, mergeRelatedCards, type AgentResult } from "./composer.js";
import type { UIDirective } from "./ui-directive.js";
import { createTaskPlan, executeTaskPlan, type TaskPlan, type TaskResult } from "./task-planner.js";
import { workerRegistry, type WorkerTask, type WorkerResult } from "./worker-registry.js";
import { agentMessageBus, type AgentMessage } from "./agent-protocol.js";
import {
  cache,
  getCachedIntent,
  cacheIntentResult,
  createWarmupEvent,
} from "./cache.js";
import { langfuse } from "./langfuse.js";

export interface CentralAgentInput {
  threadId?: string;
  text: string;
  images?: string[];
  locale: string;
  userId: string | null;
  vehicleId?: string;
  vehicleData?: Record<string, unknown>;
}

export interface CentralAgentContext {
  input: CentralAgentInput;
  thread: ThreadState;
  plan: TaskPlan | null;
  results: TaskResult[];
  startTime: number;
  emit?: (directive: UIDirective) => Promise<void>;
  emitMessage?: (msg: AgentMessage) => Promise<void>;
}

export interface CentralAgentRun {
  directives: UIDirective[];
  totalCostUsd: number;
  totalDurationMs: number;
  primaryIntent: Intent;
  plan: TaskPlan | null;
  context: CentralAgentContext;
}

/**
 * Merkez Ajan — orchestrator'ın beyni.
 * 1. UNDERSTAND: kullanıcı mesajını + context'i anla
 * 2. PLAN: görev DAG'ı oluştur
 * 3. DISPATCH: worker'lara paralel gönder
 * 4. MONITOR: ilerlemeyi izle, retry/fallback yap
 * 5. COMPOSE: sonuçları birleştir
 * 6. RESPOND: SSE üzerinden mobil'e stream et
 */
export const centralAgent = {
  /**
   * Ana orkestrasyon giriş noktası
   */
  async run(input: CentralAgentInput, emit: (directive: UIDirective) => Promise<void>): Promise<CentralAgentRun> {
    const startTime = Date.now();

    // 0. Thread hazırla
    let thread: ThreadState;
    if (input.threadId) {
      const existing = await checkpointer.get(input.threadId);
      if (!existing) throw new Error(`thread ${input.threadId} not found`);
      thread = existing;
    } else {
      thread = await checkpointer.create({
        userId: input.userId,
        locale: input.locale,
        initialContext: input.vehicleData,
      });
    }
    input.threadId = thread.threadId;

    // User message kaydet
    await checkpointer.appendMessage(thread.threadId, {
      role: "user",
      content: input.text,
      agent: "user",
    });

    const ctx: CentralAgentContext = {
      input,
      thread,
      plan: null,
      results: [],
      startTime,
      emit,
    };

    // Message bus setup
    await agentMessageBus.createChannel(thread.threadId);

    // ===== PHASE 1: UNDERSTAND =====
    const phase1Start = Date.now();
    await emit({ type: "show_loading", agent: "central", message: "Anlaşılıyor..." });

    const intentResult = await classifyIntent({
      text: input.text,
      locale: input.locale,
      thread,
      images: input.images,
    });

    await audit.log({
      userId: input.userId,
      threadId: thread.threadId,
      agent: "central:intent",
      intent: intentResult.primary.intent,
      model: intentResult.model,
      tier: "cheap",
      promptTokens: intentResult.tokens,
      completionTokens: 0,
      costUsd: intentResult.costUsd,
      durationMs: Date.now() - phase1Start,
      success: true,
      confidence: intentResult.primary.confidence,
    });

    await emit({ type: "hide_loading", agent: "central" });

    // Broadcast intent recognized event (workers dinleyebilir)
    await agentMessageBus.publish(thread.threadId, {
      type: "intent_recognized",
      from: "central",
      to: "broadcast",
      data: {
        primary: intentResult.primary.intent,
        secondary: intentResult.secondary.map((s) => s.intent),
        entities: intentResult.entities,
        confidence: intentResult.primary.confidence,
      },
    });

    // ===== PHASE 2: PLAN =====
    const phase2Start = Date.now();
    await emit({ type: "show_loading", agent: "central", message: "Plan oluşturuluyor..." });

    // Long-term memory lookup — user preferences + recent searches
    let userPrefs = null;
    if (input.userId) {
      userPrefs = await memory.getPreferences(input.userId);
    }
    const recentSearches = input.userId
      ? await memory.getRecentSearches(input.userId, 5)
      : [];

    // Task planı oluştur (DAG)
    ctx.plan = createTaskPlan({
      primaryIntent: intentResult.primary.intent,
      secondaryIntents: intentResult.secondary,
      entities: intentResult.entities,
      hasImages: (input.images?.length ?? 0) > 0,
      vehicleId: input.vehicleId,
      userId: input.userId,
      locale: input.locale,
    });

    await emit({ type: "hide_loading", agent: "central" });

    // Plan ready event
    await emit({
      type: "directive",
      data: {
        type: "plan_ready",
        planId: ctx.plan.id,
        tasks: ctx.plan.tasks.map((t) => ({
          id: t.id,
          worker: t.worker,
          priority: t.priority,
          dependencies: t.dependencies,
        })),
        estimatedCostUsd: ctx.plan.estimatedCostUsd,
      },
    });

    // ===== PHASE 3: DISPATCH (parallel execution) =====
    const phase3Start = Date.now();
    await emit({
      type: "toast",
      message: `${ctx.plan.tasks.length} görev başlatılıyor...`,
      level: "info",
      durationMs: 1500,
    });

    // Worker'lara dispatch et
    const workerTasks: WorkerTask[] = ctx.plan.tasks.map((task) => ({
      id: task.id,
      worker: task.worker,
      priority: task.priority,
      payload: task.payload,
      dependencies: task.dependencies,
      threadId: thread.threadId,
      userId: input.userId,
      locale: input.locale,
    }));

    const workerResults = await executeTaskPlan({
      plan: ctx.plan,
      workerTasks,
      ctx: {
        threadId: thread.threadId,
        userId: input.userId,
        locale: input.locale,
        entities: intentResult.entities,
        vehicleId: input.vehicleId,
        userPrefs,
        recentSearches,
        emit,
      },
    });

    ctx.results = workerResults;

    // ===== PHASE 4: COMPOSE =====
    const phase4Start = Date.now();
    const composed = this.composeResults(ctx, workerResults);

    // Total cost güncelle
    const totalCost = workerResults.reduce((s, r) => s + r.costUsd, 0);
    await checkpointer.update(thread.threadId, {
      intent: intentResult.primary.intent,
      totalCostUsd: thread.totalCostUsd + totalCost,
    });

    // Emit composed directives
    for (const directive of composed.directives) {
      await emit(directive);
    }

    // ===== PHASE 5: RESPOND =====
    // Cost summary event
    await emit({
      type: "directive",
      data: {
        type: "orchestration_complete",
        planId: ctx.plan.id,
        primaryIntent: intentResult.primary.intent,
        tasksCompleted: workerResults.filter((r) => r.success).length,
        tasksFailed: workerResults.filter((r) => !r.success).length,
        totalCostUsd: totalCost,
        totalDurationMs: Date.now() - phase3Start,
        totalPhaseDurationMs: {
          understand: Date.now() - phase1Start,
          plan: Date.now() - phase2Start,
          dispatch: Date.now() - phase3Start,
          compose: Date.now() - phase4Start,
        },
      },
    });

    // Thread complete
    await checkpointer.complete(thread.threadId);

    // Langfuse: trace tamamla
    langfuse.trackEvent({
      traceId,
      name: "orchestration_complete",
      metadata: {
        tasksCompleted: workerResults.filter((r) => r.success).length,
        tasksFailed: workerResults.filter((r) => !r.success).length,
        totalCostUsd: totalCost,
        totalDurationMs: Date.now() - startTime,
        primaryIntent: ctx.primaryIntent,
      },
    });
    langfuse.flush().catch((err) => console.warn("[central] langfuse flush:", err));

    // Intent classification cache'e yaz
    await cacheIntentResult(input.text, input.locale, {
      intent: intentResult.primary.intent,
      confidence: intentResult.primary.confidence,
    });

    return {
      directives: composed.directives,
      totalCostUsd: totalCost,
      totalDurationMs: Date.now() - startTime,
      primaryIntent: intentResult.primary.intent,
      plan: ctx.plan,
      context: ctx,
    };
  },

  /**
   * Worker sonuçlarını compose et (UI'a gönderilecek directive'lere dönüştür)
   */
  composeResults(ctx: CentralAgentContext, workerResults: TaskResult[]): {
    directives: UIDirective[];
    totalCostUsd: number;
  } {
    // Her worker result'ı AgentResult formatına çevir
    const agentResults: AgentResult[] = workerResults.map((r) => ({
      agent: r.worker,
      success: r.success,
      directives: r.directives,
      data: r.data,
      durationMs: r.durationMs,
      costUsd: r.costUsd,
      confidence: r.confidence,
    }));

    const composed = composeAgents(agentResults, {
      primaryIntent: ctx.plan?.tasks[0]?.worker ?? "general_chat",
      secondaryIntents: ctx.plan?.tasks.slice(1).map((t) => t.worker) ?? [],
      userMessage: ctx.input.text,
      locale: ctx.input.locale,
    });

    let directives = sortDirectives(composed.directives);
    directives = mergeRelatedCards(directives);

    return {
      directives,
      totalCostUsd: composed.totalCostUsd,
    };
  },

  /**
   * Worker'ları listele (debug/admin için)
   */
  async listWorkers(): Promise<Array<{ name: string; capabilities: string[]; status: "active" | "paused" | "disabled" }>> {
    return workerRegistry.list();
  },

  /**
   * Aktif thread'lerdeki task planlarını göster
   */
  async getActivePlans(threadId: string): Promise<TaskPlan[]> {
    const ctx = await agentMessageBus.getChannel(threadId);
    if (!ctx) return [];
    return ctx.plans;
  },
};

export type { WorkerTask, WorkerResult };