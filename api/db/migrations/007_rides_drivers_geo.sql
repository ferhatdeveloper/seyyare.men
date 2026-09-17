-- Seyyare.men — Taxi drivers GEO + minimal rides stub
-- PostGIS geography for nearby matching; gender optional (female-driver matching)

SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============== DRIVERS (online location) ==============
CREATE TABLE IF NOT EXISTS public.drivers (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  online boolean NOT NULL DEFAULT false,
  gender varchar(16) CHECK (gender IS NULL OR gender IN ('female', 'male', 'other')),
  geo geography(Point, 4326),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_geo
  ON public.drivers USING GIST (geo);

CREATE INDEX IF NOT EXISTS idx_drivers_online
  ON public.drivers (online)
  WHERE online = true;

CREATE INDEX IF NOT EXISTS idx_drivers_online_gender
  ON public.drivers (gender)
  WHERE online = true AND gender IS NOT NULL;

-- ============== RIDES (minimal stub) ==============
CREATE TABLE IF NOT EXISTS public.rides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(16) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'matched', 'active', 'completed', 'cancelled')),
  pickup geography(Point, 4326),
  dropoff geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rides_rider ON public.rides (rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON public.rides (created_at DESC);
