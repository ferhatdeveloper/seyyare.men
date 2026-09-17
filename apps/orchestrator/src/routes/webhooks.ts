/**
 * External provider webhooks.
 *
 * Wallet / PSP flow (stub):
 *   Provider → POST /webhooks/psp (X-PSP-Webhook-Secret)
 *   → log event → enqueue BullMQ `psp-reconcile`
 *   → worker credits wallet_ledger (topup) when wired to real PSP.
 * See api/db/migrations/009_wallets_auctions_fees.sql + wallet_auction.sql.
 */

import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { enqueuePspReconcile } from "../queue/producer.js";

const PspWebhookBodySchema = z.object({
  event: z.string().min(1).max(128).optional(),
  type: z.string().min(1).max(128).optional(),
  paymentId: z.string().min(1).max(128).optional(),
  payment_id: z.string().min(1).max(128).optional(),
  userId: z.string().uuid().optional(),
  amountIqd: z.number().int().positive().optional(),
  status: z.string().max(64).optional(),
}).passthrough();

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /webhooks/psp
   * Validates shared secret header, logs payload, enqueues psp-reconcile.
   */
  app.post("/webhooks/psp", async (req: FastifyRequest, reply: FastifyReply) => {
    const expected = process.env.PSP_WEBHOOK_SECRET ?? "";
    if (!expected) {
      req.log.error("PSP_WEBHOOK_SECRET is not configured");
      return reply.code(503).send({ error: "webhook_not_configured" });
    }

    const provided =
      (req.headers["x-psp-webhook-secret"] as string | undefined) ??
      (req.headers["x-psp-secret"] as string | undefined) ??
      "";

    if (!provided || !secretsEqual(provided, expected)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const parsed = PspWebhookBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        details: parsed.error.flatten(),
      });
    }

    const body = parsed.data;
    const event = body.event ?? body.type ?? "psp.unknown";
    const paymentId = body.paymentId ?? body.payment_id;

    req.log.info(
      { event, paymentId, status: body.status, keys: Object.keys(body) },
      "[webhook:psp] event received",
    );

    const jobId = await enqueuePspReconcile({
      paymentId,
      event,
      userId: body.userId,
      amountIqd: body.amountIqd,
      status: body.status,
      payload: body,
    });

    return reply.code(202).send({
      ok: true,
      queued: "psp-reconcile",
      jobId,
    });
  });
}
