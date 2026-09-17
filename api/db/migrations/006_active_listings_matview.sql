-- Seyyare.men — Active listings materialized view (home/search feed speed)
-- Depends on: 001 (vehicles), seed brands, 005 (cover_url).
-- Prefer denormalized cover_url from vehicles. Refresh: CALL or cron (see below).
SET search_path TO public;

-- Featured flag used by home carousel / cards (mobile expects this)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_active_featured
  ON public.vehicles (featured)
  WHERE status = 'active' AND featured = true;

-- ============== Materialized feed ==============
-- Card-shaped rows: no heavy joins at read time (make_name jsonb denormalized).
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_active_listings_feed AS
SELECT
  v.id,
  v.make_id,
  b.name AS make_name,
  v.model,
  v.year,
  v.price_amount,
  v.price_currency,
  v.city,
  v.country_code,
  v.cover_url,
  v.featured,
  v.created_at,
  v.status
FROM public.vehicles v
LEFT JOIN public.brands b ON b.id = v.make_id
WHERE v.status = 'active'
WITH DATA;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_active_listings_feed_id
  ON public.mv_active_listings_feed (id);

CREATE INDEX IF NOT EXISTS idx_mv_active_listings_feed_created_at
  ON public.mv_active_listings_feed (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mv_active_listings_feed_featured
  ON public.mv_active_listings_feed (featured)
  WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_mv_active_listings_feed_make_price
  ON public.mv_active_listings_feed (make_id, price_amount);

-- Public read: matview only contains status='active'
GRANT SELECT ON public.mv_active_listings_feed TO anon, authenticated, dealer, admin;

-- ============== Concurrent refresh ==============
-- CONCURRENTLY cannot run inside a function transaction. Use a PROCEDURE that
-- COMMITs the CALL wrapper txn first (PostgreSQL 11+), then refreshes.
-- Cron example:
--   CALL public.refresh_active_listings_feed();
-- Or as postgres/superuser:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_listings_feed;
CREATE OR REPLACE PROCEDURE public.refresh_active_listings_feed()
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  COMMIT;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_listings_feed;
END;
$$;

REVOKE ALL ON PROCEDURE public.refresh_active_listings_feed() FROM PUBLIC;
-- Admin / service cron only — do not expose to anon
GRANT EXECUTE ON PROCEDURE public.refresh_active_listings_feed() TO admin;
