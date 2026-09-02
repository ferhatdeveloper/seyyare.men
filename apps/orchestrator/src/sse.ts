// SSE Streaming — Fastify reply ile Server-Sent Events
// Mobil taraf her event'i JSON.parse edip Zustand store'a uygular

import type { FastifyReply } from "fastify";
import type { AgentEvent } from "./ui-directive.js";

export interface SSEWriter {
  send(event: Omit<AgentEvent, "ts">): void;
  close(): void;
  closed: boolean;
}

export function createSSE(reply: FastifyReply): SSEWriter {
  const writer: SSEWriter = {
    closed: false,
    send(event) {
      if (this.closed) return;
      const payload: AgentEvent = { ...event, ts: Date.now() };
      const data = JSON.stringify(payload);
      // SSE format: event: <type>\ndata: <json>\n\n
      reply.raw.write(`event: ${event.type}\n`);
      reply.raw.write(`data: ${data}\n\n`);
    },
    close() {
      if (this.closed) return;
      this.closed = true;
      reply.raw.end();
    },
  };

  // SSE header'larını ayarla
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("X-Accel-Buffering", "no");
  reply.raw.setHeader("Access-Control-Allow-Origin", "*");
  reply.raw.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Last-Event-ID");

  // Flush headers
  reply.raw.flushHeaders();

  // Keepalive ping (15 saniyede bir)
  const pingInterval = setInterval(() => {
    if (writer.closed) {
      clearInterval(pingInterval);
      return;
    }
    reply.raw.write(`: ping\n\n`);
  }, 15_000);

  // Cleanup on close
  reply.raw.on("close", () => {
    clearInterval(pingInterval);
    writer.closed = true;
  });

  // Initial comment (browsers ignore)
  reply.raw.write(`: connected\n\n`);

  return writer;
}

export function sendDirective(
  writer: SSEWriter,
  agent: string,
  threadId: string,
  directive: unknown,
) {
  writer.send({
    type: "directive",
    agent,
    threadId,
    data: directive,
  });
}

export function sendCost(
  writer: SSEWriter,
  agent: string,
  threadId: string,
  cost: { tokens: number; costUsd: number; model: string },
) {
  writer.send({
    type: "cost",
    agent,
    threadId,
    data: cost,
  });
}

export function sendError(
  writer: SSEWriter,
  agent: string,
  threadId: string,
  error: string,
) {
  writer.send({
    type: "error",
    agent,
    threadId,
    data: { error },
  });
}

export function sendDone(writer: SSEWriter, threadId: string) {
  writer.send({
    type: "done",
    agent: "orchestrator",
    threadId,
    data: { status: "ok" },
  });
  writer.close();
}