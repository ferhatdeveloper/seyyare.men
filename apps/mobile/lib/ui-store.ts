// UI Store — orchestrator'dan gelen directive'leri Zustand state'ine uygular
// UI bileşenleri bu store'u useStore ile dinler, otomatik güncellenir

import { create } from "zustand";

export type CardType =
  | "price_suggestion"
  | "damage_report"
  | "fraud_check"
  | "translation"
  | "recommendations"
  | "negotiation_offer"
  | "ai_assistant_reply"
  | "rental_quote"
  | "recognition_result"
  | "validation_warning"
  | "compare";

export interface ToastMessage {
  id: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
  durationMs: number;
  createdAt: number;
}

export interface FormAutofill {
  formId: string;
  fields: Record<string, unknown>;
  appliedAt: number;
}

export interface LoadingState {
  agent: string;
  message: string | undefined;
  startedAt: number;
}

export interface StreamMessage {
  messageId: string;
  role: "assistant" | "system";
  content: string;
  isStreaming: boolean;
  finishReason?: string;
  tokens?: number;
  costUsd?: number;
  durationMs?: number;
  startedAt: number;
}

interface UIStore {
  // Cards
  cards: Record<string, { type: CardType; data: unknown; createdAt: number }>;
  // Form auto-fill state
  forms: Record<string, FormAutofill>;
  // Active loading
  loading: Record<string, LoadingState>;
  // Toasts
  toasts: ToastMessage[];
  // Stream messages (chat için — accumulation)
  streamMessages: Record<string, StreamMessage>;
  // Intent debug
  intent: { primary: string; secondary: string[]; confidence: number } | null;
  // Last error
  lastError: string | null;

  applyDirective: (directive: unknown) => void;
  applyAgentEvent: (event: { type: string; agent: string; data: unknown }) => void;
  applyTokenChunk: (messageId: string, role: "assistant" | "system", chunk: string, fullText: string) => void;
  applyStreamComplete: (messageId: string, finishReason: string, tokens?: number) => void;
  applyFormAutofill: (formId: string, fields: Record<string, unknown>) => void;
  applyShowCard: (cardId: string, card: CardType, data: unknown) => void;
  applyHideCard: (cardId: string) => void;
  applyShowLoading: (agent: string, message?: string) => void;
  applyHideLoading: (agent: string) => void;
  applyToast: (message: string, level: ToastMessage["level"], durationMs?: number) => void;
  applyNavigation: (route: string, params?: Record<string, string>) => void;
  applyIntent: (primary: string, secondary: string[], confidence: number) => void;
  dismissToast: (id: string) => void;
  clear: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  cards: {},
  forms: {},
  loading: {},
  toasts: [],
  streamMessages: {},
  intent: null,
  lastError: null,

  applyDirective: (directive) => {
    const d = directive as { type: string; [key: string]: unknown };
    switch (d.type) {
      case "form_autofill":
        get().applyFormAutofill(d.formId as string, d.fields as Record<string, unknown>);
        break;
      case "show_card":
        get().applyShowCard(d.cardId as string, d.card as CardType, d.data);
        break;
      case "hide_card":
        get().applyHideCard(d.cardId as string);
        break;
      case "show_loading":
        get().applyShowLoading(d.agent as string, d.message as string | undefined);
        break;
      case "hide_loading":
        get().applyHideLoading(d.agent as string);
        break;
      case "toast":
        get().applyToast(d.message as string, d.level as ToastMessage["level"], d.durationMs as number | undefined);
        break;
      case "navigate":
        get().applyNavigation(d.route as string, d.params as Record<string, string> | undefined);
        break;
      case "stream_message":
        get().applyStreamComplete(
          (d.messageId as string) ?? nanoid(),
          (d.role as "assistant" | "system") ?? "assistant",
          d.content as string,
          d.finishReason as string,
          d.tokens as number | undefined,
        );
        break;
      case "validation":
      case "human_in_loop_required":
        // Gelecekte: validation form'a bağlanır
        break;
    }
  },

  applyAgentEvent: (event) => {
    if (event.type === "directive") {
      get().applyDirective(event.data);
    } else if (event.type === "token") {
      const data = event.data as { messageId: string; content: string; fullText?: string; role?: string };
      get().applyTokenChunk(
        data.messageId,
        (data.role as "assistant" | "system") ?? "assistant",
        data.content,
        data.fullText ?? data.content,
      );
    } else if (event.type === "intent") {
      const data = event.data as { intent: string; confidence: number };
      get().applyIntent(data.intent, [], data.confidence);
    } else if (event.type === "error") {
      const data = event.data as { error: string };
      get().applyToast(data.error, "error", 4000);
    }
  },

  applyTokenChunk: (messageId, role, chunk, fullText) =>
    set((s) => {
      const existing = s.streamMessages[messageId];
      if (existing && existing.isStreaming) {
        return {
          streamMessages: {
            ...s.streamMessages,
            [messageId]: { ...existing, content: fullText },
          },
        };
      }
      return {
        streamMessages: {
          ...s.streamMessages,
          [messageId]: {
            messageId,
            role,
            content: fullText,
            isStreaming: true,
            startedAt: Date.now(),
          },
        },
      };
    }),

  applyStreamComplete: (messageId, _finishReason, tokens) =>
    set((s) => {
      const existing = s.streamMessages[messageId];
      if (!existing) return {};
      return {
        streamMessages: {
          ...s.streamMessages,
          [messageId]: { ...existing, isStreaming: false, tokens },
        },
      };
    }),

  applyFormAutofill: (formId, fields) =>
    set((s) => ({
      forms: { ...s.forms, [formId]: { formId, fields, appliedAt: Date.now() } },
    })),

  applyShowCard: (cardId, card, data) =>
    set((s) => ({
      cards: { ...s.cards, [cardId]: { type: card, data, createdAt: Date.now() } },
    })),

  applyHideCard: (cardId) =>
    set((s) => {
      const { [cardId]: _, ...rest } = s.cards;
      return { cards: rest };
    }),

  applyShowLoading: (agent, message) =>
    set((s) => ({
      loading: { ...s.loading, [agent]: { agent, message, startedAt: Date.now() } },
    })),

  applyHideLoading: (agent) =>
    set((s) => {
      const { [agent]: _, ...rest } = s.loading;
      return { loading: rest };
    }),

  applyToast: (message, level, durationMs = 3000) =>
    set((s) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const toast: ToastMessage = { id, message, level, durationMs, createdAt: Date.now() };
      setTimeout(() => get().dismissToast(id), durationMs);
      return { toasts: [...s.toasts, toast] };
    }),

  applyNavigation: (route, params) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("seyyare:navigate", { detail: { route, params } }));
    }
  },

  applyIntent: (primary, secondary, confidence) => set({ intent: { primary, secondary, confidence } }),

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ cards: {}, forms: {}, loading: {}, toasts: [], streamMessages: {}, intent: null, lastError: null }),
}));

function nanoid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCards() {
  return useUIStore((s) => s.cards);
}
export function useToasts() {
  return useUIStore((s) => s.toasts);
}
export function useLoading() {
  return useUIStore((s) => s.loading);
}
export function useFormAutofill(formId: string) {
  return useUIStore((s) => s.forms[formId]);
}
export function useStreamMessages() {
  return useUIStore((s) => s.streamMessages);
}