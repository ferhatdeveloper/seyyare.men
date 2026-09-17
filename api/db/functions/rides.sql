-- Seyyare.men — Rides / drivers GEO RPCs

SET search_path TO public;

-- Drop old 4-arg signature before creating 5-arg (optional p_gender for female-driver matching)
DROP FUNCTION IF EXISTS public.nearby_drivers(double precision, double precision, int, int);

-- Online drivers within radius_m of (lat, lng), ordered by distance.
-- Optional p_gender filters for female-driver / family matching (migration 007 drivers.gender).
CREATE OR REPLACE FUNCTION public.nearby_drivers(
  lat double precision,
  lng double precision,
  radius_m int DEFAULT 3000,
  p_limit int DEFAULT 20,
  p_gender varchar(16) DEFAULT NULL
) RETURNS TABLE (
  user_id uuid,
  gender varchar(16),
  geo_lat double precision,
  geo_lng double precision,
  distance_m double precision,
  updated_at timestamptz
) LANGUAGE sql STABLE AS $$
  WITH center AS (
    SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography AS g
  )
  SELECT
    d.user_id,
    d.gender,
    ST_Y(d.geo::geometry) AS geo_lat,
    ST_X(d.geo::geometry) AS geo_lng,
    ST_Distance(d.geo, c.g) AS distance_m,
    d.updated_at
  FROM public.drivers d
  CROSS JOIN center c
  WHERE d.online = true
    AND d.geo IS NOT NULL
    AND ST_DWithin(d.geo, c.g, GREATEST(radius_m, 0))
    AND (p_gender IS NULL OR d.gender = p_gender)
  ORDER BY ST_Distance(d.geo, c.g)
  LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

GRANT EXECUTE ON FUNCTION public.nearby_drivers(
  double precision, double precision, int, int, varchar
) TO anon, authenticated, dealer, admin;

-- Upsert driver location + online flag (orchestrator / app sync)
CREATE OR REPLACE FUNCTION public.upsert_driver_location(
  p_user_id uuid,
  lat double precision,
  lng double precision,
  p_online boolean DEFAULT true,
  p_gender varchar(16) DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.drivers (user_id, online, gender, geo, updated_at)
  VALUES (
    p_user_id,
    p_online,
    p_gender,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    online = EXCLUDED.online,
    gender = COALESCE(EXCLUDED.gender, public.drivers.gender),
    geo = EXCLUDED.geo,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_driver_location(
  uuid, double precision, double precision, boolean, varchar
) TO authenticated, dealer, admin;

-- Match a requested ride to the nearest online driver (nearby_drivers).
-- Updates rides.status → matched and sets driver_id. Returns the ride row.
CREATE OR REPLACE FUNCTION public.match_ride(p_ride_id uuid)
RETURNS public.rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  ride public.rides;
  pick_lat double precision;
  pick_lng double precision;
  nearest uuid;
BEGIN
  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'ride_id_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ride_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF ride.status <> 'requested' THEN
    -- Idempotent: already matched/active — return current row
    RETURN ride;
  END IF;

  IF ride.pickup IS NULL THEN
    RAISE EXCEPTION 'pickup_required' USING ERRCODE = '22023';
  END IF;

  pick_lat := ST_Y(ride.pickup::geometry);
  pick_lng := ST_X(ride.pickup::geometry);

  SELECT nd.user_id INTO nearest
  FROM public.nearby_drivers(
    pick_lat,
    pick_lng,
    5000,  -- default search radius for dispatch scaffold
    1,
    ride.gender_pref
  ) AS nd
  LIMIT 1;

  IF nearest IS NULL THEN
    -- No online driver in range — leave as requested
    RETURN ride;
  END IF;

  UPDATE public.rides
  SET
    driver_id = nearest,
    status = 'matched',
    updated_at = now()
  WHERE id = p_ride_id
  RETURNING * INTO ride;

  RETURN ride;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_ride(uuid)
  TO authenticated, dealer, admin;
