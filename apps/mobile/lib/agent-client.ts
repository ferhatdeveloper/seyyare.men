// Agent client — orchestrator ile iletişim için yüksek seviye API

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
        // Apply event to UI store (handles directive, token, intent, error)
        store.applyAgentEvent({
          type: event.type,
          agent: event.agent,
          data: event.data,
        });
      },
      onError: (err) => {
        store.applyToast(`AI bağlantı hatası: ${err.message}`, "error", 4000);
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
 * Convenience: ilan verme akışı (fotoğraflar + text → vision + pricing + fraud)
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

/**
 * Convenience: AI Asistan sohbet (streaming)
 */
export function startAssistantChat(message: string, locale: string, threadId?: string): AgentRunHandle {
  return runAgent({
    text: message,
    locale,
    threadId,
  });
}

/**
 * Convenience: hasar tespiti
 */
export function startDamageDetection(images: string[], locale: string): AgentRunHandle {
  return runAgent({
    text: "Hasar tespiti yap",
    images,
    locale,
  });
}

/**
 * Convenience: fiyat önerisi
 */
export function getPriceSuggestion(vehicle: {
  make: string;
  model: string;
  year: number;
  mileageKm?: number;
  condition?: string;
  countryCode?: string;
  locale: string;
}): AgentRunHandle {
  return runAgent({
    text: `Fiyat öner: ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
    locale: vehicle.locale,
    vehicleData: vehicle as unknown as Record<string, unknown>,
  });
}

/**
 * Convenience: pazarlık turu
 */
export function sendNegotiationOffer(opts: {
  negotiationId: string;
  vehicleId: string;
  action: "start" | "counter" | "accept" | "reject";
  offerAmount?: number;
  buyerMaxOffer?: number;
  locale: string;
}): AgentRunHandle {
  return runAgent({
    text: `Negotiation ${opts.action}`,
    locale: opts.locale,
    vehicleId: opts.vehicleId,
    vehicleData: {
      negotiationId: opts.negotiationId,
      vehicleId: opts.vehicleId,
      action: opts.action,
      offerAmount: opts.offerAmount,
      buyerMaxOffer: opts.buyerMaxOffer,
    },
  });
}