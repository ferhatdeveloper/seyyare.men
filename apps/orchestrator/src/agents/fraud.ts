// Fraud Detection Agent — multi-layer risk analizi
// 1. Fiyat outlier (z-score)
// 2. Yeni satıcı + yüksek değer
// 3. Şüpheli keyword
// 4. EXIF/C2PA (skeleton)
// 5. Narrative consistency (skeleton)

import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";

export interface FraudFlag {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface FraudResult {
  vehicleId: string;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  flags: FraudFlag[];
  recommendation: "approve" | "review" | "reject";
  explanation: string;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

const SUSPICIOUS_KEYWORDS = [
  "western union",
  "money gram",
  "kripto ile ödeme",
  "crypto only",
  "havale öncesi",
  "acil satılık",
  "çok ucuz",
  "inanılmaz fiyat",
  "gift card",
  "only telegram",
];

export async function checkFraud(vehicleId: string): Promise<FraudResult> {
  // 1. Araç + satıcı bilgisi
  const res = await db.query<{
    seller_id: string;
    price_amount: string | number;
    year: number;
    mileage_km: number;
    title_original: string;
    description_original: string;
    make_id: number;
    model: string;
    seller_created_at: Date;
    seller_listing_count: number;
  }>(
    `SELECT v.seller_id, v.price_amount, v.year, v.mileage_km, v.title_original,
            v.description_original, v.make_id, v.model,
            u.created_at as seller_created_at,
            (SELECT COUNT(*) FROM public.vehicles WHERE seller_id = v.seller_id) as seller_listing_count
     FROM public.vehicles v
     JOIN public.users u ON u.id = v.seller_id
     WHERE v.id = $1`,
    [vehicleId],
  );

  const v = res.rows[0];
  if (!v) throw new Error("vehicle_not_found");

  // 2. Piyasa karşılaştırması (z-score)
  const market = await db.query<{ avg: number; median: number; stddev: number; count: number }>(
    `SELECT
       AVG(price_amount)::numeric as avg,
       (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_amount))::numeric as median,
       STDDEV(price_amount)::numeric as stddev,
       COUNT(*) as count
     FROM public.vehicles
     WHERE make_id = $1 AND model = $2
       AND year BETWEEN $3 - 1 AND $3 + 1
       AND status = 'active'
       AND id != $4
       AND price_amount > 0`,
    [v.make_id, v.model, v.year, vehicleId],
  );

  const m = market.rows[0] ?? { avg: 0, median: 0, stddev: 0, count: 0 };
  const medianPrice = Number(m.median);
  const stddev = Number(m.stddev);
  const listedPrice = Number(v.price_amount);
  const zScore = stddev > 0 ? (listedPrice - medianPrice) / stddev : 0;

  const flags: FraudFlag[] = [];
  let riskScore = 0;

  // Fiyat outlier
  if (m.count > 5 && medianPrice > 0) {
    if (zScore > 3) {
      flags.push({
        type: "price_outlier_high",
        severity: "critical",
        message: `Fiyat piyasa ortalamasının ${zScore.toFixed(1)}σ üstünde.`,
      });
      riskScore += 35;
    } else if (zScore > 2) {
      flags.push({
        type: "price_high",
        severity: "warning",
        message: `Fiyat piyasanın oldukça üstünde (z=${zScore.toFixed(1)}).`,
      });
      riskScore += 15;
    } else if (zScore < -2.5) {
      flags.push({
        type: "price_too_low",
        severity: "warning",
        message: `Fiyat piyasanın çok altında (z=${zScore.toFixed(1)}) — dolandırıcılık işareti olabilir.`,
      });
      riskScore += 20;
    }
  } else if (m.count === 0) {
    flags.push({
      type: "no_market_data",
      severity: "info",
      message: "Karşılaştırma için yeterli piyasa verisi yok.",
    });
  }

  // Yeni satıcı
  const sellerAgeDays = Math.floor(
    (Date.now() - new Date(v.seller_created_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (sellerAgeDays < 7) {
    flags.push({
      type: "new_seller",
      severity: "warning",
      message: `Satıcı hesabı ${sellerAgeDays} gün önce açılmış.`,
    });
    riskScore += 20;
  } else if (sellerAgeDays < 30) {
    riskScore += 8;
  }

  // Yeni satıcı + yüksek fiyat
  if (sellerAgeDays < 30 && listedPrice > 100_000 && m.count > 5 && listedPrice > medianPrice * 1.3) {
    flags.push({
      type: "new_seller_high_value",
      severity: "critical",
      message: "Yeni satıcı, yüksek fiyatlı ilan — manuel inceleme gerekli.",
    });
    riskScore += 25;
  }

  // Kısa açıklama
  if ((v.description_original?.length ?? 0) < 50) {
    flags.push({
      type: "short_description",
      severity: "info",
      message: "Açıklama çok kısa.",
    });
    riskScore += 5;
  }

  // Şüpheli keyword
  const fullText = `${v.title_original} ${v.description_original}`.toLowerCase();
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter((k) => fullText.includes(k));
  if (foundKeywords.length > 0) {
    flags.push({
      type: "suspicious_keywords",
      severity: "warning",
      message: `Şüpheli ifadeler içeriyor: ${foundKeywords.join(", ")}`,
    });
    riskScore += foundKeywords.length * 10;
  }

  // Eski model + düşük km
  const currentYear = new Date().getFullYear();
  if (v.year < currentYear - 15 && v.mileage_km < 1000) {
    flags.push({
      type: "old_vehicle_low_mileage",
      severity: "warning",
      message: "Çok eski model ve çok düşük km — veri tutarsızlığı olabilir.",
    });
    riskScore += 15;
  }

  // LLM narrative check (opsiyonel, düşük maliyetli)
  if (flags.length > 0) {
    const prompt = `Sen bir fraud analistisin. Bu ilanın detaylarını değerlendir:

Başlık: ${v.title_original}
Açıklama: ${v.description_original.slice(0, 300)}

Mevcut bayraklar:
${flags.map((f) => `- [${f.severity}] ${f.message}`).join("\n")}

Sadece JSON: {"concerns": "<ek endişe varsa 1 cümle, yoksa 'yok'>"}`;

    const llm = await openrouter.chat({
      model: MODELS.cheap_triage,
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" },
      temperature: 0.1,
      maxTokens: 100,
    });

    try {
      const parsed = JSON.parse(llm.content.trim()) as { concerns?: string };
      if (parsed.concerns && parsed.concerns.toLowerCase() !== "yok") {
        flags.push({
          type: "narrative_concern",
          severity: "info",
          message: parsed.concerns,
        });
        riskScore += 5;
      }
    } catch {}
  }

  // Sonuç
  let riskLevel: FraudResult["riskLevel"];
  let recommendation: FraudResult["recommendation"];
  if (riskScore >= 60) {
    riskLevel = "high";
    recommendation = "reject";
  } else if (riskScore >= 30) {
    riskLevel = "medium";
    recommendation = "review";
  } else {
    riskLevel = "low";
    recommendation = "approve";
  }

  return {
    vehicleId,
    riskScore: Math.min(100, riskScore),
    riskLevel,
    flags,
    recommendation,
    explanation:
      riskLevel === "low"
        ? "İlan normal görünüyor, otomatik onay için uygun."
        : riskLevel === "medium"
          ? "Bazı uyarılar var, admin incelemesi önerilir."
          : "Ciddi risk faktörleri tespit edildi, admin reddi önerilir.",
    model: "rule-based+v1",
    costUsd: 0,
    durationMs: 0,
    tokens: 0,
  };
}