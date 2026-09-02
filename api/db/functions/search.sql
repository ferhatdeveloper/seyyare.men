-- Seyyare.men — Search RPC
-- Full-text + PostGIS konum + filtre kombinasyonu

SET search_path TO public;

CREATE OR REPLACE FUNCTION public.search_vehicles(
  q text DEFAULT NULL,
  make_ids int[] DEFAULT NULL,
  body_type_ids int[] DEFAULT NULL,
  fuel_type_ids int[] DEFAULT NULL,
  transmission_ids int[] DEFAULT NULL,
  color_ids int[] DEFAULT NULL,
  country_code char(2) DEFAULT NULL,
  city text DEFAULT NULL,
  min_year int DEFAULT NULL,
  max_year int DEFAULT NULL,
  min_price bigint DEFAULT NULL,
  max_price bigint DEFAULT NULL,
  min_mileage int DEFAULT NULL,
  max_mileage int DEFAULT NULL,
  condition_filter varchar(16) DEFAULT NULL,
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  radius_km int DEFAULT NULL,
  locale varchar(10) DEFAULT NULL,
  sort_by varchar(16) DEFAULT 'created_at',
  sort_dir varchar(4) DEFAULT 'desc',
  page_size int DEFAULT 20,
  page_offset int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  title text,
  make_name text,
  model text,
  year int,
  mileage_km int,
  fuel_name text,
  transmission_name text,
  body_name text,
  color_name text,
  condition varchar(16),
  price_amount bigint,
  price_currency char(3),
  country_code char(2),
  city text,
  geo_lat double precision,
  geo_lng double precision,
  distance_km double precision,
  cover_url text,
  created_at timestamptz,
  rank real
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  order_clause text;
  center geography;
BEGIN
  -- Build dynamic ORDER BY
  order_clause := format(
    'ORDER BY %I %s, id DESC',
    CASE sort_by
      WHEN 'price' THEN 'price_amount'
      WHEN 'year' THEN 'year'
      WHEN 'mileage' THEN 'mileage_km'
      WHEN 'distance' THEN 'distance_km'
      ELSE 'created_at'
    END,
    CASE WHEN lower(sort_dir) = 'asc' THEN 'ASC' ELSE 'DESC' END
  );

  -- Center point for distance calc
  IF lat IS NOT NULL AND lng IS NOT NULL THEN
    center := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
  END IF;

  RETURN QUERY EXECUTE format(
    '
    SELECT
      v.id,
      coalesce(
        (SELECT value FROM jsonb_each_text(v.title_translations) WHERE key = $1 LIMIT 1),
        v.title_original
      ) AS title,
      coalesce(b.name->>$1, b.name->>''en'') AS make_name,
      v.model,
      v.year,
      v.mileage_km,
      coalesce(ft.name->>$1, ft.name->>''en'') AS fuel_name,
      coalesce(tt.name->>$1, tt.name->>''en'') AS transmission_name,
      coalesce(bt.name->>$1, bt.name->>''en'') AS body_name,
      coalesce(c.name->>$1, c.name->>''en'') AS color_name,
      v.condition,
      v.price_amount,
      v.price_currency,
      v.country_code,
      v.city,
      ST_Y(v.geo::geometry) AS geo_lat,
      ST_X(v.geo::geometry) AS geo_lng,
      CASE WHEN $2::geography IS NOT NULL
        THEN ST_Distance(v.geo, $2::geography) / 1000.0
        ELSE NULL
      END AS distance_km,
      (SELECT url FROM public.vehicle_media m WHERE m.vehicle_id = v.id ORDER BY m.is_cover DESC, m.sort_order ASC LIMIT 1) AS cover_url,
      v.created_at,
      CASE WHEN $3 IS NOT NULL THEN
        ts_rank(v.search_tsv, plainto_tsquery(''simple'', $3))
      ELSE 0 END AS rank
    FROM public.vehicles v
    LEFT JOIN public.brands b ON b.id = v.make_id
    LEFT JOIN public.fuel_types ft ON ft.id = v.fuel_type_id
    LEFT JOIN public.transmission_types tt ON tt.id = v.transmission_type_id
    LEFT JOIN public.body_types bt ON bt.id = v.body_type_id
    LEFT JOIN public.colors c ON c.id = v.color_id
    WHERE v.status = ''active''
      AND ($1 IS NULL OR v.search_tsv @@ plainto_tsquery(''simple'', $1))
      AND ($4::int[] IS NULL OR v.make_id = ANY($4::int[]))
      AND ($5::int[] IS NULL OR v.body_type_id = ANY($5::int[]))
      AND ($6::int[] IS NULL OR v.fuel_type_id = ANY($6::int[]))
      AND ($7::int[] IS NULL OR v.transmission_type_id = ANY($7::int[]))
      AND ($8::int[] IS NULL OR v.color_id = ANY($8::int[]))
      AND ($9::char(2) IS NULL OR v.country_code = $9::char(2))
      AND ($10 IS NULL OR lower(v.city) = lower($10))
      AND ($11 IS NULL OR v.year >= $11)
      AND ($12 IS NULL OR v.year <= $12)
      AND ($13::bigint IS NULL OR v.price_amount >= $13)
      AND ($14::bigint IS NULL OR v.price_amount <= $14)
      AND ($15 IS NULL OR v.mileage_km >= $15)
      AND ($16 IS NULL OR v.mileage_km <= $16)
      AND ($17 IS NULL OR v.condition = $17)
      AND ($2::geography IS NULL OR ST_DWithin(v.geo, $2::geography, $18 * 1000))
    %s
    LIMIT $19 OFFSET $20
    ',
    order_clause
  )
  USING
    locale,
    center,
    q,
    make_ids,
    body_type_ids,
    fuel_type_ids,
    transmission_ids,
    color_ids,
    country_code,
    city,
    min_year,
    max_year,
    min_price,
    max_price,
    min_mileage,
    max_mileage,
    condition_filter,
    radius_km,
    page_size,
    page_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_vehicles(
  text, int[], int[], int[], int[], int[], char(2), text,
  int, int, bigint, bigint, int, int, varchar,
  double precision, double precision, int, varchar,
  varchar, varchar, int, int
) TO anon, authenticated, dealer, admin;

-- Marka listesi (locale'e göre)
CREATE OR REPLACE FUNCTION public.list_brands(locale varchar(10) DEFAULT 'en')
RETURNS TABLE(id int, name text, logo_url text, is_premium boolean, is_electric boolean)
LANGUAGE sql STABLE AS $$
  SELECT id, name->>$1 AS name, logo_url, is_premium, is_electric
  FROM public.brands
  ORDER BY is_premium DESC, name->>$1;
$$;
GRANT EXECUTE ON FUNCTION public.list_brands(varchar) TO anon, authenticated, dealer, admin;

-- Reference data (combobox için)
CREATE OR REPLACE FUNCTION public.list_reference_data(locale varchar(10) DEFAULT 'en')
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'countries', (SELECT jsonb_agg(jsonb_build_object('code', code, 'name', name->>$1, 'currency', currency_code, 'phone_code', phone_code, 'default_locale', default_locale)) FROM public.countries),
    'brands', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name->>$1, 'is_premium', is_premium, 'is_electric', is_electric, 'logo_url', logo_url)) FROM public.brands),
    'body_types', (SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name->>$1)) FROM public.body_types),
    'fuel_types', (SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name->>$1)) FROM public.fuel_types),
    'transmission_types', (SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name->>$1)) FROM public.transmission_types),
    'colors', (SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'hex', hex, 'name', name->>$1)) FROM public.colors),
    'features', (SELECT jsonb_agg(jsonb_build_object('id', id, 'code', code, 'category', category, 'name', name->>$1)) FROM public.features)
  );
$$;
GRANT EXECUTE ON FUNCTION public.list_reference_data(varchar) TO anon, authenticated, dealer, admin;