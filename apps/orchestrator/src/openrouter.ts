// OpenRouter model routing — tüm agent'lar için paylaşılan model registry
// Tiered routing: ucuz → orta → pahalı

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!API_KEY) {
  console.warn("[orchestrator] OPENROUTER_API_KEY missing — AI features disabled");
}

export type ModelTier = "free" | "cheap" | "premium" | "elite";

export const MODELS = {
  // Tier 1: Free (Llama, Gemma) — development / yüksek hacim
  free_translate: "meta-llama/llama-3.3-70b-instruct:free",
  free_ocr: "google/gemma-3-12b-it:free",

  // Tier 2: Cheap (Gemini Flash, Haiku) — production default
  cheap_intent: "google/gemini-2.5-flash",
  cheap_search: "anthropic/claude-3-5-haiku",
  cheap_pricing: "anthropic/claude-3-5-haiku",
  cheap_description: "openai/gpt-4o-mini",
  cheap_recommend: "google/gemini-2.5-flash",
  cheap_triage: "anthropic/claude-3-5-haiku",
  cheap_vision: "google/gemini-2.5-flash",

  // Tier 3: Premium (Sonnet, GPT-4o) — kalite kritik
  premium_vision: "openai/gpt-4o",
  premium_damage: "anthropic/claude-3.5-sonnet",
  premium_negotiation: "anthropic/claude-3.5-sonnet",
  premium_assistant: "anthropic/claude-3.5-sonnet",
  premium_rental: "anthropic/claude-3.5-sonnet",
  premium_support: "anthropic/claude-3.5-sonnet",
  premium_fraud: "anthropic/claude-3.5-sonnet",

  // Tier 4: Elite (Opus) — sadece escalation
  elite_escape: "anthropic/claude-3-opus",
} as const;

export const TIER_OF: Record<string, ModelTier> = {
  [MODELS.free_translate]: "free",
  [MODELS.free_ocr]: "free",
  [MODELS.cheap_intent]: "cheap",
  [MODELS.cheap_search]: "cheap",
  [MODELS.cheap_pricing]: "cheap",
  [MODELS.cheap_description]: "cheap",
  [MODELS.cheap_recommend]: "cheap",
  [MODELS.cheap_triage]: "cheap",
  [MODELS.cheap_vision]: "cheap",
  [MODELS.premium_vision]: "premium",
  [MODELS.premium_damage]: "premium",
  [MODELS.premium_negotiation]: "premium",
  [MODELS.premium_assistant]: "premium",
  [MODELS.premium_rental]: "premium",
  [MODELS.premium_support]: "premium",
  [MODELS.premium_fraud]: "premium",
  [MODELS.elite_escape]: "elite",
};

const PRICING: Record<string, { input: number; output: number }> = {
  // per 1M tokens (USD)
  [MODELS.free_translate]: { input: 0, output: 0 },
  [MODELS.free_ocr]: { input: 0, output: 0 },
  [MODELS.cheap_intent]: { input: 0.075, output: 0.3 },
  [MODELS.cheap_search]: { input: 0.8, output: 4 },
  [MODELS.cheap_pricing]: { input: 0.8, output: 4 },
  [MODELS.cheap_description]: { input: 0.15, output: 0.6 },
  [MODELS.cheap_recommend]: { input: 0.075, output: 0.3 },
  [MODELS.cheap_triage]: { input: 0.8, output: 4 },
  [MODELS.cheap_vision]: { input: 0.075, output: 0.3 },
  [MODELS.premium_vision]: { input: 2.5, output: 10 },
  [MODELS.premium_damage]: { input: 3, output: 15 },
  [MODELS.premium_negotiation]: { input: 3, output: 15 },
  [MODELS.premium_assistant]: { input: 3, output: 15 },
  [MODELS.premium_rental]: { input: 3, output: 15 },
  [MODELS.premium_support]: { input: 3, output: 15 },
  [MODELS.premium_fraud]: { input: 3, output: 15 },
  [MODELS.elite_escape]: { input: 15, output: 75 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model] ?? { input: 1, output: 3 };
  return (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string; detail?: "auto" | "low" | "high" } }>;
  tool_call_id?: string;
  name?: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  signal?: AbortSignal;
}

export interface ChatResult {
  id: string;
  model: string;
  content: string;
  finishReason: string | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUsd: number;
  durationMs: number;
  tier: ModelTier;
}

export const openrouter = {
  isConfigured(): boolean {
    return !!API_KEY;
  },

  async chat(opts: ChatOptions): Promise<ChatResult> {
    if (!API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const start = Date.now();
    const body: Record<string, unknown> = {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.topP !== undefined) body.top_p = opts.topP;
    if (opts.stop) body.stop = opts.stop;
    if (opts.responseFormat) body.response_format = opts.responseFormat;

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://seyyare.men",
        "X-Title": "Seyyare.men Orchestrator",
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      id: string;
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;

    return {
      id: data.id,
      model: data.model,
      content: data.choices[0]?.message?.content ?? "",
      finishReason: data.choices[0]?.finish_reason ?? null,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
      },
      costUsd: estimateCost(data.model, promptTokens, completionTokens),
      durationMs: Date.now() - start,
      tier: TIER_OF[data.model] ?? "cheap",
    };
  },

  /**
   * Confidence-gated escalation: basit → premium
   * Eğer ilk tier sonucu güvenli değilse, daha güçlü modele geç.
   */
  async withEscalation<T>(
    runTier: (model: string) => Promise<{ result: T; confidence: number; tokens: number; costUsd: number; model: string; durationMs: number }>,
    tiers: Array<{ model: string; threshold: number }>,
  ): Promise<{ result: T; model: string; tokens: number; costUsd: number; durationMs: number; tier: ModelTier }> {
    let accumulatedTokens = 0;
    let accumulatedCost = 0;
    let accumulatedDuration = 0;
    let lastResult: { result: T; confidence: number } | null = null;
    let lastModel = "";

    for (const tier of tiers) {
      const r = await runTier(tier.model);
      accumulatedTokens += r.tokens;
      accumulatedCost += r.costUsd;
      accumulatedDuration += r.durationMs;
      lastResult = { result: r.result, confidence: r.confidence };
      lastModel = r.model;

      if (r.confidence >= tier.threshold) break;
    }

    if (!lastResult) throw new Error("no tier produced a result");

    return {
      result: lastResult.result,
      model: lastModel,
      tokens: accumulatedTokens,
      costUsd: accumulatedCost,
      durationMs: accumulatedDuration,
      tier: TIER_OF[lastModel] ?? "cheap",
    };
  },
};