// UI Directive schema — backend'den mobil'e gönderilen declarative güncellemeler
// Mobil taraf bu event'leri Zustand store'a uygular, UI otomatik güncellenir.

import { z } from "zod";

export const FormAutofillDirective = z.object({
  type: z.literal("form_autofill"),
  formId: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

export const ShowCardDirective = z.object({
  type: z.literal("show_card"),
  card: z.enum([
    "price_suggestion",
    "damage_report",
    "fraud_check",
    "translation",
    "recommendations",
    "negotiation_offer",
    "ai_assistant_reply",
    "rental_quote",
    "recognition_result",
    "validation_warning",
  ]),
  cardId: z.string(),
  data: z.unknown(),
  autoDismissMs: z.number().optional(),
});

export const HideCardDirective = z.object({
  type: z.literal("hide_card"),
  cardId: z.string(),
});

export const ShowLoadingDirective = z.object({
  type: z.literal("show_loading"),
  agent: z.string(),
  message: z.string().optional(),
  targetCardId: z.string().optional(),
});

export const HideLoadingDirective = z.object({
  type: z.literal("hide_loading"),
  agent: z.string(),
});

export const NavigateDirective = z.object({
  type: z.literal("navigate"),
  route: z.string(),
  params: z.record(z.string(), z.string()).optional(),
});

export const ToastDirective = z.object({
  type: z.literal("toast"),
  message: z.string(),
  level: z.enum(["info", "success", "warning", "error"]),
  durationMs: z.number().default(3000),
});

export const StreamMessageDirective = z.object({
  type: z.literal("stream_message"),
  messageId: z.string(),
  role: z.enum(["assistant", "system"]),
  content: z.string(),
  delta: z.boolean().default(false),
  finishReason: z.string().optional(),
});

export const ValidationDirective = z.object({
  type: z.literal("validation"),
  formId: z.string(),
  errors: z.record(z.string(), z.string()),
  warnings: z.record(z.string(), z.string()).optional(),
});

export const HILPauseDirective = z.object({
  type: z.literal("human_in_loop_required"),
  reason: z.string(),
  resumeToken: z.string(),
  data: z.unknown().optional(),
});

export const UIDirectiveSchema = z.discriminatedUnion("type", [
  FormAutofillDirective,
  ShowCardDirective,
  HideCardDirective,
  ShowLoadingDirective,
  HideLoadingDirective,
  NavigateDirective,
  ToastDirective,
  StreamMessageDirective,
  ValidationDirective,
  HILPauseDirective,
]);

export type UIDirective = z.infer<typeof UIDirectiveSchema>;

export type DirectiveCardType = UIDirective & { type: "show_card" } extends infer T
  ? T extends { card: infer C }
    ? C
    : never
  : never;

export interface AgentEvent {
  type:
    | "intent"
    | "directive"
    | "tool_call"
    | "tool_result"
    | "token"
    | "log"
    | "cost"
    | "done"
    | "error";
  agent: string;
  threadId: string;
  data: unknown;
  ts: number;
}

export function serializeDirective(directive: UIDirective): string {
  return JSON.stringify(directive);
}

export function parseDirective(raw: string): UIDirective | null {
  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = UIDirectiveSchema.safeParse(json);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}