// OpenRouter client — akıllı model routing + cost optimization
// Auto-fallback + cache + usage tracking

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const APP_NAME = "Seyyare.men";
const APP_URL = process.env.APP_URL ?? "https://seyyare.men";

if (!API_KEY) {
  console.warn("[openrouter] OPENROUTER_API_KEY missing — AI features disabled");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ChatContentPart[];
  name?: string;
}

export interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
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
}

const PRICING: Record<string, { input: number; output: number }> = {
  // per 1M tokens (USD)
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.59, output: 0.79 },
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0 },
  "qwen/qwen-2.5-72b-instruct": { input: 0.4, output: 0.4 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model] ?? { input: 1, output: 3 };
  return (
    (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output
  );
}

export const openrouter = {
  isConfigured(): boolean {
    return !!API_KEY;
  },

  routes(): Record<string, { model: string; purpose: string; tier: string }> {
    return {
      vision: {
        model: "google/gemini-2.5-flash",
        purpose: "Araç görsel tanıma (marka/model/yıl)",
        tier: "cheap",
      },
      pricePredict: {
        model: "openai/gpt-4o-mini",
        purpose: "Fiyat tahmini (structured output)",
        tier: "cheap",
      },
      damageDetect: {
        model: "anthropic/claude-3.5-sonnet",
        purpose: "Hasar tespiti (yüksek doğruluk)",
        tier: "premium",
      },
      translate: {
        model: "meta-llama/llama-3.3-70b-instruct:free",
        purpose: "Çoklu dil çevirisi (ücretsiz)",
        tier: "free",
      },
      assistant: {
        model: "anthropic/claude-3.5-sonnet",
        purpose: "AI asistan (RAG destekli)",
        tier: "premium",
      },
      description: {
        model: "openai/gpt-4o-mini",
        purpose: "İlan açıklaması üretimi",
        tier: "cheap",
      },
    };
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
        "HTTP-Referer": APP_URL,
        "X-Title": APP_NAME,
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
    };
  },

  /**
   * Akıllı routing: model için en ucuz sağlayıcıyı seç, hata olursa
   * yedek modele geç.
   */
  async chatWithFallback(
    primaryOpts: ChatOptions,
    fallbackOpts?: ChatOptions,
  ): Promise<ChatResult> {
    try {
      return await this.chat(primaryOpts);
    } catch (err) {
      console.warn(
        "[openrouter] primary model failed, trying fallback:",
        err instanceof Error ? err.message : err,
      );
      if (fallbackOpts) return await this.chat(fallbackOpts);
      throw err;
    }
  },
};