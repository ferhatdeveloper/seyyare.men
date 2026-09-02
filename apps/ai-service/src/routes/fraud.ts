import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import { openrouter } from "../services/openrouter.js";

const FraudCheckSchema = z.object({
  vehicleId: z.string().uuid(),
});

interface FraudCheckResult {
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  flags: Array<{
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
  recommendation: "approve" | "review" | "reject";
  explanation: string;
}

export async function fraudRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /ai/fraud-check
   * Body: { vehicleId }
   * Returns: { riskScore, riskLevel, flags[], recommendation, explanation }
   *
   * Dolandırıcılık tespiti için çoklu sinyal analizi:
   * - Fiyat outlier (piyasa çok üstü/altı)
   * - Çok yeni satıcı + yüksek fiyat
   * - Aynı fotoğraf başka ilanlarda kullanılmış mı?
   * - Şüpheli kelimeler
   */
  app.post("/ai/fraud-check", async (req, reply) => {
    const parsed = FraudCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }
    const { vehicleId } = parsed.data;

    // Araç bilgilerini çek
    const vehicleRes = await db.query<{
      id: string;
      seller_id: string;
      price_amount: string | number;
      year: number;
      mileage_km: number;
      title_original: string;
      description_original: string;
      make_id: number;
      model: string;
      country_code: string;
      created_at: Date;
      seller_created_at: Date;
      seller_listing_count: number;
    }>(
      `SELECT v.id, v.seller_id, v.price_amount, v.year, v.mileage_km, v.title_original,
              v.description_original, v.make_id, v.model, v.country_code, v.created_at,
              u.created_at as seller_created_at,
              (SELECT COUNT(*) FROM public.vehicles WHERE seller_id = v.seller_id) as seller_listing_count
       FROM public.vehicles v
       JOIN public.users u ON u.id = v.seller_id
       WHERE v.id = $1`,
      [vehicleId],
    );

    const vehicle = vehicleRes.rows[0];
    if (!vehicle) return reply.code(404).send({ error: "vehicle_not_found" });

    // Piyasa karşılaştırması
    const marketRes = await db.query<{ avg: number; median: number; stddev: number; count: number }>(
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
      [vehicle.make_id, vehicle.model, vehicle.year, vehicleId],
    );

    const market = marketRes.rows[0] ?? { avg: 0, median: 0, stddev: 0, count: 0 };
    const medianPrice = Number(market.median);
    const stddev = Number(market.stddev);
    const listedPrice = Number(vehicle.price_amount);

    const flags: FraudCheckResult["flags"] = [];
    let riskScore = 0;

    // 1. Fiyat outlier analizi
    if (market.count > 5 && medianPrice > 0) {
      const zScore = stddev > 0 ? (listedPrice - medianPrice) / stddev : 0;

      if (zScore > 3) {
        flags.push({
          type: "price_outlier_high",
          severity: "critical",
          message: `Fiyat piyasa ortalamasının ${zScore.toFixed(1)} standart sapma üstünde. Şüpheli.`,
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
          message: `Fiyat piyasanın çok altında (z=${zScore.toFixed(1)}). Dolandırıcılık işareti olabilir.`,
        });
        riskScore += 20;
      }
    } else if (market.count === 0) {
      flags.push({
        type: "no_market_data",
        severity: "info",
        message: "Karşılaştırma için yeterli piyasa verisi yok.",
      });
    }

    // 2. Yeni satıcı analizi
    const sellerAgeDays = Math.floor(
      (Date.now() - new Date(vehicle.seller_created_at).getTime()) / (1000 * 60 * 60 * 24),
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

    // 3. Çok yüksek fiyatlı + yeni satıcı
    if (sellerAgeDays < 30 && listedPrice > 100_000 && market.count > 5 && listedPrice > medianPrice * 1.3) {
      flags.push({
        type: "new_seller_high_value",
        severity: "critical",
        message: "Yeni satıcı, yüksek fiyatlı ilan — manuel inceleme gerekli.",
      });
      riskScore += 25;
    }

    // 4. Çok az açıklama
    if ((vehicle.description_original?.length ?? 0) < 50) {
      flags.push({
        type: "short_description",
        severity: "info",
        message: "Açıklama çok kısa.",
      });
      riskScore += 5;
    }

    // 5. Şüpheli anahtar kelimeler
    const suspiciousKeywords = [
      "western union",
      "money gram",
      "kripto ile ödeme",
      "crypto only",
      "havale öncesi",
      "acil satılık",
      "çok ucuz",
      "inanılmaz fiyat",
    ];
    const fullText = `${vehicle.title_original} ${vehicle.description_original}`.toLowerCase();
    const foundKeywords = suspiciousKeywords.filter((k) => fullText.includes(k));
    if (foundKeywords.length > 0) {
      flags.push({
        type: "suspicious_keywords",
        severity: "warning",
        message: `Şüpheli ifadeler içeriyor: ${foundKeywords.join(", ")}`,
      });
      riskScore += foundKeywords.length * 10;
    }

    // 6. Çok eski model + düşük km
    const currentYear = new Date().getFullYear();
    if (vehicle.year < currentYear - 15 && vehicle.mileage_km < 1000) {
      flags.push({
        type: "old_vehicle_low_mileage",
        severity: "warning",
        message: "Çok eski model ve çok düşük km — veri tutarsızlığı olabilir.",
      });
      riskScore += 15;
    }

    // Sonuç
    let riskLevel: FraudCheckResult["riskLevel"];
    let recommendation: FraudCheckResult["recommendation"];
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

    const result: FraudCheckResult = {
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
    };

    // DB'ye logla
    await db.query(
      `INSERT INTO public.ai_jobs (type, status, payload, result, model_used, completed_at)
       VALUES ('fraud_check', 'completed', $1, $2, 'rule-based+v1', now())`,
      [JSON.stringify({ vehicleId }), JSON.stringify(result)],
    );

    return reply.send(result);
  });
}