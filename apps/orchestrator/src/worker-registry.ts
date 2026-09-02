// Worker Agent Registry — Central Agent tarafından yönetilen isolated worker'lar
// Her worker tek bir domain'de uzman, sadece task payload'ı alır, sonuç döner

import { nanoid } from "nanoid";
import { recognizeVehicle } from "./agents/vision.js";
import { suggestPrice } from "./agents/pricing.js";
import { translateBatch } from "./agents/translate.js";
import { searchVehicles } from "./agents/search.js";
import { detectDamage } from "./agents/damage.js";
import { quoteRental } from "./agents/rental.js";
import { checkFraud } from "./agents/fraud.js";
import { recommendSimilar } from "./agents/recommend.js";
import { handleSupport } from "./agents/support.js";
import { negotiateTurn } from "./agents/negotiation.js";
import type { UIDirective } from "./ui-directive.js";

export interface WorkerTask {
  id: string;
  worker: string;
  priority: "high" | "normal" | "low";
  payload: Record<string, unknown>;
  dependencies: string[]; // Diğer task ID'leri
  threadId: string;
  userId: string | null;
  locale: string;
}

export interface WorkerResult {
  id: string;
  worker: string;
  success: boolean;
  directives: UIDirective[];
  data?: Record<string, unknown>;
  durationMs: number;
  costUsd: number;
  confidence: number;
  tokens: number;
  model?: string;
  error?: string;
  retryCount: number;
}

export interface WorkerContext {
  threadId: string;
  userId: string | null;
  locale: string;
  entities: Record<string, unknown>;
  vehicleId?: string;
  userPrefs?: unknown;
  recentSearches?: Array<unknown>;
  emit: (directive: UIDirective) => Promise<void>;
}

interface WorkerDefinition {
  name: string;
  capabilities: string[];
  status: "active" | "paused" | "disabled";
  /** Worker'ın belirli task payload'ları için retry stratejisi */
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  /** Worker'ın ana işlemi */
  execute: (task: WorkerTask, ctx: WorkerContext) => Promise<{
    directives: UIDirective[];
    data: Record<string, unknown>;
    costUsd: number;
    tokens: number;
    model: string;
    confidence: number;
    durationMs: number;
  }>;
}

// Worker tanımlamaları — her biri izole çalışır
const WORKER_DEFINITIONS: Record<string, WorkerDefinition> = {
  vision: {
    name: "vision",
    capabilities: ["image-recognition", "vehicle-identification", "color-detection"],
    status: "active",
    retryPolicy: { maxRetries: 2, backoffMs: 1000 },
    execute: async (task, ctx) => {
      const images = (task.payload.images as string[]) ?? [];
      if (images.length === 0) throw new Error("no_images");

      const result = await recognizeVehicle(images);
      const cardId = `recognition-${nanoid(6)}`;

      return {
        directives: [
          {
            type: "form_autofill",
            formId: "sell-form",
            fields: {
              make: result.make,
              model: result.model,
              year: result.year,
              bodyType: result.bodyType,
              color: result.color,
            },
          },
          {
            type: "show_card",
            card: "recognition_result",
            cardId,
            data: {
              make: result.make,
              model: result.model,
              year: result.year,
              bodyType: result.bodyType,
              color: result.color,
              confidence: result.overallConfidence,
              alternatives: result.alternatives,
            },
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: result.overallConfidence,
        durationMs: result.durationMs,
      };
    },
  },

  pricing: {
    name: "pricing",
    capabilities: ["market-analysis", "price-suggestion", "factor-analysis"],
    status: "active",
    retryPolicy: { maxRetries: 2, backoffMs: 1500 },
    execute: async (task, ctx) => {
      const make = (task.payload.make as string) ?? (ctx.entities.make as string);
      const model = (task.payload.model as string) ?? (ctx.entities.model as string);
      const year = (task.payload.year as number) ?? (ctx.entities.year as number);
      if (!make || !model || !year) throw new Error("missing_vehicle_params");

      const result = await suggestPrice({
        make,
        model,
        year,
        mileageKm: task.payload.mileageKm as number | undefined,
        condition: (task.payload.condition as "new" | "like_new" | "used" | "damaged") ?? "used",
        countryCode: (task.payload.countryCode as string) ?? "TR",
      });

      return {
        directives: [
          {
            type: "show_card",
            card: "price_suggestion",
            cardId: `pricing-${nanoid(6)}`,
            data: result,
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: result.confidence,
        durationMs: result.durationMs,
      };
    },
  },

  search: {
    name: "search",
    capabilities: ["natural-language-search", "filter-decomposition", "ranking"],
    status: "active",
    retryPolicy: { maxRetries: 1, backoffMs: 500 },
    execute: async (task, ctx) => {
      const query = (task.payload.query as string) ?? "";
      const result = await searchVehicles({
        query,
        locale: ctx.locale,
        pageSize: 20,
      });

      return {
        directives: [
          {
            type: "navigate",
            route: "/(tabs)/search",
            params: {
              q: result.filters.q ?? query,
              filters: JSON.stringify(result.filters),
            },
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: 0,
        model: result.model,
        confidence: 0.9,
        durationMs: result.durationMs,
      };
    },
  },

  translate: {
    name: "translate",
    capabilities: ["multilingual", "automotive-terminology", "parallel-translation"],
    status: "active",
    retryPolicy: { maxRetries: 2, backoffMs: 800 },
    execute: async (task, ctx) => {
      const text = (task.payload.text as string) ?? "";
      const sourceLocale = (task.payload.sourceLocale as "tr" | "en" | "ar" | "fa" | "ku-bad" | "ku-sor") ?? "en";
      const result = await translateBatch({
        text,
        sourceLocale,
        targetLocales: ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"],
        context: (task.payload.context as "vehicle_title" | "vehicle_description" | "chat" | "ui" | "general") ?? "general",
      });

      return {
        directives: [
          {
            type: "show_card",
            card: "translation",
            cardId: `translation-${nanoid(6)}`,
            data: result,
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.totalCostUsd,
        tokens: result.totalTokens,
        model: "free_translate",
        confidence: 0.9,
        durationMs: result.totalDurationMs,
      };
    },
  },

  damage: {
    name: "damage",
    capabilities: ["image-analysis", "damage-detection", "severity-scoring"],
    status: "active",
    retryPolicy: { maxRetries: 1, backoffMs: 2000 },
    execute: async (task, ctx) => {
      const images = (task.payload.images as string[]) ?? [];
      if (images.length < 2) throw new Error("min_2_images_required");
      const result = await detectDamage(images);

      const directives: UIDirective[] = [
        {
          type: "show_card",
          card: "damage_report",
          cardId: `damage-${nanoid(6)}`,
          data: result,
        },
      ];

      if (result.humanInLoopRequired) {
        directives.push({
          type: "human_in_loop_required",
          reason: "Hasar tespiti düşük güvenle sonuçlandı.",
          resumeToken: nanoid(16),
          data: { damages: result.damages },
        });
      }

      return {
        directives,
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: 0.85,
        durationMs: result.durationMs,
      };
    },
  },

  rental: {
    name: "rental",
    capabilities: ["dynamic-pricing", "occupancy-analysis", "seasonal-factors"],
    status: "active",
    retryPolicy: { maxRetries: 1, backoffMs: 1500 },
    execute: async (task, ctx) => {
      const rentalId = task.payload.rentalId as string;
      const startDate = task.payload.startDate as string;
      const endDate = task.payload.endDate as string;
      if (!rentalId || !startDate || !endDate) throw new Error("missing_rental_params");

      const result = await quoteRental({ rentalId, startDate, endDate });

      return {
        directives: [
          {
            type: "show_card",
            card: "rental_quote",
            cardId: `rental-${nanoid(6)}`,
            data: result,
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: result.confidence,
        durationMs: result.durationMs,
      };
    },
  },

  fraud: {
    name: "fraud",
    capabilities: ["risk-scoring", "outlierging-detection", "exif-analysis", "perceptual-hash"],
    status: "active",
    retryPolicy: { maxRetries: 1, backoffMs: 1500 },
    execute: async (task, ctx) => {
      const vehicleId = (task.payload.vehicleId as string) ?? ctx.vehicleId;
      if (!vehicleId) throw new Error("missing_vehicle_id");
      const result = await checkFraud(vehicleId);

      return {
        directives: [
          {
            type: "show_card",
            card: "fraud_check",
            cardId: `fraud-${nanoid(6)}`,
            data: result,
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: result.riskScore < 30 ? 0.9 : 0.6,
        durationMs: result.durationMs,
      };
    },
  },

  recommend: {
    name: "recommend",
    capabilities: ["similarity-search", "feature-extraction", "llm-reasoning"],
    status: "active",
    retryPolicy: { maxRetries: 2, backoffMs: 1000 },
    execute: async (task, ctx) => {
      const vehicleId = (task.payload.vehicleId as string) ?? ctx.vehicleId;
      if (!vehicleId) throw new Error("missing_vehicle_id");
      const result = await recommendSimilar({
        vehicleId,
        locale: ctx.locale,
        limit: 10,
      });

      return {
        directives: [
          {
            type: "show_card",
            card: "recommendations",
            cardId: `recommend-${nanoid(6)}`,
            data: { vehicles: result.vehicles },
          },
        ],
        data: { vehicles: result.vehicles },
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: 0.85,
        durationMs: result.durationMs,
      };
    },
  },

  negotiation: {
    name: "negotiation",
    capabilities: ["multi-turn", "private-reservation", "market-aware-concession"],
    status: "active",
    retryPolicy: { maxRetries: 1, backoffMs: 1000 },
    execute: async (task, ctx) => {
      const negotiationId = (task.payload.negotiationId as string) ?? "";
      const vehicleId = (task.payload.vehicleId as string) ?? ctx.vehicleId ?? "";
      const action = (task.payload.action as "start" | "offer" | "counter" | "accept" | "reject") ?? "start";

      const result = await negotiateTurn({
        threadId: negotiationId,
        vehicleId,
        buyerId: ctx.userId ?? "anonymous",
        action,
        offerAmount: task.payload.offerAmount as number | undefined,
        buyerMaxOffer: task.payload.buyerMaxOffer as number | undefined,
        sellerMinAccept: task.payload.sellerMinAccept as number | undefined,
        locale: ctx.locale,
      });

      return {
        directives: [
          {
            type: "show_card",
            card: "negotiation_offer",
            cardId: `negotiation-${nanoid(6)}`,
            data: {
              negotiationId: result.negotiationId,
              status: result.status,
              offers: result.offers,
              currentOffer: result.currentOffer,
              agreedAmount: result.agreedAmount,
              agentSuggestion: result.agentSuggestion,
              turnNumber: result.turnNumber,
              maxTurns: result.maxTurns,
            },
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: 0.85,
        durationMs: result.durationMs,
      };
    },
  },

  support: {
    name: "support",
    capabilities: ["triage", "routing", "escalation"],
    status: "active",
    retryPolicy: { maxRetries: 2, backoffMs: 800 },
    execute: async (task, ctx) => {
      const result = await handleSupport({
        message: (task.payload.message as string) ?? "",
        locale: ctx.locale,
        userId: ctx.userId,
      });

      return {
        directives: [
          {
            type: "show_card",
            card: "ai_assistant_reply",
            cardId: `support-${nanoid(6)}`,
            data: {
              reply: result.reply,
              intent: result.intent,
              needsHuman: result.needsHuman,
            },
          },
          {
            type: "stream_message",
            messageId: nanoid(),
            role: "assistant",
            content: result.reply,
            delta: false,
          },
        ],
        data: result as unknown as Record<string, unknown>,
        costUsd: result.costUsd,
        tokens: result.tokens,
        model: result.model,
        confidence: result.confidence,
        durationMs: result.durationMs,
      };
    },
  },
};

export const workerRegistry = {
  /**
   * Worker listele
   */
  list(): Array<{ name: string; capabilities: string[]; status: WorkerDefinition["status"] }> {
    return Object.values(WORKER_DEFINITIONS).map((w) => ({
      name: w.name,
      capabilities: w.capabilities,
      status: w.status,
    }));
  },

  /**
   * Tek bir worker'ı çalıştır (retry/fallback dahil)
   */
  async execute(task: WorkerTask, ctx: WorkerContext): Promise<WorkerResult> {
    const def = WORKER_DEFINITIONS[task.worker];
    if (!def) {
      return {
        id: task.id,
        worker: task.worker,
        success: false,
        directives: [],
        durationMs: 0,
        costUsd: 0,
        confidence: 0,
        tokens: 0,
        retryCount: 0,
        error: `unknown_worker: ${task.worker}`,
      };
    }

    if (def.status !== "active") {
      return {
        id: task.id,
        worker: task.worker,
        success: false,
        directives: [],
        durationMs: 0,
        costUsd: 0,
        confidence: 0,
        tokens: 0,
        retryCount: 0,
        error: `worker_disabled: ${task.worker} (${def.status})`,
      };
    }

    const maxRetries = def.retryPolicy?.maxRetries ?? 1;
    const backoffMs = def.retryPolicy?.backoffMs ?? 1000;

    let lastError: Error | null = null;
    let totalDurationMs = 0;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      retryCount = attempt;
      const attemptStart = Date.now();

      try {
        const result = await def.execute(task, ctx);
        totalDurationMs += Date.now() - attemptStart;

        // Audit log
        await import("./audit.js").then((a) =>
          a.audit.log({
            userId: ctx.userId,
            threadId: ctx.threadId,
            agent: task.worker,
            intent: (task.payload.intent as string) ?? null,
            model: result.model,
            tier: "cheap",
            promptTokens: result.tokens,
            completionTokens: 0,
            costUsd: result.costUsd,
            durationMs: result.durationMs,
            success: true,
            confidence: result.confidence,
          }),
        ).catch(() => {});

        return {
          id: task.id,
          worker: task.worker,
          success: true,
          directives: result.directives,
          data: result.data,
          durationMs: result.durationMs,
          costUsd: result.costUsd,
          confidence: result.confidence,
          tokens: result.tokens,
          model: result.model,
          retryCount: attempt,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("worker_failed");
        totalDurationMs += Date.now() - attemptStart;
        console.warn(
          `[worker:${task.worker}] attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          lastError.message,
        );

        if (attempt < maxRetries) {
          await sleep(backoffMs * Math.pow(2, attempt));
        }
      }
    }

    // Tüm retry'ler başarısız
    return {
      id: task.id,
      worker: task.worker,
      success: false,
      directives: [],
      durationMs: totalDurationMs,
      costUsd: 0,
      confidence: 0,
      tokens: 0,
      retryCount,
      error: lastError?.message ?? "worker_failed_after_retries",
    };
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}