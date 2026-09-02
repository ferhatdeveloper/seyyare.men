// OpenRouter client — akıllı model routing + cost optimization
// Faz 2'de tam implementasyon (vision, translate, etc.)

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!API_KEY) {
  console.warn("[openrouter] OPENROUTER_API_KEY missing — AI features disabled");
}

export const openrouter = {
  isConfigured(): boolean {
    return !!API_KEY;
  },

  routes(): Record<string, { model: string; purpose: string }> {
    return {
      vision: {
        model: "google/gemini-2.5-flash",
        purpose: "Araç görsel tanıma (marka/model/yıl)",
      },
      pricePredict: {
        model: "openai/gpt-4o-mini",
        purpose: "Fiyat tahmini (structured output)",
      },
      damageDetect: {
        model: "anthropic/claude-3.5-sonnet",
        purpose: "Hasar tespiti (yüksek doğruluk)",
      },
      translate: {
        model: "meta-llama/llama-3.3-70b-instruct:free",
        purpose: "Çoklu dil çevirisi (ücretsiz)",
      },
      assistant: {
        model: "anthropic/claude-3.5-sonnet",
        purpose: "AI asistan (RAG destekli)",
      },
      description: {
        model: "openai/gpt-4o-mini",
        purpose: "İlan açıklaması üretimi",
      },
    };
  },

  async chat(opts: {
    model: string;
    messages: Array<{ role: string; content: unknown }>;
    responseFormat?: { type: "json_object" };
    temperature?: number;
  }): Promise<unknown> {
    if (!API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://seyyare.men",
        "X-Title": "Seyyare.men",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.3,
        ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${text}`);
    }
    return res.json();
  },
};