// Negotiation Agent — multi-turn fiyat + koşul + süre + takas pazarlığı
// Genişletilmiş: artık sadece fiyat değil, teslim koşulları, garanti süresi, takas da destekleniyor

import { z } from "zod";
import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";
import { nanoid } from "nanoid";

export type NegotiationAction =
  | "start"
  | "offer"           // Yeni teklif (fiyat veya koşul)
  | "counter"         // Karşı teklif (satıcı veya alıcı)
  | "accept"
  | "reject"
  | "modify_terms"    // Koşulları değiştir (garanti, teslim, takas)

export interface NegotiationTerms {
  price: number;
  currency: string;
  // Genişletilmiş koşullar
  warrantyMonths?: number; // Garanti süresi (ay)
  deliveryDays?: number; // Teslimat süresi (gün)
  tradeInVehicleId?: string; // Takas aracı
  tradeInValue?: number; // Takas değeri
  paymentMethod?: "cash" | "bank_transfer" | "installment" | "crypto";
  inspectionDays?: number; // Muayene süresi
}

export interface NegotiationInput {
  threadId: string;
  vehicleId: string;
  buyerId: string;
  action: NegotiationAction;
  // Genişletilmiş: artık sadece offerAmount değil, tüm terms
  offerTerms?: Partial<NegotiationTerms>;
  buyerMaxTerms?: Partial<NegotiationTerms>; // PRIVATE — alıcının max kabul edebileceği
  sellerMinTerms?: Partial<NegotiationTerms>; // PRIVATE — satıcının min kabul edebileceği
  counterBy?: "buyer" | "seller";
  locale?: string;
}

export interface NegotiationOffer {
  id: string;
  from: "buyer" | "seller" | "agent";
  terms: NegotiationTerms;
  message: string;
  turnNumber: number;
  createdAt: number;
}

export interface NegotiationResult {
  threadId: string;
  negotiationId: string;
  status: "active" | "agreed" | "rejected" | "expired";
  offers: NegotiationOffer[];
  currentOffer: NegotiationOffer | null;
  agreedTerms?: NegotiationTerms;
  agentSuggestion?: { terms: NegotiationTerms; reasoning: string };
  termAnalysis?: TermAnalysis;
  turnNumber: number;
  maxTurns: number;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

interface TermAnalysis {
  priceGap: number; // Alıcı max - satıcı min farkı
  priceGapPct: number;
  termsAligned: boolean;
  recommendedAction: "accept" | "counter" | "wait" | "reject";
  reason: string;
}

const TERMS_NEGOTIATION_PROMPT = `Sen bir araç fiyat ve koşul pazarlığı moderatörüsün. Taraflar arasında adil bir anlaşma sağlamaya çalışıyorsun.

CONTEXT:
- Piyasa ortanca fiyatı: X
- Alıcı max teklif/willingness: A (PRIVATE — asla alıcıya söyleme)
- Satıcı min kabul: B (PRIVATE — asla satıcıya söyleme)
- Mevcut teklif: [tur listesi]
- Tur: N / max 10

NEGOTIABLE TERMS:
- price: USD cinsinden fiyat
- warrantyMonths: garanti süresi (ay, 0-36)
- deliveryDays: teslimat süresi (gün, 0-30)
- tradeInVehicleId + tradeInValue: takas
- paymentMethod: cash | bank_transfer | installment | crypto
- inspectionDays: muayene süresi (gün, 0-14)

KURALLAR:
1. PRIVATE reservation prices/terms ASLA ifşa etme
2. Her teklifte tüm terms'ü değerlendir:
   - Fiyat gap'i %10'dan azsa → close to deal, küçük concession öner
   - Garanti/teslim/takas ile fiyat dengesi kurulabilir
   - 7. turdan sonra walk-away threshold'a yaklaşıyorsan agresif ol
   - 10. turda anlaşma yoksa → "agreement_unlikely" de
3. Suggestion'da hangi terms'ü değiştirdiğini açıkça belirt
4. message alanında Türkçe, samimi, max 2 cümle

Sadece JSON:
{
  "suggestion": {
    "terms": {"price": <USD>, "warrantyMonths": <int>, "deliveryDays": <int>, "paymentMethod": "<>"},
    "reasoning": "<TR 1-2 cümle>"
  },
  "termAnalysis": {
    "priceGap": <A - B>,
    "priceGapPct": <gap %>,
    "termsAligned": <bool — alıcı max >= satıcı min mi?>,
    "recommendedAction": "accept" | "counter" | "wait" | "reject",
    "reason": "<TR 1 cümle>"
  },
  "agreementLikely": <bool>
}`;

export async function negotiateTurn(input: NegotiationInput): Promise<NegotiationResult> {
  // 1. Mevcut negotiation thread'i al veya oluştur
  let negotiation = await db.query<{
    id: string;
    vehicle_id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
    buyer_max_offer: string | number | null;
    seller_min_accept: string | number | null;
    turn_count: number;
    max_turns: number;
    agreed_amount: string | number | null;
    messages: unknown;
    expires_at: Date;
  }>(
    `SELECT * FROM public.negotiation_threads WHERE id = $1 LIMIT 1`,
    [input.threadId],
  );

  let negRow = negotiation.rows[0];

  if (!negRow && input.action === "start") {
    const vehicle = await db.query<{
      seller_id: string;
      price_amount: string | number;
      price_currency: string;
    }>(
      `SELECT seller_id, price_amount, price_currency FROM public.vehicles WHERE id = $1`,
      [input.vehicleId],
    );
    if (!vehicle.rows[0]) throw new Error("vehicle_not_found");

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO public.negotiation_threads (vehicle_id, buyer_id, seller_id, buyer_max_offer, seller_min_accept)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.vehicleId,
        input.buyerId,
        vehicle.rows[0].seller_id,
        input.buyerMaxTerms?.price ?? null,
        input.sellerMinTerms?.price ?? null,
      ],
    );
    const newId = inserted.rows[0].id;
    negotiation = await db.query(
      `SELECT * FROM public.negotiation_threads WHERE id = $1`,
      [newId],
    );
    negRow = negotiation.rows[0];
  }

  if (!negRow) throw new Error("negotiation_not_found");
  if (negRow.status !== "active") {
    return buildResultFromRow(input.threadId, negRow, []);
  }

  // 2. Mevcut offer'ları yükle
  const offers: NegotiationOffer[] = Array.isArray(negRow.messages)
    ? (negRow.messages as NegotiationOffer[])
    : [];

  // 3. Private reservation terms (PUBLIC'e ASLA ifşa edilmez)
  const buyerMaxTerms: Partial<NegotiationTerms> = {
    price: input.buyerMaxTerms?.price ?? (negRow.buyer_max_offer ? Number(negRow.buyer_max_offer) : undefined),
    currency: "USD",
    ...input.buyerMaxTerms,
  };
  const sellerMinTerms: Partial<NegotiationTerms> = {
    price: input.sellerMinTerms?.price ?? (negRow.seller_min_accept ? Number(negRow.seller_min_accept) : undefined),
    currency: "USD",
    ...input.sellerMinTerms,
  };

  // 4. Action handling
  if (input.action === "accept") {
    await db.query(
      `UPDATE public.negotiation_threads
       SET status = 'agreed', agreed_amount = current_offer_amount, agreed_at = now()
       WHERE id = $1`,
      [negRow.id],
    );
    return buildResultFromRow(input.threadId, negRow, offers);
  }

  if (input.action === "reject") {
    await db.query(
      `UPDATE public.negotiation_threads SET status = 'rejected' WHERE id = $1`,
      [negRow.id],
    );
    return { ...buildResultFromRow(input.threadId, negRow, offers), status: "rejected" };
  }

  // 5. Yeni teklif ekle (start, offer, counter, modify_terms)
  const turnNumber = negRow.turn_count + 1;
  const fromParty: NegotiationOffer["from"] =
    input.action === "start" ? "buyer" : (input.counterBy ?? "buyer");

  // Default current offer (vehicles tablosundan)
  const defaultTerms: NegotiationTerms = input.offerTerms
    ? { ...input.offerTerms, currency: input.offerTerms.currency ?? "USD" }
    : {
        price: 0,
        currency: "USD",
      };

  if (!defaultTerms.price && defaultTerms.price !== 0) {
    throw new Error("offer_price_required");
  }

  const newOffer: NegotiationOffer = {
    id: nanoid(),
    from: fromParty,
    terms: defaultTerms,
    message: input.offerTerms?.message ?? "",
    turnNumber,
    createdAt: Date.now(),
  };

  offers.push(newOffer);

  // 6. LLM ile suggestion + analysis
  let agentSuggestion: { terms: NegotiationTerms; reasoning: string } | undefined;
  let termAnalysis: TermAnalysis | undefined;
  let costUsd = 0;
  let durationMs = 0;
  let tokens = 0;
  let modelUsed = "rule-based+v1";

  // Piyasa ortanca fiyat (referans)
  const marketRes = await db.query<{ median: string | number }>(
    `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_amount) as median
     FROM public.vehicles
     WHERE make_id = (SELECT make_id FROM public.vehicles WHERE id = $1)
       AND model = (SELECT model FROM public.vehicles WHERE id = $1)
       AND status = 'active'`,
    [input.vehicleId],
  );
  const marketMedian = Number(marketRes.rows[0]?.median ?? 0);

  if (buyerMaxTerms.price && sellerMinTerms.price && turnNumber <= negRow.max_turns) {
    const prompt = `${TERMS_NEGOTIATION_PROMPT}

Piyasa ortanca: ${marketMedian}
ALICI MAX (PRIVATE): ${JSON.stringify(buyerMaxTerms)}
SATICI MIN (PRIVATE): ${JSON.stringify(sellerMinTerms)}
MEVCUT TEKLİFLER: ${offers.slice(-3).map((o) => `Tur ${o.turnNumber}: ${o.from} ${JSON.stringify(o.terms)}`).join("; ")}
TUR: ${turnNumber} / ${negRow.max_turns}
YENİ TEKLİF: ${JSON.stringify(defaultTerms)}`;

    try {
      const result = await openrouter.chat({
        model: MODELS.premium_negotiation,
        messages: [{ role: "user", content: prompt }],
        responseFormat: { type: "json_object" },
        temperature: 0.3,
        maxTokens: 500,
      });

      try {
        const parsed = JSON.parse(result.content.trim()) as {
          suggestion?: { terms?: NegotiationTerms; reasoning?: string };
          termAnalysis?: TermAnalysis;
          agreementLikely?: boolean;
        };

        if (parsed.suggestion?.terms && parsed.suggestion.terms.price !== undefined) {
          agentSuggestion = {
            terms: { ...parsed.suggestion.terms, currency: parsed.suggestion.terms.currency ?? "USD" },
            reasoning: parsed.suggestion.reasoning ?? "",
          };
        }
        termAnalysis = parsed.termAnalysis;

        // Anlaşma sağlandıysa otomatik kabul
        if (
          termAnalysis?.termsAligned &&
          parsed.agreementLikely &&
          agentSuggestion &&
          buyerMaxTerms.price! >= agentSuggestion.terms.price &&
          agentSuggestion.terms.price >= sellerMinTerms.price!
        ) {
          newOffer.terms = agentSuggestion.terms;
        }
      } catch {
        // JSON parse hatası — default ile devam
      }

      costUsd = result.costUsd;
      durationMs = result.durationMs;
      tokens = result.usage.totalTokens;
      modelUsed = result.model;
    } catch (err) {
      console.warn("[negotiation] LLM suggestion failed:", err);
    }
  }

  // 7. DB güncelle
  await db.query(
    `UPDATE public.negotiation_threads
     SET messages = $2,
         turn_count = $3,
         current_offer_amount = $4
     WHERE id = $1`,
    [negRow.id, JSON.stringify(offers), turnNumber, newOffer.terms.price],
  );

  // 8. Max turns kontrolü
  let status: NegotiationResult["status"] = "active";
  if (turnNumber >= negRow.max_turns) {
    await db.query(
      `UPDATE public.negotiation_threads SET status = 'expired' WHERE id = $1 AND status = 'active'`,
      [negRow.id],
    );
    status = "expired";
  }

  return {
    threadId: input.threadId,
    negotiationId: negRow.id,
    status,
    offers,
    currentOffer: newOffer,
    agreedTerms: undefined,
    agentSuggestion,
    termAnalysis,
    turnNumber,
    maxTurns: negRow.max_turns,
    model: modelUsed,
    costUsd,
    durationMs,
    tokens,
  };
}

function buildResultFromRow(
  threadId: string,
  row: {
    id: string;
    status: string;
    turn_count: number;
    max_turns: number;
    agreed_amount: string | number | null;
    current_offer_amount: string | number | null;
    messages: unknown;
  },
  offers: NegotiationOffer[],
): NegotiationResult {
  return {
    threadId,
    negotiationId: row.id,
    status: row.status as NegotiationResult["status"],
    offers,
    currentOffer: offers[offers.length - 1] ?? null,
    agreedTerms: row.agreed_amount
      ? { price: Number(row.agreed_amount), currency: "USD" }
      : undefined,
    turnNumber: row.turn_count,
    maxTurns: row.max_turns,
    model: "rule-based",
    costUsd: 0,
    durationMs: 0,
    tokens: 0,
  };
}