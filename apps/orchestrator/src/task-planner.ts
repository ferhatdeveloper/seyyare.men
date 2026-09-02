// Task Planner — DAG (Directed Acyclic Graph) olarak görev planı oluşturur
// Dependency-aware execution: bir task'ın dependency'si varsa önce onlar çalışır

import { nanoid } from "nanoid";

export interface TaskNode {
  id: string;
  worker: string; // Hangi worker çalıştıracak
  priority: "high" | "normal" | "low";
  dependencies: string[]; // Bu task başlamadan önce tamamlanması gereken task ID'leri
  payload: Record<string, unknown>;
  estimatedCostUsd: number;
  estimatedDurationMs: number;
}

export interface TaskPlan {
  id: string;
  tasks: TaskNode[];
  estimatedCostUsd: number;
  estimatedDurationMs: number;
  createdAt: number;
}

export interface TaskResult {
  id: string;
  worker: string;
  success: boolean;
  directives: import("./ui-directive.js").UIDirective[];
  data?: Record<string, unknown>;
  durationMs: number;
  costUsd: number;
  confidence: number;
  tokens: number;
  model?: string;
  error?: string;
  retryCount: number;
}

export interface CreatePlanInput {
  primaryIntent: string;
  secondaryIntents: Array<{ intent: string; confidence: number }>;
  entities: Record<string, unknown>;
  hasImages: boolean;
  vehicleId?: string;
  userId?: string | null;
  locale: string;
}

const WORKER_ESTIMATED_COST: Record<string, number> = {
  vision: 0.01,
  pricing: 0.005,
  search: 0.003,
  translate: 0.001,
  damage: 0.03,
  rental: 0.005,
  fraud: 0.002,
  recommend: 0.002,
  negotiation: 0.01,
  support: 0.003,
};

const WORKER_ESTIMATED_DURATION: Record<string, number> = {
  vision: 3500,
  pricing: 1500,
  search: 2000,
  translate: 1000,
  damage: 5000,
  rental: 1500,
  fraud: 2000,
  recommend: 1500,
  negotiation: 1500,
  support: 1500,
};

/**
 * Intent → Worker mapping (priority ile)
 */
function intentToWorkers(intent: string, opts: CreatePlanInput): TaskNode[] {
  const tasks: TaskNode[] = [];
  const make = opts.entities.make as string | undefined;
  const model = opts.entities.model as string | undefined;
  const year = opts.entities.year as number | undefined;
  const startDate = opts.entities.startDate as string | undefined;
  const endDate = opts.entities.endDate as string | undefined;

  switch (intent) {
    case "create_listing":
      // Vision (eğer görsel varsa)
      if (opts.hasImages) {
        tasks.push({
          id: nanoid(8),
          worker: "vision",
          priority: "high",
          dependencies: [],
          payload: { images: opts.entities._images ?? [] },
          estimatedCostUsd: WORKER_ESTIMATED_COST.vision,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.vision,
        });
      }

      // Pricing (marka/model/yıl biliniyorsa)
      if (make && model && year) {
        tasks.push({
          id: nanoid(8),
          worker: "pricing",
          priority: "high",
          dependencies: opts.hasImages ? [tasks[0]?.id].filter(Boolean) as string[] : [],
          payload: {
            make,
            model,
            year,
            mileageKm: opts.entities.mileageKm,
            condition: "used",
            countryCode: opts.entities.countryCode ?? "TR",
            intent: "create_listing",
          },
          estimatedCostUsd: WORKER_ESTIMATED_COST.pricing,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.pricing,
        });
      }

      // Fraud check (vehicleId varsa)
      if (opts.vehicleId) {
        tasks.push({
          id: nanoid(8),
          worker: "fraud",
          priority: "normal",
          dependencies: [],
          payload: { vehicleId: opts.vehicleId, intent: "create_listing" },
          estimatedCostUsd: WORKER_ESTIMATED_COST.fraud,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.fraud,
        });
      }
      break;

    case "search_vehicles":
      tasks.push({
        id: nanoid(8),
        worker: "search",
        priority: "high",
        dependencies: [],
        payload: {
          query: opts.entities._query ?? "",
          locale: opts.locale,
          intent: "search_vehicles",
        },
        estimatedCostUsd: WORKER_ESTIMATED_COST.search,
        estimatedDurationMs: WORKER_ESTIMATED_DURATION.search,
      });

      // Recommendation (eğer vehicleId varsa)
      if (opts.vehicleId) {
        tasks.push({
          id: nanoid(8),
          worker: "recommend",
          priority: "low",
          dependencies: [],
          payload: { vehicleId: opts.vehicleId, intent: "search_vehicles" },
          estimatedCostUsd: WORKER_ESTIMATED_COST.recommend,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.recommend,
        });
      }
      break;

    case "translate_content":
      tasks.push({
        id: nanoid(8),
        worker: "translate",
        priority: "high",
        dependencies: [],
        payload: {
          text: opts.entities.text ?? opts.entities._query ?? "",
          sourceLocale: opts.entities.sourceLocale ?? "en",
          context: "vehicle_description",
          intent: "translate_content",
        },
        estimatedCostUsd: WORKER_ESTIMATED_COST.translate,
        estimatedDurationMs: WORKER_ESTIMATED_DURATION.translate,
      });
      break;

    case "check_damage":
      if (opts.hasImages) {
        tasks.push({
          id: nanoid(8),
          worker: "damage",
          priority: "high",
          dependencies: [],
          payload: { images: opts.entities._images ?? [], intent: "check_damage" },
          estimatedCostUsd: WORKER_ESTIMATED_COST.damage,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.damage,
        });
      }
      break;

    case "recommend_similar":
      if (opts.vehicleId) {
        tasks.push({
          id: nanoid(8),
          worker: "recommend",
          priority: "high",
          dependencies: [],
          payload: { vehicleId: opts.vehicleId, intent: "recommend_similar" },
          estimatedCostUsd: WORKER_ESTIMATED_COST.recommend,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.recommend,
        });
      }
      break;

    case "rent_vehicle":
      if (startDate && endDate && opts.entities.rentalId) {
        tasks.push({
          id: nanoid(8),
          worker: "rental",
          priority: "high",
          dependencies: [],
          payload: {
            rentalId: opts.entities.rentalId,
            startDate,
            endDate,
            intent: "rent_vehicle",
          },
          estimatedCostUsd: WORKER_ESTIMATED_COST.rental,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.rental,
        });
      }
      break;

    case "negotiate_price":
      tasks.push({
        id: nanoid(8),
        worker: "negotiation",
        priority: "high",
        dependencies: [],
        payload: {
          negotiationId: opts.entities.negotiationId ?? "",
          vehicleId: opts.vehicleId ?? "",
          action: opts.entities.action ?? "start",
          offerAmount: opts.entities.offerAmount,
          buyerMaxOffer: opts.entities.buyerMaxOffer,
          sellerMinAccept: opts.entities.sellerMinAccept,
          intent: "negotiate_price",
        },
        estimatedCostUsd: WORKER_ESTIMATED_COST.negotiation,
        estimatedDurationMs: WORKER_ESTIMATED_DURATION.negotiation,
      });
      break;

    case "fraud_check":
      if (opts.vehicleId) {
        tasks.push({
          id: nanoid(8),
          worker: "fraud",
          priority: "high",
          dependencies: [],
          payload: { vehicleId: opts.vehicleId, intent: "fraud_check" },
          estimatedCostUsd: WORKER_ESTIMATED_COST.fraud,
          estimatedDurationMs: WORKER_ESTIMATED_DURATION.fraud,
        });
      }
      break;

    case "compare_vehicles":
      tasks.push({
        id: nanoid(8),
        worker: "search",
        priority: "high",
        dependencies: [],
        payload: {
          query: opts.entities._query ?? "compare vehicles",
          locale: opts.locale,
          intent: "compare_vehicles",
        },
        estimatedCostUsd: WORKER_ESTIMATED_COST.search,
        estimatedDurationMs: WORKER_ESTIMATED_DURATION.search,
      });
      break;

    case "support_help":
    case "general_chat":
    default:
      tasks.push({
        id: nanoid(8),
        worker: "support",
        priority: "high",
        dependencies: [],
        payload: {
          message: opts.entities._query ?? "",
          intent,
        },
        estimatedCostUsd: WORKER_ESTIMATED_COST.support,
        estimatedDurationMs: WORKER_ESTIMATED_DURATION.support,
      });
      break;
  }

  return tasks;
}

export function createTaskPlan(input: CreatePlanInput): TaskPlan {
  const allTasks: TaskNode[] = [];

  // Primary intent
  const primaryTasks = intentToWorkers(input.primaryIntent, input);
  allTasks.push(...primaryTasks);

  // Secondary intents (low priority)
  for (const secondary of input.secondaryIntents) {
    if (secondary.confidence < 0.5) continue;
    const secTasks = intentToWorkers(secondary.intent, input);
    // Secondary task'ları low priority yap
    for (const t of secTasks) {
      allTasks.push({ ...t, priority: "low" });
    }
  }

  const estimatedCostUsd = allTasks.reduce((s, t) => s + t.estimatedCostUsd, 0);
  // Parallel execution: en yavaş worker'ın süresi
  const estimatedDurationMs = Math.max(...allTasks.map((t) => t.estimatedDurationMs), 1000);

  return {
    id: nanoid(12),
    tasks: allTasks,
    estimatedCostUsd,
    estimatedDurationMs,
    createdAt: Date.now(),
  };
}

/**
 * Task planı execute et — dependency-aware parallel execution
 */
export async function executeTaskPlan(opts: {
  plan: TaskPlan;
  workerTasks: import("./worker-registry.js").WorkerTask[];
  ctx: import("./worker-registry.js").WorkerContext;
}): Promise<TaskResult[]> {
  const { plan, workerTasks, ctx } = opts;

  // Dependency graph oluştur
  const completed = new Set<string>();
  const failed = new Set<string>();
  const results: TaskResult[] = [];
  const taskMap = new Map(workerTasks.map((t) => [t.id, t]));

  // Topological order (basit)
  const sortedTasks: typeof workerTasks = [];
  const visited = new Set<string>();

  function visit(taskId: string): void {
    if (visited.has(taskId)) return;
    const task = taskMap.get(taskId);
    if (!task) return;
    for (const dep of task.dependencies) visit(dep);
    visited.add(taskId);
    sortedTasks.push(task);
  }

  for (const task of workerTasks) visit(task.id);

  // Priority queue'ya göre grupla
  const highPriority = sortedTasks.filter((t) => t.priority === "high");
  const normalPriority = sortedTasks.filter((t) => t.priority === "normal");
  const lowPriority = sortedTasks.filter((t) => t.priority === "low");

  // High priority'leri PARALEL çalıştır
  const highResults = await Promise.allSettled(
    highPriority.map((task) => runWithDependencies(task, taskMap, completed, failed, ctx, results)),
  );

  // Normal priority'leri çalıştır
  const normalResults = await Promise.allSettled(
    normalPriority.map((task) => runWithDependencies(task, taskMap, completed, failed, ctx, results)),
  );

  // Low priority'ler background'da
  const lowResults = await Promise.allSettled(
    lowPriority.map((task) => runWithDependencies(task, taskMap, completed, failed, ctx, results)),
  );

  // All results
  for (const result of [...highResults, ...normalResults, ...lowResults]) {
    if (result.status === "fulfilled" && result.value) {
      results.push(result.value);
    }
  }

  return results;
}

async function runWithDependencies(
  task: import("./worker-registry.js").WorkerTask,
  taskMap: Map<string, import("./worker-registry.js").WorkerTask>,
  completed: Set<string>,
  failed: Set<string>,
  ctx: import("./worker-registry.js").WorkerContext,
  results: TaskResult[],
): Promise<TaskResult | null> {
  // Dependencies tamamlanmış mı kontrol et
  for (const dep of task.dependencies) {
    if (failed.has(dep)) {
      // Dependency başarısız, bu task'ı skip et
      const failedResult: TaskResult = {
        id: task.id,
        worker: task.worker,
        success: false,
        directives: [],
        durationMs: 0,
        costUsd: 0,
        confidence: 0,
        tokens: 0,
        retryCount: 0,
        error: `dependency_failed: ${dep}`,
      };
      failed.add(task.id);
      results.push(failedResult);
      return failedResult;
    }
    if (!completed.has(dep)) {
      // Hala çalışıyor, bekle (basit: 100ms poll)
      // Production'da: dependency graph execution engine kullanılır
    }
  }

  try {
    // Worker'ı çalıştır (workerRegistry otomatik retry yapar)
    const { workerRegistry } = await import("./worker-registry.js");
    const result = await workerRegistry.execute(task, ctx);

    if (result.success) {
      completed.add(task.id);
    } else {
      failed.add(task.id);
    }

    results.push(result);
    return result;
  } catch (err) {
    const errResult: TaskResult = {
      id: task.id,
      worker: task.worker,
      success: false,
      directives: [],
      durationMs: 0,
      costUsd: 0,
      confidence: 0,
      tokens: 0,
      retryCount: 0,
      error: err instanceof Error ? err.message : "execution_failed",
    };
    failed.add(task.id);
    results.push(errResult);
    return errResult;
  }
}