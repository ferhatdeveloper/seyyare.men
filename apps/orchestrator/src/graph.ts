// Orchestrator Graph — multi-agent koordinasyon mantığı
// Selective parallel + hierarchical + confidence-gated escalation

import { classifyIntent, type Intent } from "./intent.js";
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
import { checkpointer, type ThreadState } from "./checkpointer.js";
import { audit } from "./audit.js";
import type { UIDirective } from "./ui-directive.js";
import { nanoid } from "nanoid";

export interface OrchestrationInput {
  threadId?: string;
  text: string;
  images?: string[];
  locale: string;
  userId: string | null;
  vehicleId?: string;
  vehicleData?: Record<string, unknown>;
}

export interface OrchestrationContext {
  input: OrchestrationInput;
  thread: ThreadState;
  intent: Intent;
  intentConfidence: number;
  intentReasoning: string;
  entities: Record<string, unknown>;
  directives: UIDirective[];
}

export interface AgentRun {
  agent: string;
  run: (ctx: OrchestrationContext) => Promise<{ result: unknown; confidence: number; costUsd: number; tokens: number; model: string; durationMs: number }>;
}

/**
 * Bir kullanıcı isteğini orkestre et:
 * 1. Intent classifier → hangi niyet?
 * 2. Niyete göre agent'ları seç
 * 3. Selective parallel çalıştır
 * 4. UI directive'ler oluştur
 * 5. Checkpointer'a kaydet
 */
export async function orchestrate(
  input: OrchestrationInput,
  emit: (directive: UIDirective) => Promise<void>,
): Promise<OrchestrationContext> {
  // 1. Thread oluştur veya getir
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

  // User message'ı kaydet
  await checkpointer.appendMessage(thread.threadId, {
    role: "user",
    content: input.text,
    agent: "user",
  });

  const ctx: OrchestrationContext = {
    input,
    thread,
    intent: "general_chat",
    intentConfidence: 0,
    intentReasoning: "",
    entities: {},
    directives: [],
  };

  // 2. Intent classification
  emit({
    type: "show_loading",
    agent: "intent",
    message: "Anlaşılıyor...",
  });

  const intentResult = await classifyIntent({
    text: input.text,
    locale: input.locale,
    thread,
    images: input.images,
  });

  ctx.intent = intentResult.intent;
  ctx.intentConfidence = intentResult.confidence;
  ctx.intentReasoning = intentResult.reasoning;
  ctx.entities = intentResult.entities;

  await audit.log({
    userId: input.userId,
    threadId: thread.threadId,
    agent: "intent",
    intent: intentResult.intent,
    model: intentResult.model,
    tier: "cheap",
    promptTokens: intentResult.tokens,
    completionTokens: 0,
    costUsd: intentResult.costUsd,
    durationMs: intentResult.durationMs,
    success: true,
    confidence: intentResult.confidence,
  });

  await checkpointer.update(thread.threadId, {
    intent: intentResult.intent,
    totalCostUsd: thread.totalCostUsd + intentResult.costUsd,
    totalTokens: thread.totalTokens + intentResult.tokens,
  });

  emit({
    type: "hide_loading",
    agent: "intent",
  });

  emit({
    type: "toast",
    message: intentResult.reasoning || "Anlaşıldı",
    level: "info",
    durationMs: 1500,
  });

  // 3. Intent'e göre agent'ları seç ve paralel çalıştır
  const agents = pickAgents(ctx);
  const tasks: Array<Promise<void>> = [];

  for (const agentRun of agents) {
    tasks.push(
      (async () => {
        emit({
          type: "show_loading",
          agent: agentRun.agent,
          message: `${agentRun.agent} çalışıyor...`,
        });

        try {
          const r = await agentRun.run(ctx);

          // Audit
          await audit.log({
            userId: input.userId,
            threadId: thread.threadId,
            agent: agentRun.agent,
            intent: ctx.intent,
            model: r.model,
            tier: "cheap",
            promptTokens: r.tokens,
            completionTokens: 0,
            costUsd: r.costUsd,
            durationMs: r.durationMs,
            success: true,
            confidence: r.confidence,
          });

          // Thread güncelle
          const fresh = await checkpointer.get(thread.threadId);
          if (fresh) {
            await checkpointer.update(thread.threadId, {
              totalCostUsd: fresh.totalCostUsd + r.costUsd,
              totalTokens: fresh.totalTokens + r.tokens,
            });
          }

          emit({
            type: "hide_loading",
            agent: agentRun.agent,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "agent_failed";
          console.error(`[orchestrator] ${agentRun.agent} failed:`, err);
          await audit.log({
            userId: input.userId,
            threadId: thread.threadId,
            agent: agentRun.agent,
            intent: ctx.intent,
            model: "—",
            tier: "cheap",
            promptTokens: 0,
            completionTokens: 0,
            costUsd: 0,
            durationMs: 0,
            success: false,
            error: msg,
          });

          emit({
            type: "hide_loading",
            agent: agentRun.agent,
          });

          emit({
            type: "toast",
            message: `${agentRun.agent} başarısız: ${msg}`,
            level: "warning",
            durationMs: 3000,
          });
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);

  // 4. Completion
  await checkpointer.complete(thread.threadId);
  return ctx;
}

/**
 * Intent'e göre hangi agent'ların çalışacağını seç
 */
function pickAgents(ctx: OrchestrationContext): AgentRun[] {
  const agents: AgentRun[] = [];

  switch (ctx.intent) {
    case "create_listing":
      if (ctx.input.images && ctx.input.images.length > 0) {
        agents.push({
          agent: "vision",
          run: async (c) => {
            const result = await recognizeVehicle(c.input.images!);
            const cardId = `recognition-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "form_autofill",
              formId: "sell-form",
              fields: {
                make: result.make,
                model: result.model,
                year: result.year,
                bodyType: result.bodyType,
                color: result.color,
                makeId: result.make, // Vision içinde makeId set edilebilir
              },
            };
            c.directives.push(directive);
            await emitInline(c, directive);

            // Recognition result card
            const recCard: UIDirective = {
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
            };
            c.directives.push(recCard);
            await emitInline(c, recCard);

            return {
              result,
              confidence: result.overallConfidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }

      // Varsa entities'ten fiyat öner
      const make = (ctx.entities.make as string) ?? "";
      const model = (ctx.entities.model as string) ?? "";
      const year = (ctx.entities.year as number) ?? 0;
      if (make && model && year) {
        agents.push({
          agent: "pricing",
          run: async (c) => {
            const result = await suggestPrice({
              make,
              model,
              year,
              condition: "used",
            });
            const cardId = `pricing-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "price_suggestion",
              cardId,
              data: result,
            };
            c.directives.push(directive);
            await emitInline(c, directive);
            return {
              result,
              confidence: result.confidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }

      // Fraud check (vehicleId varsa)
      if (ctx.input.vehicleId) {
        agents.push({
          agent: "fraud",
          run: async (c) => {
            const result = await checkFraud(c.input.vehicleId!);
            const cardId = `fraud-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "fraud_check",
              cardId,
              data: result,
            };
            c.directives.push(directive);
            await emitInline(c, directive);
            return {
              result,
              confidence: result.riskScore < 30 ? 0.9 : 0.6,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }
      break;

    case "search_vehicles":
      agents.push({
        agent: "search",
        run: async (c) => {
          const result = await searchVehicles({
            query: c.input.text,
            locale: c.input.locale,
            pageSize: 20,
          });
          const directive: UIDirective = {
            type: "navigate",
            route: "/(tabs)/search",
            params: {
              q: result.filters.q ?? c.input.text,
              filters: JSON.stringify(result.filters),
            },
          };
          c.directives.push(directive);
          await emitInline(c, directive);
          return {
            result,
            confidence: 0.9,
            costUsd: result.costUsd,
            tokens: 0,
            model: result.model,
            durationMs: result.durationMs,
          };
        },
      });
      break;

    case "translate_content": {
      const textToTranslate = (ctx.entities.text as string) ?? ctx.input.text;
      const sourceLocale = (ctx.entities.sourceLocale as "tr" | "en" | "ar" | "fa" | "ku-bad" | "ku-sor") ?? "en";
      agents.push({
        agent: "translate",
        run: async (c) => {
          const result = await translateBatch({
            text: textToTranslate,
            sourceLocale,
            targetLocales: ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"],
            context: "vehicle_description",
          });
          const cardId = `translation-${nanoid(6)}`;
          const directive: UIDirective = {
            type: "show_card",
            card: "translation",
            cardId,
            data: result,
          };
          c.directives.push(directive);
          await emitInline(c, directive);
          return {
            result,
            confidence: 0.9,
            costUsd: result.totalCostUsd,
            tokens: result.totalTokens,
            model: MODELS.free_translate,
            durationMs: result.totalDurationMs,
          };
        },
      });
      break;
    }

    case "check_damage":
      if (ctx.input.images && ctx.input.images.length >= 2) {
        agents.push({
          agent: "damage",
          run: async (c) => {
            const result = await detectDamage(c.input.images!);
            const cardId = `damage-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "damage_report",
              cardId,
              data: result,
            };
            c.directives.push(directive);
            await emitInline(c, directive);

            if (result.humanInLoopRequired) {
              const hilDirective: UIDirective = {
                type: "human_in_loop_required",
                reason: "Hasar tespiti düşük güvenle sonuçlandı, uzman incelemesi gerekli.",
                resumeToken: nanoid(16),
                data: { damages: result.damages },
              };
              c.directives.push(hilDirective);
              await emitInline(c, hilDirective);
            }

            return {
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }
      break;

    case "recommend_similar":
      if (ctx.input.vehicleId) {
        agents.push({
          agent: "recommend",
          run: async (c) => {
            const result = await recommendSimilar({
              vehicleId: c.input.vehicleId!,
              locale: c.input.locale,
              limit: 10,
            });
            const cardId = `recommend-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "recommendations",
              cardId,
              data: { vehicles: result.vehicles },
            };
            c.directives.push(directive);
            await emitInline(c, directive);
            return {
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }
      break;

    case "rent_vehicle":
      if (ctx.input.vehicleData?.rentalId && ctx.entities.startDate && ctx.entities.endDate) {
        agents.push({
          agent: "rental",
          run: async (c) => {
            const result = await quoteRental({
              rentalId: String(c.input.vehicleData!.rentalId),
              startDate: String(c.entities.startDate),
              endDate: String(c.entities.endDate),
            });
            const cardId = `rental-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "rental_quote",
              cardId,
              data: result,
            };
            c.directives.push(directive);
            await emitInline(c, directive);
            return {
              result,
              confidence: result.confidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }
      break;

    case "negotiate_price":
      // Negotiation orchestration (buyer action veya counter)
      if (ctx.input.vehicleData?.negotiationId || ctx.input.vehicleData?.vehicleId) {
        agents.push({
          agent: "negotiation",
          run: async (c) => {
            const negotiationId = String(c.input.vehicleData?.negotiationId ?? "");
            const action = (c.input.vehicleData?.action as "start" | "offer" | "counter" | "accept" | "reject") ?? "start";
            const result = await negotiateTurn({
              threadId: negotiationId,
              vehicleId: String(c.input.vehicleData?.vehicleId ?? c.input.vehicleId ?? ""),
              buyerId: c.input.userId ?? "anonymous",
              action,
              offerAmount: c.input.vehicleData?.offerAmount as number | undefined,
              buyerMaxOffer: c.input.vehicleData?.buyerMaxOffer as number | undefined,
              sellerMinAccept: c.input.vehicleData?.sellerMinAccept as number | undefined,
              locale: c.input.locale,
            });

            const cardId = `negotiation-${nanoid(6)}`;
            const directive: UIDirective = {
              type: "show_card",
              card: "negotiation_offer",
              cardId,
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
            };
            c.directives.push(directive);
            await emitInline(c, directive);
            return {
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
            };
          },
        });
      }
      break;

    case "support_help":
    case "general_chat":
    default:
      // Support agent triage
      agents.push({
        agent: "support",
        run: async (c) => {
          const result = await handleSupport({
            message: c.input.text,
            locale: c.input.locale,
            userId: c.input.userId,
          });

          const cardId = `support-${nanoid(6)}`;
          const directive: UIDirective = {
            type: "show_card",
            card: "ai_assistant_reply",
            cardId,
            data: {
              reply: result.reply,
              intent: result.intent,
              needsHuman: result.needsHuman,
            },
          };
          c.directives.push(directive);
          await emitInline(c, directive);

          // Stream message da gönder (chat için)
          const streamMsg: UIDirective = {
            type: "stream_message",
            messageId: nanoid(),
            role: "assistant",
            content: result.reply,
            delta: false,
          };
          c.directives.push(streamMsg);
          await emitInline(c, streamMsg);

          return {
            result,
            confidence: result.confidence,
            costUsd: result.costUsd,
            tokens: result.tokens,
            model: result.model,
            durationMs: result.durationMs,
          };
        },
      });
      break;
  }

  return agents;
}

import { MODELS } from "./openrouter.js";

async function emitInline(ctx: OrchestrationContext, directive: UIDirective): Promise<void> {
  // External emitter tarafından yakalanacak
  ctx.directives.push(directive);
}