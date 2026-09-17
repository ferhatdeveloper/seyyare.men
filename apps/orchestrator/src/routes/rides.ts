/**
 * Ride dispatch routes — enqueue BullMQ match jobs
 * POST /rides/dispatch  — { rideId, pickupLat?, pickupLng?, radiusM? }
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { enqueueDispatch } from "../queue/producer.js";

const DispatchBodySchema = z.object({
  rideId: z.string().uuid(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  radiusM: z.number().int().positive().max(50_000).optional(),
});

export async function rideRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /rides/dispatch
   * Enqueues a BullMQ dispatch job; worker calls match_ride / nearby_drivers.
   */
  app.post("/rides/dispatch", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = DispatchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", details: parsed.error.flatten() });
    }

    const { rideId, pickupLat, pickupLng, radiusM } = parsed.data;

    const jobId = await enqueueDispatch({
      rideId,
      pickupLat: pickupLat ?? 0,
      pickupLng: pickupLng ?? 0,
      radiusM,
    });

    return reply.code(202).send({
      ok: true,
      queued: true,
      jobId,
      rideId,
    });
  });
}
