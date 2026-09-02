// SSE Consumer — orchestrator'dan gelen event'leri dinle
// react-native-sse paketi yerine native fetch ile ReadableStream kullanıyoruz

import { orchestrator } from "./clients";

export interface AgentEvent {
  type: "intent" | "directive" | "tool_call" | "tool_result" | "token" | "log" | "cost" | "done" | "error";
  agent: string;
  threadId: string;
  data: unknown;
  ts: number;
}

export interface StreamOptions {
  threadId?: string;
  text: string;
  images?: string[];
  locale: string;
  vehicleId?: string;
  vehicleData?: Record<string, unknown>;
  token?: string | null;
  onEvent: (event: AgentEvent) => void;
  onError?: (err: Error) => void;
  onDone?: () => void;
}

interface SSEConnection {
  abort: () => void;
}

/**
 * SSE stream başlatır. Recursive reconnect + exponential backoff.
 */
export function streamAgent(opts: StreamOptions): SSEConnection {
  let aborted = false;
  let attempt = 0;

  const connect = async () => {
    if (aborted) return;

    try {
      const body = JSON.stringify({
        threadId: opts.threadId,
        text: opts.text,
        images: opts.images,
        locale: opts.locale,
        vehicleId: opts.vehicleId,
        vehicleData: opts.vehicleData,
      });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

      const res = await fetch(`${orchestrator.url}/agents/run`, {
        method: "POST",
        headers,
        body,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE connection failed: ${res.status}`);
      }

      attempt = 0; // başarılı bağlantı

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE mesajları \n\n ile biter
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawMessage = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const event = parseSSEMessage(rawMessage);
          if (event) {
            opts.onEvent(event);
            if (event.type === "done") {
              opts.onDone?.();
              return;
            }
            if (event.type === "error") {
              throw new Error((event.data as { error?: string })?.error ?? "unknown_error");
            }
          }

          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      if (aborted) return;
      attempt++;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      console.warn(`[sse] connection error, retry in ${delay}ms:`, err);
      opts.onError?.(err instanceof Error ? err : new Error("sse_error"));
      setTimeout(connect, delay);
    }
  };

  void connect();

  return {
    abort: () => {
      aborted = true;
    },
  };
}

interface ParsedSSE {
  event: string;
  data: string;
}

function parseSSEMessage(raw: string): AgentEvent | null {
  const lines = raw.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    } else if (line.startsWith(":")) {
      // Yorum satırı, skip
    }
  }

  if (!data || event === "message") return null;

  try {
    const parsed = JSON.parse(data) as AgentEvent;
    if (!parsed.type) return null;
    return parsed;
  } catch {
    return null;
  }
}