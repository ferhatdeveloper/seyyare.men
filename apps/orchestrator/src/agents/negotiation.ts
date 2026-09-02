// Negotiation Agent — multi-turn fiyat pazarlığı
// State machine: alıcı teklif → satıcı cevap → agent moderasyon → anlaşma/red
// Private reservation prices: alıcı max WTP + satıcı min accept (asla client'a sızmaz)

import { z } from "zod";
import { openrouter, MODELS } from "../openrouter.js";
import { db } from "../lib/db.js";
import { nanoid } from "nanoid";

export interface NegotiationInput {
  threadId: string;
  vehicleId: string;
  buyerId: string;
  action: "start" | "offer" | "counter" | "accept" | "reject";
  offerAmount?: number;
  buyerMaxOffer?: number; // PRIVATE — sadece backend'de
  sellerMinAccept?: number; // PRIVATE — sadece backend'de
  locale?: string;
}

export interface NegotiationOffer {
  id: string;
  from: "buyer" | "seller" | "agent";
  amount: number;
  currency: string;
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
  agreedAmount?: number;
  agentSuggestion?: { amount: number; reasoning: string };
  turnNumber: number;
  maxTurns: number;
  model: string;
  costUsd: number;
  durationMs: number;
  tokens: number;
}

const NEGOTIATION_PROMPT = `Sen bir araç fiyat pazarlığı moderatörü olarak çalışıyorsun. Hem alıcıyı hem satıcıyı anlaşmaya yaklaştıracak adil bir teklif üret.

CONTEXT:
- Piyasa ortanca fiyatı: X USD
- Alıcının max teklifi: A USD (PRIVATE — asla alıcıya söyleme)
- Satıcının min kabulü: B USD (PRIVATE — asla satıcıya söyleme)
- Mevcut teklifler: [liste]
- Tur: N / max 10

Kurallar:
- Eğer teklifler [A, B] aralığındaysa → orta noktaya yakın teklif üret
- Eğer alıcı çok düşük teklif verdiyse → satıcıyı kaybetme, %5-10 artış öner
- Eğer satıcı çok yüksek teklif verdiyse → alıcıyı kaybetme, %5-10 indirim öner
- 7. turdan sonra walk-away threshold'a yaklaşıyorsan agresif ol
- 10. turda anlaşma yoksa "agreement_unlikely" de
- PRIVATE reservation prices ASLA ifşa etme

Sadece JSON:
{
  "suggestion": {"amount": <USD>, "reasoning": "<TR 1-2 cümle>"},
  "tone": "neutral|aggressive|conciliatory",
  "agreementLikely": <boolean>
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
    current_offer_amount: string | number | null;
    current_offer_by: string | null;
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
    // Yeni negotiation oluştur
    const vehicle = await db.query<{ seller_id: string; price_amount: string | number; price_currency: string }>(
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
        input.buyerMaxOffer ?? null,
        input.sellerMinAccept ?? null,
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
    return {
      threadId: input.threadId,
      negotiationId: negRow.id,
      status: negRow.status as NegotiationResult["status"],
      offers: Array.isArray(negRow.messages) ? (negRow.messages as NegotiationOffer[]) : [],
      currentOffer:
        negRow.current_offer_amount !== null
          ? {
              id: nanoid(),
              from: negRow.current_offer_by as NegotiationOffer["from"],
              amount: Number(negRow.current_offer_amount),
              currency: "USD",
              message: "",
              turnNumber: negRow.turn_count,
              createdAt: Date.now(),
            }
          : null,
      agreedAmount: negRow.agreed_amount ? Number(negRow.agreed_amount) : undefined,
      turnNumber: negRow.turn_count,
      maxTurns: negRow.max_turns,
      model: "rule-based",
      costUsd: 0,
      durationMs: 0,
      tokens: 0,
    };
  }

  const offers: NegotiationOffer[] = Array.isArray(negRow.messages) ? (negRow.messages as NegotiationOffer[]) : [];
  const buyerMax = input.buyerMaxOffer ?? (negRow.buyer_max_offer ? Number(negRow.buyer_max_offer) : null);
  const sellerMin = input.sellerMinAccept ?? (negRow.seller_min_accept ? Number(negRow.seller_min_accept) : null);

  // 2. Action handling
  if (input.action === "accept") {
    // Kabul
    await db.query(
      `UPDATE public.negotiation_threads
       SET status = 'agreed', agreed_amount = current_offer_amount, agreed_at = now()
       WHERE id = $1`,
      [negRow.id],
    );
    return {
      threadId: input.threadId,
      negotiationId: negRow.id,
      status: "agreed",
      offers,
      currentOffer: negRow.current_offer_amount ? {
        id: nanoid(),
        from: negRow.current_offer_by as NegotiationOffer["from"],
        amount: Number(negRow.current_offer_amount),
        currency: "USD",
        message: "",
        turnNumber: negRow.turn_count,
        createdAt: Date.now(),
      } : null,
      agreedAmount: negRow.current_offer_amount ? Number(negRow.current_offer_amount) : undefined,
      turnNumber: negRow.turn_count,
      maxTurns: negRow.max_turns,
      model: "rule-based",
      costUsd: 0,
      durationMs: 0,
      tokens: 0,
    };
  }

  if (input.action === "reject") {
    await db.query(
      `UPDATE public.negotiation_threads SET status = 'rejected' WHERE id = $1`,
      [negRow.id],
    );
    return {
      threadId: input.threadId,
      negotiationId: negRow.id,
      status: "rejected",
      offers,
      currentOffer: null,
      turnNumber: negRow.turn_count,
      maxTurns: negRow.max_turns,
      model: "rule-based",
      costUsd: 0,
      durationMs: 0,
      tokens: 0,
    };
  }

  // 3. Yeni teklif ekle
  const turnNumber = negRow.turn_count + 1;
  const newOffer: NegotiationOffer = {
    id: nanoid(),
    from: input.action === "counter" ? "buyer" : "buyer",
    amount: input.offerAmount ?? 0,
    currency: "USD",
    message: "",
    turnNumber,
    createdAt: Date.now(),
  };

  if (!newOffer.amount) throw new Error("offer_amount_required");

  offers.push(newOffer);

  // 4. Agent suggestion (LLM)
  let suggestion: { amount: number; reasoning: string } | undefined;
  let costUsd = 0;
  let durationMs = 0;
  let tokens = 0;
  let modelUsed = "rule-based";

  if (buyerMax !== null && sellerMin !== null && turnNumber <= negRow.max_turns) {
    const prompt = `${NEGOTIATION_PROMPT}

PIYASA: Ortanca fiyat
ALICI MAX (PRIVATE): ${buyerMax}
SATICI MIN (PRIVATE): ${sellerMin}
MEVCUT TEKLİFLER: ${offers.map((o) => `Tur ${o.turnNumber}: ${o.from} ${o.amount}`).join(", ")}
TUR: ${turnNumber} / ${negRow.max_turns}

Teklif: ${input.offerAmount} (alıcıdan)
Asla PRIVATE fiyatları ifşa etme.`;

    const result = await openrouter.chat({
      model: MODELS.premium_negotiation,
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" },
      temperature: 0.3,
      maxTokens: 200,
    });

    try {
      const parsed = JSON.parse(result.content.trim()) as { suggestion?: { amount?: number; reasoning?: string } };
      if (parsed.suggestion?.amount) {
        suggestion = {
          amount: Math.round(parsed.suggestion.amount),
          reasoning: parsed.suggestion.reasoning ?? "",
        };
      }
    } catch {}

    costUsd = result.costUsd;
    durationMs = result.durationMs;
    tokens = result.usage.totalTokens;
    modelUsed = result.model;

    // Anlaşma sağlandıysa otomatik kabul
    if (suggestion && buyerMax >= sellerMin && suggestion.amount >= sellerMin && suggestion.amount <= buyerMax) {
      // Negotiation turn-based, henüz agreement yok
    }
  }

  // 5. DB güncelle
  await db.query(
    `UPDATE public.negotiation_threads
     SET messages = $2,
         turn_count = $3,
         current_offer_amount = $4,
         current_offer_by = 'buyer'
     WHERE id = $1`,
    [negRow.id, JSON.stringify(offers), turnNumber, newOffer.amount],
  );

  // Max turns kontrolü
  if (turnNumber >= negRow.max_turns) {
    await db.query(
      `UPDATE public.negotiation_threads SET status = 'expired' WHERE id = $1 AND status = 'active'`,
      [negRow.id],
    );
  }

  return {
    threadId: input.threadId,
    negotiationId: negRow.id,
    status: turnNumber >= negRow.max_turns ? "expired" : "active",
    offers,
    currentOffer: newOffer,
    agentSuggestion: suggestion,
    turnNumber,
    maxTurns: negRow.max_turns,
    model: modelUsed,
    costUsd,
    durationMs,
    tokens,
  };
}