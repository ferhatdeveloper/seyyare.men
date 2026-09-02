// Agent Composer — birden fazla agent sonucunu birleştir
// Multi-intent routing için: primary + secondary agent'ların çıktılarını
// tek bir enriched directive set'ine dönüştürür

import type { UIDirective } from "./ui-directive.js";
import { nanoid } from "nanoid";

export interface AgentResult {
  agent: string;
  success: boolean;
  directives: UIDirective[];
  data?: Record<string, unknown>;
  durationMs: number;
  costUsd: number;
  confidence: number;
}

export interface ComposerOptions {
  primaryIntent: string;
  secondaryIntents: string[];
  userMessage: string;
  locale: string;
}

export interface ComposedOutput {
  directives: UIDirective[];
  summary: string;
  totalDurationMs: number;
  totalCostUsd: number;
}

const INTENT_LABELS: Record<string, { tr: string; en: string }> = {
  create_listing: { tr: "İlan verme", en: "Listing" },
  search_vehicles: { tr: "Arama", en: "Search" },
  view_vehicle: { tr: "İlan görüntüleme", en: "View" },
  negotiate_price: { tr: "Pazarlık", en: "Negotiation" },
  rent_vehicle: { tr: "Kiralama", en: "Rental" },
  translate_content: { tr: "Çeviri", en: "Translation" },
  check_damage: { tr: "Hasar tespiti", en: "Damage" },
  recommend_similar: { tr: "Öneri", en: "Recommend" },
  fraud_check: { tr: "Doğrulama", en: "Fraud" },
  support_help: { tr: "Destek", en: "Support" },
  compare_vehicles: { tr: "Karşılaştırma", en: "Compare" },
  modify_listing: { tr: "İlan düzenleme", en: "Edit" },
  general_chat: { tr: "Genel sohbet", en: "General" },
};

/**
 * Agent sonuçlarını sırala:
 * 1. Primary agent en üstte
 * 2. Secondary agent'lar aşağıda (önem sırasına göre)
 * 3. Failed agent'lar sona (uyarı mesajı ile)
 */
export function composeAgents(
  results: AgentResult[],
  opts: ComposerOptions,
): ComposedOutput {
  const start = Date.now();
  const directives: UIDirective[] = [];

  // 1. Başarılı olanları ve başarısızları ayır
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  // 2. Primary agent (ilk başarılı veya primary intent'e en yakın)
  const primaryResult = successful.find((r) => r.agent === opts.primaryIntent)
    ?? successful[0];

  if (primaryResult) {
    directives.push(...primaryResult.directives);
  }

  // 3. Secondary agent'lar
  const secondaryResults = successful.filter((r) => r !== primaryResult);
  for (const result of secondaryResults) {
    directives.push(...result.directives);
  }

  // 4. Failed agent'lar → toast warning
  for (const failedResult of failed) {
    directives.push({
      type: "toast",
      message: `${failedResult.agent} tamamlanamadı`,
      level: "warning",
      durationMs: 3000,
    });
  }

  // 5. Summary toast (başarılı işlem sayısı)
  if (successful.length > 0) {
    const locale = opts.locale.startsWith("en") ? "en" : "tr";
    const summaryText = composeSummary(opts, successful, failed, locale);
    directives.push({
      type: "toast",
      message: summaryText,
      level: failed.length > 0 ? "info" : "success",
      durationMs: 2000,
    });
  }

  const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
  const totalDuration = Date.now() - start;

  return {
    directives,
    summary: composeSummary(opts, successful, failed, "tr"),
    totalDurationMs: totalDuration,
    totalCostUsd: totalCost,
  };
}

function composeSummary(
  opts: ComposerOptions,
  successful: AgentResult[],
  failed: AgentResult[],
  locale: "tr" | "en",
): string {
  const labels = locale === "tr"
    ? INTENT_LABELS
    : Object.fromEntries(Object.entries(INTENT_LABELS).map(([k, v]) => [k, { tr: v.en, en: v.en }]));

  const successLabels = successful.map((r) => labels[r.agent]?.[locale] ?? r.agent);
  const labels2 = locale === "tr" ? "tamamlandı" : "completed";

  if (failed.length === 0) {
    return locale === "tr"
      ? `${successLabels.join(", ")} ${labels2}`
      : `${successLabels.join(", ")} ${labels2}`;
  }

  return locale === "tr"
    ? `${successLabels.join(", ")} ${labels2}. ${failed.length} adet uyarı var.`
    : `${successLabels.join(", ")} ${labels2}. ${failed.length} warnings.`;
}

/**
 * Directive'leri önceliğe göre sırala:
 * - form_autofill önce (UI state'i günceller)
 * - show_loading sonra
 * - show_card (en önemli olanlar önce)
 * - show_loading(hide) sonra
 * - navigate sona
 * - toast en sona
 */
export function sortDirectives(directives: UIDirective[]): UIDirective[] {
  const order: Record<string, number> = {
    form_autofill: 1,
    validation: 2,
    show_card: 3,
    show_loading: 4,
    hide_loading: 5,
    navigate: 6,
    stream_message: 7,
    toast: 8,
    hide_card: 9,
    human_in_loop_required: 10,
  };

  return [...directives].sort((a, b) => {
    const aOrder = order[a.type] ?? 99;
    const bOrder = order[b.type] ?? 99;
    return aOrder - bOrder;
  });
}

/**
 * Birden fazla agent'ın kartını tek birleştirilmiş kart olarak sun
 * (Örn: Vision + Pricing → "Recognition with suggested price" kartı)
 */
export function mergeRelatedCards(
  directives: UIDirective[],
): UIDirective[] {
  // recognition_result + price_suggestion → merged "AI Detection" kartı
  const recognitionIdx = directives.findIndex(
    (d) => d.type === "show_card" && d.card === "recognition_result",
  );
  const priceIdx = directives.findIndex(
    (d) => d.type === "show_card" && d.card === "price_suggestion",
  );

  if (recognitionIdx >= 0 && priceIdx >= 0 && recognitionIdx < priceIdx) {
    const recognitionData = (directives[recognitionIdx] as Extract<UIDirective, { type: "show_card" }>).data as Record<string, unknown>;
    const priceData = (directives[priceIdx] as Extract<UIDirective, { type: "show_card" }>).data as Record<string, unknown>;

    const mergedCard: UIDirective = {
      type: "show_card",
      card: "recognition_result",
      cardId: `merged-${nanoid(6)}`,
      data: {
        ...recognitionData,
        suggestedPrice: priceData.suggestedPrice,
        priceRange: { low: priceData.rangeLow, high: priceData.rangeHigh },
        priceFactors: priceData.factors,
        priceExplanation: priceData.explanation,
      },
    };

    return [
      ...directives.slice(0, recognitionIdx),
      mergedCard,
      ...directives.slice(recognitionIdx + 1, priceIdx),
      ...directives.slice(priceIdx + 1),
    ];
  }

  return directives;
}