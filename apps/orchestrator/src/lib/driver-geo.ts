/**
 * Redis GEO helpers for taxi driver locations.
 * Key: driver:geo — members are driver user_id (uuid string)
 * Coord order: longitude, latitude (Redis + PostGIS convention)
 */

import { redis } from "./redis.js";

export const DRIVER_GEO_KEY = "driver:geo";

export type NearbyDriverId = {
  id: string;
  distanceM: number;
};

/** GEOADD driver location (member = driverId). */
export async function upsertDriverLocation(
  driverId: string,
  lng: number,
  lat: number,
): Promise<void> {
  await redis.client.geoadd(DRIVER_GEO_KEY, lng, lat, driverId);
}

/** Remove driver from the GEO index (e.g. went offline). */
export async function removeDriverLocation(driverId: string): Promise<void> {
  await redis.client.zrem(DRIVER_GEO_KEY, driverId);
}

/**
 * GEORADIUS around (lng, lat) within radiusM metres.
 * Returns driver ids sorted by distance ascending.
 */
export async function nearbyDriverIds(
  lng: number,
  lat: number,
  radiusM: number,
  limit = 20,
): Promise<NearbyDriverId[]> {
  const count = Math.max(1, Math.min(limit, 100));
  const raw = await redis.client.georadius(
    DRIVER_GEO_KEY,
    lng,
    lat,
    Math.max(0, radiusM),
    "m",
    "WITHDIST",
    "ASC",
    "COUNT",
    count,
  );

  // WITHDIST → [member, distString][]
  return (raw as Array<[string, string]>).map(([id, dist]) => ({
    id,
    distanceM: Number(dist),
  }));
}
