// SSE Token Streaming — gerçek zamanlı UI rendering için
// Her agent token token üretir, SSE üzerinden stream eder, mobil smooth animation yapar

import type { SSEWriter } from "../sse.js";

export interface StreamConfig {
  writer: SSEWriter;
  threadId: string;
  messageId: string;
  role: "assistant" | "system";
  chunkDelayMs?: number; // Animasyon için throttle (default 20ms)
}

/**
 * Token stream başlat
 * OpenRouter streaming response'tan gelen her chunk'u SSE event'ine çevirir
 */
export async function streamTokens(opts: {
  config: StreamConfig;
  generator: AsyncIterable<string> | AsyncGenerator<string>;
}): Promise<void> {
  const { config, generator } = opts;
  const delay = config.chunkDelayMs ?? 20;
  let buffer = "";

  try {
    for await (const chunk of generator) {
      buffer += chunk;

      // Her chunk için token event gönder
      config.writer.send({
        type: "token",
        agent: config.role,
        threadId: config.threadId,
        data: {
          messageId: config.messageId,
          content: chunk,
          fullText: buffer,
        },
      });

      // UI animation için throttle
      if (delay > 0) await sleep(delay);
    }

    // Tamamlandı: full stream_message event gönder
    config.writer.send({
      type: "directive",
      agent: config.role,
      threadId: config.threadId,
      data: {
        type: "stream_message",
        messageId: config.messageId,
        role: config.role,
        content: buffer,
        delta: false,
        finishReason: "stop",
      },
    });
  } catch (err) {
    config.writer.send({
      type: "error",
      agent: config.role,
      threadId: config.threadId,
      data: {
        error: err instanceof Error ? err.message : "stream_failed",
      },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OpenRouter streaming chat completion → SSE token event
 */
export async function streamOpenRouterChat(opts: {
  config: StreamConfig;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ costUsd: number; tokens: number; model: string }> {
  const API_KEY = process.env.OPENROUTER_API_KEY ?? "";
  const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

  const start = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "https://seyyare.men",
      "X-Title": "Seyyare.men Orchestrator",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 500,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`stream_openrouter_failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let costUsd = 0;
  let tokens = 0;
  let modelUsed = opts.model;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE: "data: {json}\n\n"
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:") || line === "data: [DONE]") continue;
        const json = line.slice(5).trim();
        try {
          const event = JSON.parse(json) as {
            model?: string;
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            usage?: { total_tokens?: number };
          };

          if (event.model) modelUsed = event.model;

          const content = event.choices?.[0]?.delta?.content;
          if (content) {
            opts.config.writer.send({
              type: "token",
              agent: "stream",
              threadId: opts.config.threadId,
              data: {
                messageId: opts.config.messageId,
                content,
                role: opts.config.role,
              },
            });
          }

          if (event.usage?.total_tokens) {
            tokens = event.usage.total_tokens;
          }
        } catch {
          // JSON parse hatası — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  costUsd = 0; // Pricing lookup'ı ayrı bir yerden
  const durationMs = Date.now() - start;

  // Final message event
  opts.config.writer.send({
    type: "directive",
    agent: "stream",
    threadId: opts.config.threadId,
    data: {
      type: "stream_message",
      messageId: opts.config.messageId,
      role: opts.config.role,
      content: "(stream tamamlandı)",
      delta: false,
      finishReason: "stop",
      tokens,
      costUsd,
      durationMs,
    },
  });

  return { costUsd, tokens, model: modelUsed };
}

/**
 * Backpressure-safe stream buffer (mobilde çok hızlı token gelirse throttle)
 */
export class StreamBuffer {
  private chunks: string[] = [];
  private listeners: Array<(chunk: string) => void> = [];
  private lastEmitTime = Date.now();
  private readonly minIntervalMs: number;

  constructor(minIntervalMs: number = 16) {
    this.minIntervalMs = minIntervalMs;
  }

  push(chunk: string): void {
    const now = Date.now();
    if (now - this.lastEmitTime >= this.minIntervalMs) {
      this.flush();
      this.chunks.push(chunk);
      this.lastEmitTime = now;
    } else {
      this.chunks.push(chunk);
    }
  }

  flush(): void {
    if (this.chunks.length === 0) return;
    const combined = this.chunks.join("");
    this.chunks = [];
    this.listeners.forEach((l) => l(combined));
  }

  onChunk(listener: (chunk: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}