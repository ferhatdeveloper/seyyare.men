// Agent client — orchestrator ile iletişim için yüksek seviye API

import { router } from "expo-router";
import { streamAgent, type AgentEvent, type StreamOptions } from "./sse";
import { useUIStore } from "./ui-store";
import { auth } from "./auth";

export interface AgentRequest {
  threadId?: string;
  text: string;
  images?: string[];
  locale: string;
  vehicleId?: string;
  vehicleData?: Record<string, unknown>;
}

export interface AgentRunHandle {
  abort: () => void;
  promise: Promise<void>;
}

export function runAgent(req: AgentRequest): AgentRunHandle {
  const store = useUIStore.getState();

  let abortFn: (() => void) | null = null;

  const promise = (async () => {
    const token = await auth.getAccessToken();

    const conn = streamAgent({
      ...req,
      token,
      onEvent: (event: AgentEvent) => {
        // Debug log
        if (__DEV__) {
          console.log("[agent]", event.type, event.agent);
        }

        switch (event.type) {
          case "directive":
            store.applyDirective(event.data);
            break;
          case "cost":
            // Maliyet tracking UI'da gösterilebilir
            break;
          case "token":
            // Stream token (chat UI için)
            break;
          case "intent":
            store.applyIntent((event.data as { intent?: string })?.intent ?? "");
            break;
          case "done":
            // Completion
            break;
          case "error":
            store.applyToast(
              (event.data as { error?: string })?.error ?? "Bilinmeyen hata",
              "error",
            );
            break;
          case "tool_call":
          case "tool_result":
          case "log":
            // İsteğe bağlı debug
            break;
        }
      },
      onError: (err) => {
        store.applyToast(`AI bağlantı hatası: ${err.message}`, "error");
      },
      onDone: () => {
        // SSE tamamlandı
      },
    });

    abortFn = conn.abort;
  })();

  return {
    abort: () => abortFn?.(),
    promise,
  };
}

/**
 * Convenience: ilan verme akışı
 */
export function startListingFlow(images: string[], locale: string): AgentRunHandle {
  return runAgent({
    text: "İlan vermek istiyorum",
    images,
    locale,
  });
}

/**
 * Convenience: doğal dil arama
 */
export function startSearchFlow(query: string, locale: string): AgentRunHandle {
  return runAgent({
    text: query,
    locale,
  });
}

/**
 * Convenience: çeviri isteği
 */
export function startTranslationFlow(text: string, locale: string): AgentRunHandle {
  return runAgent({
    text: `Çevir: ${text}`,
    locale,
  });
}