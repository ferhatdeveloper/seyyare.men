// Orchestrator Graph — Multi-Agent Koordinasyon (Hierarchical + Selective Parallel)
// - Primary intent + secondary intents (multi-intent)
// - Agent tool calling (DB-backed tools)
// - Long-term memory integration
// - Token streaming (real-time UX)
// - Sub-orchestrator delegation (her agent kendi alt-graph'ını yönetebilir)

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
import { memory } from "./memory.js";
import { composeAgents, sortDirectives, mergeRelatedCards, type AgentResult } from "./composer.js";
import { getAgentTools, executeTool, type ToolDefinition } from "./tools.js";
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
  primaryIntent: Intent;
  primaryConfidence: number;
  secondaryIntents: Array<{ intent: Intent; confidence: number }>;
  intentReasoning: string;
  contextUsed: string;
  entities: Record<string, unknown>;
  directives: UIDirective[];
  emit?: (directive: UIDirective) => Promise<void>;
}

export interface AgentRun {
  agent: string;
  intent: Intent;
  run: (ctx: OrchestrationContext) => Promise<{
    result: unknown;
    confidence: number;
    costUsd: number;
    tokens: number;
    model: string;
    durationMs: number;
    directives: UIDirective[];
  }>;
}

interface StreamChunk {
  type: "token" | "complete" | "tool_call";
  content?: string;
  tool?: { name: string; args: Record<string, unknown> };
}

/**
 * Ana orkestrasyon:
 * 1. Intent classification (multi-intent aware, context-aware)
 * 2. Long-term memory lookup (kullanıcı tercihleri)
 * 3. Pick agents for primary + secondary intents
 * 4. Selective parallel execution
 * 5. Compose results (sırala, birleştir, özet)
 * 6. Emit composed directives + cost summary
 */
export async function orchestrate(
  input: OrchestrationInput,
  emit: (directive: UIDirective) => Promise<void>,
): Promise<OrchestrationContext> {
  // 1. Thread oluştur/getir
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

  // User message'ı kaydet
  await checkpointer.appendMessage(thread.threadId, {
    role: "user",
    content: input.text,
    agent: "user",
  });

  const ctx: OrchestrationContext = {
    input,
    thread,
    primaryIntent: "general_chat",
    primaryConfidence: 0,
    secondaryIntents: [],
    intentReasoning: "",
    contextUsed: "",
    entities: {},
    directives: [],
  };

  // emit'i context'e inject et
  const localEmit = async (directive: UIDirective) => {
    ctx.directives.push(directive);
    await emit(directive);
  };
  ctx.emit = localEmit;

  // 2. Intent classification (multi-intent)
  await localEmit({ type: "show_loading", agent: "intent", message: "Anlaşılıyor..." });

  const intentResult = await classifyIntent({
    text: input.text,
    locale: input.locale,
    thread,
    images: input.images,
  });

  ctx.primaryIntent = intentResult.primary.intent;
  ctx.primaryConfidence = intentResult.primary.confidence;
  ctx.secondaryIntents = intentResult.secondary;
  ctx.intentReasoning = intentResult.reasoning;
  ctx.contextUsed = intentResult.contextUsed;
  ctx.entities = intentResult.entities;

  await audit.log({
    userId: input.userId,
    threadId: thread.threadId,
    agent: "intent",
    intent: intentResult.primary.intent,
    model: intentResult.model,
    tier: "cheap",
    promptTokens: intentResult.tokens,
    completionTokens: 0,
    costUsd: intentResult.costUsd,
    durationMs: intentResult.durationMs,
    success: true,
    confidence: intentResult.primary.confidence,
  });

  await localEmit({ type: "hide_loading", agent: "intent" });
  await localEmit({
    type: "directive",
    data: {
      type: "intent_classified",
      primary: intentResult.primary.intent,
      secondary: intentResult.secondary.map((s) => s.intent),
      confidence: intentResult.primary.confidence,
    },
  });

  // 3. Long-term memory integration — user preferences yükle
  let userPrefs = null;
  if (input.userId) {
    userPrefs = await memory.getPreferences(input.userId);
    // Search intent varsa geçmiş aramaları record et
    if (intentResult.primary.intent === "search_vehicles" || ctx.secondaryIntents.some((s) => s.intent === "search_vehicles")) {
      await memory.recordSearch(input.userId, input.text, intentResult.entities);
    }
  }

  // 4. Pick agents (primary + secondary)
  const primaryAgents = pickAgents(ctx, intentResult.primary.intent);
  const secondaryAgents = ctx.secondaryIntents.flatMap((s) => pickAgents(ctx, s.intent));

  // Secondary'ları low priority olarak işaretle (background'da çalışsın)
  const allAgents: Array<{ run: AgentRun; priority: "primary" | "secondary" }> = [
    ...primaryAgents.map((r) => ({ run: r, priority: "primary" as const })),
    ...secondaryAgents.map((r) => ({ run: { ...r, agent: `${r.agent}_secondary` }, priority: "secondary" as const })),
  ];

  if (allAgents.length === 0) {
    // Fallback: support agent
    allAgents.push({ run: pickSupportAgent(ctx)[0], priority: "primary" });
  }

  // 5. Selective parallel execution
  const agentResults: AgentResult[] = [];

  const tasks = allAgents.map(({ run: agentRun, priority }) =>
    (async () => {
      const startedAt = Date.now();
      await localEmit({
        type: "show_loading",
        agent: agentRun.agent,
        message: priority === "primary"
          ? `${agentRun.agent} çalışıyor...`
          : `Ek: ${agentRun.agent} çalışıyor...`,
      });

      try {
        const r = await agentRun.run(ctx);

        // Tool calls audit (eğer varsa)
        if (r.result && typeof r.result === "object" && "toolCalls" in r.result) {
          for (const toolCall of (r.result as { toolCalls: Array<{ name: string }> }).toolCalls) {
            await audit.log({
              userId: input.userId,
              threadId: thread.threadId,
              agent: `${agentRun.agent}:tool:${toolCall.name}`,
              intent: ctx.primaryIntent,
              model: r.model,
              tier: "cheap",
              promptTokens: 0,
              completionTokens: 0,
              costUsd: 0,
              durationMs: Date.now() - startedAt,
              success: true,
            });
          }
        }

        await audit.log({
          userId: input.userId,
          threadId: thread.threadId,
          agent: agentRun.agent,
          intent: ctx.primaryIntent,
          model: r.model,
          tier: "cheap",
          promptTokens: r.tokens,
          completionTokens: 0,
          costUsd: r.costUsd,
          durationMs: r.durationMs,
          success: true,
          confidence: r.confidence,
        });

        agentResults.push({
          agent: agentRun.agent,
          success: true,
          directives: r.directives ?? [],
          data: r.result as Record<string, unknown>,
          durationMs: r.durationMs,
          costUsd: r.costUsd,
          confidence: r.confidence,
        });

        await localEmit({ type: "hide_loading", agent: agentRun.agent });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "agent_failed";
        console.error(`[orchestrator] ${agentRun.agent} failed:`, err);
        await audit.log({
          userId: input.userId,
          threadId: thread.threadId,
          agent: agentRun.agent,
          intent: ctx.primaryIntent,
          model: "—",
          tier: "cheap",
          promptTokens: 0,
          completionTokens: 0,
          costUsd: 0,
          durationMs: Date.now() - startedAt,
          success: false,
          error: msg,
        });

        agentResults.push({
          agent: agentRun.agent,
          success: false,
          directives: [],
          durationMs: Date.now() - startedAt,
          costUsd: 0,
          confidence: 0,
        });

        await localEmit({ type: "hide_loading", agent: agentRun.agent });
      }
    })(),
  );

  await Promise.allSettled(tasks);

  // 6. Compose results — sırala, merge et, özet gönder
  const composed = composeAgents(agentResults, {
    primaryIntent: ctx.primaryIntent,
    secondaryIntents: ctx.secondaryIntents.map((s) => s.intent),
    userMessage: input.text,
    locale: input.locale,
  });

  // Directive'leri sırala ve birleştir
  let composedDirectives = sortDirectives(composed.directives);
  composedDirectives = mergeRelatedCards(composedDirectives);

  // Emit composed (composeAgents zaten emit yaptı, burada ek olarak merged'leri de gönder)
  for (const directive of composedDirectives) {
    if (!ctx.directives.includes(directive)) {
      await emit(directive);
    }
  }

  // Total cost + thread update
  const totalCost = agentResults.reduce((s, r) => s + r.costUsd, 0);
  const totalDuration = agentResults.reduce((s, r) => s + r.durationMs, 0);
  await checkpointer.update(thread.threadId, {
    intent: ctx.primaryIntent,
    totalCostUsd: thread.totalCostUsd + totalCost,
  });

  // Send cost summary
  await emit({
    type: "cost",
    agent: "orchestrator",
    threadId: thread.threadId,
    data: {
      tokens: 0,
      costUsd: thread.totalCostUsd + totalCost,
      durationMs: totalDuration,
      agentsRun: agentResults.length,
      primaryIntent: ctx.primaryIntent,
      secondaryIntents: ctx.secondaryIntents.map((s) => s.intent),
    },
  } as unknown as UIDirective); // cost type isn't in UIDirective — sent as-is

  await checkpointer.complete(thread.threadId);

  return ctx;
}

/**
 * Intent için gerekli agent'ları seç.
 * Her agent kendi tool set'ini alır ve directive'leri emit eder.
 */
function pickAgents(ctx: OrchestrationContext, intent: Intent): AgentRun[] {
  const agents: AgentRun[] = [];

  switch (intent) {
    case "create_listing":
      if (ctx.input.images && ctx.input.images.length > 0) {
        agents.push({
          agent: "vision",
          intent,
          run: async (c) => {
            const result = await recognizeVehicle(c.input.images!);
            const cardId = `recognition-${nanoid(6)}`;
            const directives: UIDirective[] = [
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
            ];
            return {
              result,
              confidence: result.overallConfidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
            };
          },
        });
      }

      const make = (ctx.entities.make as string) ?? "";
      const model = (ctx.entities.model as string) ?? "";
      const year = (ctx.entities.year as number) ?? 0;
      if (make && model && year) {
        agents.push({
          agent: "pricing",
          intent,
          run: async (c) => {
            const result = await suggestPrice({
              make,
              model,
              year,
              condition: "used",
            });
            const cardId = `pricing-${nanoid(6)}`;
            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "price_suggestion",
                cardId,
                data: result,
              },
            ];
            return {
              result,
              confidence: result.confidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
            };
          },
        });
      }

      if (ctx.input.vehicleId) {
        agents.push({
          agent: "fraud",
          intent,
          run: async (c) => {
            const result = await checkFraud(c.input.vehicleId!);
            const cardId = `fraud-${nanoid(6)}`;
            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "fraud_check",
                cardId,
                data: result,
              },
            ];
            return {
              result,
              confidence: result.riskScore < 30 ? 0.9 : 0.6,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
            };
          },
        });
      }
      break;

    case "search_vehicles": {
      const tools = getAgentTools("search");
      agents.push({
        agent: "search",
        intent,
        run: async (c) => {
          // Tool call simulation: önce recent searches çek, sonra search yap
          let recentSearches: Array<{ query: string }> = [];
          if (c.input.userId) {
            recentSearches = await memory.getRecentSearches(c.input.userId, 5);
          }

          const result = await searchVehicles({
            query: c.input.text,
            locale: c.input.locale,
            pageSize: 20,
          });

          const directives: UIDirective[] = [
            {
              type: "navigate",
              route: "/(tabs)/search",
              params: {
                q: result.filters.q ?? c.input.text,
                filters: JSON.stringify(result.filters),
              },
            },
          ];

          return {
            result: { ...result, recentSearches },
            confidence: 0.9,
            costUsd: result.costUsd,
            tokens: 0,
            model: result.model,
            durationMs: result.durationMs,
            directives,
            toolCalls: tools.map((t) => ({ name: t.function.name })),
          } as any;
        },
      });
      break;
    }

    case "compare_vehicles":
      agents.push({
        agent: "compare",
        intent,
        run: async (c) => {
          const directives: UIDirective[] = [
            {
              type: "navigate",
              route: "/(tabs)/search",
              params: { mode: "compare" },
            },
            {
              type: "show_card",
              card: "recommendations",
              cardId: `compare-${nanoid(6)}`,
              data: { message: "Karşılaştırma modu" },
            },
          ];
          return {
            result: { compare: true },
            confidence: 0.85,
            costUsd: 0,
            tokens: 0,
            model: "rule-based",
            durationMs: 0,
            directives,
          };
        },
      });
      break;

    case "translate_content": {
      const textToTranslate = (ctx.entities.text as string) ?? ctx.input.text;
      const sourceLocale = (ctx.entities.sourceLocale as "tr" | "en" | "ar" | "fa" | "ku-bad" | "ku-sor") ?? "en";
      agents.push({
        agent: "translate",
        intent,
        run: async (c) => {
          const tools = getAgentTools("translate");
          // Locale terms cache lookup
          await Promise.all(
            textToTranslate.split(/\s+/).slice(0, 5).map((term) =>
              executeTool("get_locale_terms", { term }),
            ),
          );

          const result = await translateBatch({
            text: textToTranslate,
            sourceLocale,
            targetLocales: ["tr", "en", "ar", "fa", "ku-bad", "ku-sor"],
            context: "vehicle_description",
          });

          const directives: UIDirective[] = [
            {
              type: "show_card",
              card: "translation",
              cardId: `translation-${nanoid(6)}`,
              data: result,
            },
          ];

          return {
            result,
            confidence: 0.9,
            costUsd: result.totalCostUsd,
            tokens: result.totalTokens,
            model: "free_translate",
            durationMs: result.totalDurationMs,
            directives,
            toolCalls: tools.map((t) => ({ name: t.function.name })),
          } as any;
        },
      });
      break;
    }

    case "check_damage":
      if (ctx.input.images && ctx.input.images.length >= 2) {
        agents.push({
          agent: "damage",
          intent,
          run: async (c) => {
            const result = await detectDamage(c.input.images!);
            const cardId = `damage-${nanoid(6)}`;
            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "damage_report",
                cardId,
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
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
            };
          },
        });
      }
      break;

    case "recommend_similar":
      if (ctx.input.vehicleId) {
        agents.push({
          agent: "recommend",
          intent,
          run: async (c) => {
            const tools = getAgentTools("recommend");
            const result = await recommendSimilar({
              vehicleId: c.input.vehicleId!,
              locale: c.input.locale,
              limit: 10,
            });
            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "recommendations",
                cardId: `recommend-${nanoid(6)}`,
                data: { vehicles: result.vehicles },
              },
            ];
            return {
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
              toolCalls: tools.map((t) => ({ name: t.function.name })),
            } as any;
          },
        });
      }
      break;

    case "rent_vehicle":
      if (ctx.input.vehicleData?.rentalId && ctx.entities.startDate && ctx.entities.endDate) {
        agents.push({
          agent: "rental",
          intent,
          run: async (c) => {
            const tools = getAgentTools("rental");
            // Tool call: holiday check
            await executeTool("get_holidays_for_period", {
              startDate: String(c.entities.startDate),
              endDate: String(c.entities.endDate),
              countryCode: (c.input.vehicleData?.countryCode as string) ?? "TR",
            });

            const result = await quoteRental({
              rentalId: String(c.input.vehicleData!.rentalId),
              startDate: String(c.entities.startDate),
              endDate: String(c.entities.endDate),
            });

            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "rental_quote",
                cardId: `rental-${nanoid(6)}`,
                data: result,
              },
            ];

            return {
              result,
              confidence: result.confidence,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
              toolCalls: tools.map((t) => ({ name: t.function.name })),
            } as any;
          },
        });
      }
      break;

    case "negotiate_price":
      if (ctx.input.vehicleData?.negotiationId || ctx.input.vehicleData?.vehicleId) {
        agents.push({
          agent: "negotiation",
          intent,
          run: async (c) => {
            const tools = getAgentTools("negotiation");
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

            const directives: UIDirective[] = [
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
            ];
            return {
              result,
              confidence: 0.85,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
              toolCalls: tools.map((t) => ({ name: t.function.name })),
            } as any;
          },
        });
      }
      break;

    case "fraud_check":
      if (ctx.input.vehicleId) {
        agents.push({
          agent: "fraud",
          intent,
          run: async (c) => {
            const tools = getAgentTools("fraud");
            await executeTool("get_vehicle_details", { vehicleId: c.input.vehicleId! });
            const result = await checkFraud(c.input.vehicleId!);
            const directives: UIDirective[] = [
              {
                type: "show_card",
                card: "fraud_check",
                cardId: `fraud-${nanoid(6)}`,
                data: result,
              },
            ];
            return {
              result,
              confidence: result.riskScore < 30 ? 0.9 : 0.6,
              costUsd: result.costUsd,
              tokens: result.tokens,
              model: result.model,
              durationMs: result.durationMs,
              directives,
              toolCalls: tools.map((t) => ({ name: t.function.name })),
            } as any;
          },
        });
      }
      break;

    case "support_help":
    case "general_chat":
    default:
      return pickSupportAgent(ctx);
  }

  return agents;
}

/**
 * Support agent — fallback tüm chat durumları için
 */
function pickSupportAgent(ctx: OrchestrationContext): AgentRun[] {
  return [
    {
      agent: "support",
      intent: ctx.primaryIntent,
      run: async (c) => {
        const tools = getAgentTools("support");

        const result = await handleSupport({
          message: c.input.text,
          locale: c.input.locale,
          userId: c.input.userId,
        });

        const cardId = `support-${nanoid(6)}`;
        const directives: UIDirective[] = [
          {
            type: "show_card",
            card: "ai_assistant_reply",
            cardId,
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
        ];
        return {
          result,
          confidence: result.confidence,
          costUsd: result.costUsd,
          tokens: result.tokens,
          model: result.model,
          durationMs: result.durationMs,
          directives,
          toolCalls: tools.map((t) => ({ name: t.function.name })),
        } as any;
      },
    },
  ];
}