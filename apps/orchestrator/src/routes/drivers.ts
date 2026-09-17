/**
 * Driver GEO routes — Redis hot path + optional PG sync
 * POST /drivers/location  — upsert Redis GEO (+ PG drivers)
 * GET  /drivers/nearby    — Redis GEORADIUS (fast) or ?source=pg for RPC
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../lib/db.js";
import {
  nearbyDriverIds,
  removeDriverLocation,
  upsertDriverLocation,
} from "../lib/driver-geo.js";

const LocationBodySchema = z.object({
  driverId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  online: z.boolean().default(true),
  gender: z.enum(["female", "male", "other"]).nullable().optional(),
  syncPg: z.boolean().default(true),
});

const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().int().positive().max(50_000).default(3000),
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Optional gender filter for female-driver matching (PG source only) */
  gender: z.enum(["female", "male", "other"]).nullable().optional(),
  source: z.enum(["redis", "pg"]).default("redis"),
});

export async function driverRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /drivers/location
   * Driver konumunu Redis GEO'ya yazar; syncPg=true ise PG drivers da güncellenir.
   */
  app.post("/drivers/location", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LocationBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }

    const { driverId, lat, lng, online, gender, syncPg } = parsed.data;

    if (online) {
      await upsertDriverLocation(driverId, lng, lat);
    } else {
      await removeDriverLocation(driverId);
    }

    if (syncPg) {
      await db.query(
        `SELECT public.upsert_driver_location($1::uuid, $2::float8, $3::float8, $4::boolean, $5::varchar)`,
        [driverId, lat, lng, online, gender ?? null],
      );
    }

    return reply.send({ ok: true, driverId, online, lat, lng });
  });

  /**
   * GET /drivers/nearby?lat=&lng=&radius_m=&limit=&gender=&source=redis|pg
   */
  app.get("/drivers/nearby", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = NearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", details: parsed.error.flatten() });
    }

    const { lat, lng, radius_m, limit, gender, source } = parsed.data;

    if (source === "pg") {
      const res = await db.query<{
        user_id: string;
        gender: string | null;
        geo_lat: number;
        geo_lng: number;
        distance_m: number;
        updated_at: string;
      }>(`SELECT * FROM public.nearby_drivers($1, $2, $3, $4, $5)`, [
        lat,
        lng,
        radius_m,
        limit,
        gender ?? null,
      ]);

      return reply.send({ source: "pg", drivers: res.rows });
    }

    const drivers = await nearbyDriverIds(lng, lat, radius_m, limit);
    return reply.send({ source: "redis", drivers });
  });
}
