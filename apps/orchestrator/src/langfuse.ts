// Langfuse entegrasyonu — her agent call'ı observe etmek için
// Open source LLM observability platformu.
// https://langfuse.com

import { nanoid } from "nanoid";
import { redis } from "./lib/redis.js";

interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string; // default https://cloud.langfuse.com
  enabled: boolean;
  flushIntervalMs: number;
}

const DEFAULT_CONFIG: LangfuseConfig = {
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com",
  enabled: !!process.env.LANGFUSE_PUBLIC_KEY && !!process.env.LANGFUSE_SECRET_KEY,
  flushIntervalMs: Number(process.env.LANGFUSE_FLUSH_INTERVAL_MS ?? 5000),
};

export interface TraceEvent {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  type: "span" | "generation" | "event";
  startTime: number;
  endTime?: number;
  // For "generation" type
  model?: string;
  input?: unknown;
  output?: unknown;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
  level?: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  statusMessage?: string;
}

interface Trace {
  id: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  startTime: number;
  events: TraceEvent[];
}

/**
 * Langfuse client — her agent call'ı trace eder.
 * Langfuse yoksa fallback: trace'ler Redis'te tutulur (24h TTL).
 */
class LangfuseClient {
  private config: LangfuseConfig;
  private pendingEvents: TraceEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private activeTraces = new Map<string, Trace>();

  constructor(config: Partial<LangfuseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Yeni trace oluştur (thread başına)
   */
  startTrace(opts: {
    name: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }): { traceId: string } {
    const traceId = nanoid(24);
    this.activeTraces.set(traceId, {
      id: traceId,
      userId: opts.userId,
      sessionId: opts.sessionId,
      metadata: opts.metadata,
      startTime: Date.now(),
      events: [],
    });
    return { traceId };
  }

  /**
   * Span oluştur (alt ölçüm noktası)
   */
  startSpan(opts: {
    traceId: string;
    name: string;
    parentSpanId?: string;
    metadata?: Record<string, unknown>;
  }): { spanId: string } {
    const spanId = nanoid(16);
    this.addEvent({
      id: nanoid(),
      traceId: opts.traceId,
      spanId,
      parentSpanId: opts.parentSpanId,
      name: opts.name,
      type: "span",
      startTime: Date.now(),
      metadata: opts.metadata,
    });
    return { spanId };
  }

  /**
   * LLM generation'ı trace et (agent call'ları için)
   */
  trackGeneration(opts: {
    traceId: string;
    spanId?: string;
    name: string;
    model: string;
    input: unknown;
    output: unknown;
    promptTokens?: number;
    completionTokens?: number;
    costUsd?: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
    level?: TraceEvent["level"];
    error?: string;
  }): void {
    this.addEvent({
      id: nanoid(),
      traceId: opts.traceId,
      spanId: opts.spanId ?? nanoid(16),
      name: opts.name,
      type: "generation",
      startTime: Date.now() - (opts.durationMs ?? 0),
      endTime: Date.now(),
      model: opts.model,
      input: opts.input,
      output: opts.output,
      promptTokens: opts.promptTokens,
      completionTokens: opts.completionTokens,
      totalTokens: (opts.promptTokens ?? 0) + (opts.completionTokens ?? 0),
      costUsd: opts.costUsd,
      metadata: opts.metadata,
      level: opts.error ? "ERROR" : (opts.level ?? "INFO"),
      statusMessage: opts.error,
    });
  }

  /**
   * Event logla (bilgi, hata, vb.)
   */
  trackEvent(opts: {
    traceId: string;
    spanId?: string;
    name: string;
    metadata?: Record<string, unknown>;
    level?: TraceEvent["level"];
    statusMessage?: string;
  }): void {
    this.addEvent({
      id: nanoid(),
      traceId: opts.traceId,
      spanId: opts.spanId ?? nanoid(16),
      name: opts.name,
      type: "event",
      startTime: Date.now(),
      metadata: opts.metadata,
      level: opts.level,
      statusMessage: opts.statusMessage,
    });
  }

  /**
   * Async span'i sonlandır
   */
  endSpan(spanId: string, metadata?: Record<string, unknown>): void {
    const event = this.pendingEvents.find((e) => e.spanId === spanId && !e.endTime);
    if (event) {
      event.endTime = Date.now();
      if (metadata) event.metadata = { ...event.metadata, ...metadata };
    }
  }

  private addEvent(event: TraceEvent): void {
    if (this.config.enabled) {
      this.pendingEvents.push(event);
    } else {
      // Fallback: Redis'e kaydet (development/debug için)
      this.persistToRedis(event).catch(() => {});
    }
  }

  private async persistToRedis(event: TraceEvent): Promise<void> {
    const key = `trace:${event.traceId}`;
    const existing = (await redis.get<TraceEvent[]>(key)) ?? [];
    existing.push(event);
    // 24 saat TTL, max 1000 event
    const trimmed = existing.slice(-1000);
    await redis.set(key, trimmed, 60 * 60 * 24);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Pending event'leri Langfuse'a gönder
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.pendingEvents.length === 0) return;

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    // Batch ingest endpoint
    const batchIngestEndpoint = `${this.config.baseUrl}/api/public/ingestion`;

    // Langfuse batch format: { batch: [{ id, type, body, timestamp }] }
    const batch = events.map((e) => {
      if (e.type === "generation") {
        return {
          id: e.id,
          type: "generation-create",
          timestamp: new Date(e.startTime).toISOString(),
          body: {
            id: e.id,
            traceId: e.traceId,
            parentObservationId: e.parentSpanId,
            name: e.name,
            model: e.model,
            startTime: new Date(e.startTime).toISOString(),
            endTime: e.endTime ? new Date(e.endTime).toISOString() : undefined,
            input: e.input,
            output: e.output,
            usage: {
              promptTokens: e.promptTokens ?? 0,
              completionTokens: e.completionTokens ?? 0,
              totalTokens: e.totalTokens ?? 0,
            },
            metadata: {
              ...e.metadata,
              cost_usd: e.costUsd,
            },
            level: e.level ?? "INFO",
            statusMessage: e.statusMessage,
          },
        };
      }
      // span veya event
      return {
        id: e.id,
        type: `${e.type}-create`,
        timestamp: new Date(e.startTime).toISOString(),
        body: {
          id: e.id,
          traceId: e.traceId,
          parentObservationId: e.parentSpanId,
          name: e.name,
          startTime: new Date(e.startTime).toISOString(),
          endTime: e.endTime ? new Date(e.endTime).toISOString() : undefined,
          metadata: e.metadata,
          level: e.level ?? "INFO",
          statusMessage: e.statusMessage,
        },
      };
    });

    try {
      const auth = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString("base64");
      const res = await fetch(batchIngestEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ batch }),
      });

      if (!res.ok) {
        // Hata durumunda Redis'e kaydet (retry için)
        console.warn(`[langfuse] flush failed: ${res.status}, persisting to Redis`);
        for (const event of events) {
          await this.persistToRedis(event);
        }
      }
    } catch (err) {
      console.warn("[langfuse] flush error:", err);
      for (const event of events) {
        await this.persistToRedis(event);
      }
    }
  }

  /**
   * Trace'leri getir (development için)
   */
  async getTrace(traceId: string): Promise<Trace | null> {
    const events = await redis.get<TraceEvent[]>(`trace:${traceId}`);
    if (!events) return null;

    const sorted = events.sort((a, b) => a.startTime - b.startTime);
    return {
      id: traceId,
      startTime: sorted[0]?.startTime ?? Date.now(),
      events: sorted,
    };
  }

  async getRecentTraces(limit: number = 50): Promise<Array<{ id: string; eventCount: number; startTime: number }>> {
    const keys = await redis.client.keys("trace:*");
    const summaries: Array<{ id: string; eventCount: number; startTime: number }> = [];

    for (const key of keys.slice(0, limit)) {
      const id = key.replace("trace:", "");
      const events = (await redis.get<TraceEvent[]>(key)) ?? [];
      if (events.length > 0) {
        summaries.push({
          id,
          eventCount: events.length,
          startTime: events[0].startTime,
        });
      }
    }

    return summaries.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Cleanup — uygulama kapanırken
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

export const langfuse = new LangfuseClient();
export type { LangfuseClient, Trace, TraceEvent };