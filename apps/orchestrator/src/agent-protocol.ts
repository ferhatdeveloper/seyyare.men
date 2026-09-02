// Agent-to-Agent Protocol — Worker'lar arası mesajlaşma bus
// JSON-RPC benzeri, type-safe, request/response pattern

import { nanoid } from "nanoid";
import { redis } from "./lib/redis.js";

export type AgentMessageType =
  | "intent_recognized"
  | "task_dispatched"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "data_shared"
  | "request_help"
  | "broadcast";

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  from: string;
  to: string | "broadcast";
  data: Record<string, unknown>;
  timestamp: number;
  correlationId?: string; // İlişkili mesajları gruplamak için
}

interface ChannelContext {
  threadId: string;
  messages: AgentMessage[];
  plans: import("./task-planner.js").TaskPlan[];
  createdAt: number;
}

class AgentMessageBus {
  private channels = new Map<string, ChannelContext>();

  /**
   * Thread için kanal oluştur
   */
  async createChannel(threadId: string): Promise<void> {
    if (this.channels.has(threadId)) return;
    this.channels.set(threadId, {
      threadId,
      messages: [],
      plans: [],
      createdAt: Date.now(),
    });

    // Redis'e de kopyala (cluster support)
    await redis.client.set(`agent-bus:${threadId}`, JSON.stringify([]), "EX", 60 * 60);
  }

  /**
   * Mesaj yayınla
   */
  async publish(threadId: string, msg: Omit<AgentMessage, "id" | "timestamp">): Promise<AgentMessage> {
    if (!this.channels.has(threadId)) {
      await this.createChannel(threadId);
    }

    const fullMsg: AgentMessage = {
      id: nanoid(),
      ...msg,
      timestamp: Date.now(),
    };

    const ctx = this.channels.get(threadId)!;
    ctx.messages.push(fullMsg);

    // Son 100 mesajı Redis'te tut (observability)
    const lastMessages = ctx.messages.slice(-100);
    await redis.client.set(
      `agent-bus:${threadId}`,
      JSON.stringify(lastMessages),
      "EX",
      60 * 60,
    );

    return fullMsg;
  }

  /**
   * Channel'dan tüm mesajları al
   */
  async getChannel(threadId: string): Promise<ChannelContext | null> {
    // Önce memory'den
    const memoryCtx = this.channels.get(threadId);
    if (memoryCtx) return memoryCtx;

    // Redis'ten yükle
    const cached = await redis.client.get(`agent-bus:${threadId}`);
    if (cached) {
      try {
        const messages = JSON.parse(cached) as AgentMessage[];
        const ctx: ChannelContext = {
          threadId,
          messages,
          plans: [],
          createdAt: Date.now(),
        };
        this.channels.set(threadId, ctx);
        return ctx;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Channel'ı sil
   */
  async deleteChannel(threadId: string): Promise<void> {
    this.channels.delete(threadId);
    await redis.client.del(`agent-bus:${threadId}`);
  }

  /**
   * Request/response pattern için yardımcı
   */
  async request(opts: {
    threadId: string;
    from: string;
    to: string;
    data: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<AgentMessage | null> {
    const correlationId = nanoid();
    const requestMsg = await this.publish(opts.threadId, {
      type: "request_help",
      from: opts.from,
      to: opts.to,
      data: opts.data,
      correlationId,
    });

    // Production: response channel'ını dinle
    // Şimdilik: timeout ile bekle
    const timeout = opts.timeoutMs ?? 5000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const ctx = this.channels.get(opts.threadId);
      const response = ctx?.messages.find(
        (m) => m.correlationId === correlationId && m.type === "task_completed",
      );
      if (response) return response;
      await sleep(50);
    }

    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const agentMessageBus = new AgentMessageBus();