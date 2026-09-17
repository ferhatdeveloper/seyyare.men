-- Seyyare.men — P0 listing speed: denormalized cover_url + partial indexes
SET search_path TO public;

-- ============== cover_url on vehicles ==============
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS cover_url text;

-- Backfill from vehicle_media (is_cover preferred, then lowest sort_order)
UPDATE public.vehicles v
SET cover_url = sub.url
FROM (
  SELECT DISTINCT ON (m.vehicle_id)
    m.vehicle_id,
    m.url
  FROM public.vehicle_media m
  ORDER BY m.vehicle_id, m.is_cover DESC, m.sort_order ASC
) sub
WHERE v.id = sub.vehicle_id
  AND v.cover_url IS NULL;

-- Keep cover_url in sync when media changes
CREATE OR REPLACE FUNCTION public.sync_vehicle_cover_url() RETURNS trigger AS $$
DECLARE
  vid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    vid := OLD.vehicle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
    -- Recompute cover for the previous vehicle when media is moved
    UPDATE public.vehicles
    SET cover_url = (
      SELECT m.url
      FROM public.vehicle_media m
      WHERE m.vehicle_id = OLD.vehicle_id
      ORDER BY m.is_cover DESC, m.sort_order ASC
      LIMIT 1
    )
    WHERE id = OLD.vehicle_id;
    vid := NEW.vehicle_id;
  ELSE
    vid := NEW.vehicle_id;
  END IF;

  UPDATE public.vehicles
  SET cover_url = (
    SELECT m.url
    FROM public.vehicle_media m
    WHERE m.vehicle_id = vid
    ORDER BY m.is_cover DESC, m.sort_order ASC
    LIMIT 1
  )
  WHERE id = vid;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicle_media_sync_cover ON public.vehicle_media;
CREATE TRIGGER trg_vehicle_media_sync_cover
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_media
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_cover_url();

-- ============== Partial indexes for active listings ==============
CREATE INDEX IF NOT EXISTS idx_vehicles_active_created_at
  ON public.vehicles (created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vehicles_active_price
  ON public.vehicles (price_amount)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vehicles_active_make_price
  ON public.vehicles (make_id, price_amount)
  WHERE status = 'active';

-- Filters: country + city on active rows (columns exist on vehicles)
CREATE INDEX IF NOT EXISTS idx_vehicles_active_country_city
  ON public.vehicles (country_code, city)
  WHERE status = 'active';

-- Cover lookup helper for sync / fallback paths
CREATE INDEX IF NOT EXISTS idx_vehicle_media_cover
  ON public.vehicle_media (vehicle_id, is_cover DESC, sort_order ASC);
