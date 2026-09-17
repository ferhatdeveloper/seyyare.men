-- Seyyare.men — Full brand/model demo catalog
-- At least one listing per popular model for every brand in public.brands.
-- Idempotent via deterministic UUIDs + ON CONFLICT DO NOTHING.

SET search_path TO public;

DO $$
DECLARE
  u_dealer uuid := 'c1000000-0000-4000-8000-000000000001';
  u_anadolu uuid := 'c1000000-0000-4000-8000-000000000002';
  fuel_gas int;
  fuel_hyb int;
  fuel_elec int;
  fuel_diz int;
  tr_auto int;
  tr_manual int;
  tr_cvt int;
  body_sedan int;
  body_suv int;
  body_hatch int;
  body_pickup int;
  body_coupe int;
  body_van int;
  covers text[] := ARRAY[
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1593941707881-a5cfde87040b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80'
  ];
  cities text[] := ARRAY['Erbil', 'Baghdad', 'Sulaymaniyah', 'Basra', 'Mosul', 'Duhok', 'Kirkuk'];
  r record;
  vid uuid;
  seller uuid;
  fuel_id int;
  tr_id int;
  body_id int;
  yr int;
  km int;
  price bigint;
  cover text;
  city text;
  featured_flag boolean;
  n_inserted int := 0;
BEGIN
  SELECT id INTO fuel_gas FROM fuel_types WHERE code = 'gasoline';
  SELECT id INTO fuel_hyb FROM fuel_types WHERE code = 'hybrid';
  SELECT id INTO fuel_elec FROM fuel_types WHERE code = 'electric';
  SELECT id INTO fuel_diz FROM fuel_types WHERE code = 'diesel';
  SELECT id INTO tr_auto FROM transmission_types WHERE code = 'automatic';
  SELECT id INTO tr_manual FROM transmission_types WHERE code = 'manual';
  SELECT id INTO tr_cvt FROM transmission_types WHERE code = 'cvt';
  SELECT id INTO body_sedan FROM body_types WHERE code = 'sedan';
  SELECT id INTO body_suv FROM body_types WHERE code = 'suv';
  SELECT id INTO body_hatch FROM body_types WHERE code = 'hatchback';
  SELECT id INTO body_pickup FROM body_types WHERE code = 'pickup';
  SELECT id INTO body_coupe FROM body_types WHERE code = 'coupe';
  SELECT id INTO body_van FROM body_types WHERE code = 'van';

  IF fuel_gas IS NULL OR tr_auto IS NULL OR body_sedan IS NULL THEN
    RAISE EXCEPTION 'seed_demo_catalog: reference types missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = u_dealer) THEN
    RAISE EXCEPTION 'seed_demo_catalog: demo users missing — run seed_demo.sql first';
  END IF;

  FOR r IN
    WITH catalog(brand_en, model, body_code, fuel_code, base_price, year_off, ord) AS (
      VALUES
      ('Toyota', 'Corolla', 'sedan', 'hybrid', 52000000::bigint, 2, 1),
      ('Toyota', 'Camry', 'sedan', 'gasoline', 68000000, 1, 2),
      ('Toyota', 'RAV4', 'suv', 'hybrid', 72000000, 2, 3),
      ('Toyota', 'Land Cruiser', 'suv', 'gasoline', 145000000, 1, 4),
      ('Toyota', 'Hilux', 'pickup', 'diesel', 78000000, 3, 5),
      ('Volkswagen', 'Golf', 'hatchback', 'gasoline', 42000000, 3, 1),
      ('Volkswagen', 'Passat', 'sedan', 'diesel', 55000000, 2, 2),
      ('Volkswagen', 'Tiguan', 'suv', 'gasoline', 67000000, 2, 3),
      ('Volkswagen', 'Polo', 'hatchback', 'gasoline', 32000000, 4, 4),
      ('BMW', '320i', 'sedan', 'gasoline', 74000000, 3, 1),
      ('BMW', '520i', 'sedan', 'gasoline', 98000000, 2, 2),
      ('BMW', 'X3', 'suv', 'gasoline', 105000000, 2, 3),
      ('BMW', 'X5', 'suv', 'diesel', 128000000, 1, 4),
      ('Mercedes-Benz', 'C 200', 'sedan', 'gasoline', 118000000, 1, 1),
      ('Mercedes-Benz', 'E 200', 'sedan', 'gasoline', 142000000, 2, 2),
      ('Mercedes-Benz', 'GLC 200', 'suv', 'gasoline', 135000000, 1, 3),
      ('Mercedes-Benz', 'GLE 350', 'suv', 'diesel', 168000000, 2, 4),
      ('Audi', 'A3', 'hatchback', 'gasoline', 62000000, 2, 1),
      ('Audi', 'A4', 'sedan', 'gasoline', 78000000, 2, 2),
      ('Audi', 'Q5', 'suv', 'gasoline', 112000000, 1, 3),
      ('Audi', 'Q7', 'suv', 'diesel', 148000000, 3, 4),
      ('Ford', 'Focus', 'hatchback', 'gasoline', 38000000, 4, 1),
      ('Ford', 'Escape', 'suv', 'gasoline', 58000000, 2, 2),
      ('Ford', 'Ranger', 'pickup', 'diesel', 72000000, 2, 3),
      ('Ford', 'Mustang', 'coupe', 'gasoline', 95000000, 3, 4),
      ('Honda', 'Civic', 'sedan', 'gasoline', 48000000, 2, 1),
      ('Honda', 'Accord', 'sedan', 'hybrid', 72000000, 1, 2),
      ('Honda', 'CR-V', 'suv', 'gasoline', 68000000, 2, 3),
      ('Honda', 'HR-V', 'suv', 'gasoline', 52000000, 3, 4),
      ('Hyundai', 'Elantra', 'sedan', 'gasoline', 42000000, 2, 1),
      ('Hyundai', 'Tucson', 'suv', 'hybrid', 61000000, 2, 2),
      ('Hyundai', 'Santa Fe', 'suv', 'gasoline', 78000000, 1, 3),
      ('Hyundai', 'Ioniq 5', 'suv', 'electric', 89000000, 1, 4),
      ('Kia', 'Cerato', 'sedan', 'gasoline', 40000000, 3, 1),
      ('Kia', 'Sportage', 'suv', 'diesel', 52000000, 2, 2),
      ('Kia', 'Sorento', 'suv', 'gasoline', 72000000, 2, 3),
      ('Kia', 'EV6', 'suv', 'electric', 98000000, 1, 4),
      ('Nissan', 'Sunny', 'sedan', 'gasoline', 28000000, 4, 1),
      ('Nissan', 'Altima', 'sedan', 'gasoline', 48000000, 2, 2),
      ('Nissan', 'X-Trail', 'suv', 'gasoline', 62000000, 2, 3),
      ('Nissan', 'Patrol', 'suv', 'gasoline', 155000000, 1, 4),
      ('Peugeot', '208', 'hatchback', 'gasoline', 32000000, 3, 1),
      ('Peugeot', '3008', 'suv', 'gasoline', 58000000, 2, 2),
      ('Peugeot', '5008', 'suv', 'diesel', 68000000, 2, 3),
      ('Renault', 'Clio', 'hatchback', 'gasoline', 30000000, 3, 1),
      ('Renault', 'Megane', 'sedan', 'gasoline', 38000000, 3, 2),
      ('Renault', 'Duster', 'suv', 'gasoline', 42000000, 2, 3),
      ('Fiat', 'Egea', 'sedan', 'gasoline', 28000000, 3, 1),
      ('Fiat', '500', 'hatchback', 'gasoline', 26000000, 4, 2),
      ('Fiat', 'Tipo', 'sedan', 'diesel', 32000000, 3, 3),
      ('Opel', 'Corsa', 'hatchback', 'gasoline', 30000000, 3, 1),
      ('Opel', 'Astra', 'hatchback', 'gasoline', 36000000, 2, 2),
      ('Opel', 'Mokka', 'suv', 'gasoline', 45000000, 2, 3),
      ('Skoda', 'Octavia', 'sedan', 'gasoline', 48000000, 2, 1),
      ('Skoda', 'Superb', 'sedan', 'diesel', 62000000, 2, 2),
      ('Skoda', 'Kodiaq', 'suv', 'gasoline', 78000000, 1, 3),
      ('Seat', 'Ibiza', 'hatchback', 'gasoline', 30000000, 3, 1),
      ('Seat', 'Leon', 'hatchback', 'gasoline', 38000000, 2, 2),
      ('Seat', 'Ateca', 'suv', 'gasoline', 52000000, 2, 3),
      ('Citroen', 'C3', 'hatchback', 'gasoline', 28000000, 3, 1),
      ('Citroen', 'C5 Aircross', 'suv', 'diesel', 55000000, 2, 2),
      ('Mazda', '3', 'hatchback', 'gasoline', 42000000, 2, 1),
      ('Mazda', '6', 'sedan', 'gasoline', 52000000, 3, 2),
      ('Mazda', 'CX-5', 'suv', 'gasoline', 58000000, 2, 3),
      ('Mazda', 'CX-30', 'suv', 'gasoline', 48000000, 1, 4),
      ('Mitsubishi', 'Lancer', 'sedan', 'gasoline', 32000000, 5, 1),
      ('Mitsubishi', 'Outlander', 'suv', 'hybrid', 62000000, 2, 2),
      ('Mitsubishi', 'Pajero', 'suv', 'diesel', 88000000, 3, 3),
      ('Suzuki', 'Swift', 'hatchback', 'gasoline', 26000000, 2, 1),
      ('Suzuki', 'Vitara', 'suv', 'gasoline', 42000000, 2, 2),
      ('Suzuki', 'Jimny', 'suv', 'gasoline', 48000000, 1, 3),
      ('Subaru', 'Impreza', 'hatchback', 'gasoline', 45000000, 3, 1),
      ('Subaru', 'Forester', 'suv', 'gasoline', 62000000, 2, 2),
      ('Subaru', 'Outback', 'suv', 'gasoline', 72000000, 2, 3),
      ('Lexus', 'IS 300', 'sedan', 'gasoline', 98000000, 2, 1),
      ('Lexus', 'RX 350', 'suv', 'hybrid', 145000000, 1, 2),
      ('Lexus', 'NX 350h', 'suv', 'hybrid', 118000000, 1, 3),
      ('Lexus', 'LX 600', 'suv', 'gasoline', 220000000, 1, 4),
      ('Tesla', 'Model 3', 'sedan', 'electric', 98000000, 1, 1),
      ('Tesla', 'Model Y', 'suv', 'electric', 112000000, 1, 2),
      ('Tesla', 'Model S', 'sedan', 'electric', 165000000, 2, 3),
      ('Porsche', 'Cayenne', 'suv', 'gasoline', 210000000, 2, 1),
      ('Porsche', 'Macan', 'suv', 'gasoline', 168000000, 1, 2),
      ('Porsche', '911 Carrera', 'coupe', 'gasoline', 285000000, 2, 3),
      ('Land Rover', 'Range Rover Sport', 'suv', 'diesel', 198000000, 2, 1),
      ('Land Rover', 'Discovery', 'suv', 'diesel', 155000000, 3, 2),
      ('Land Rover', 'Defender', 'suv', 'gasoline', 175000000, 1, 3),
      ('Volvo', 'XC40', 'suv', 'gasoline', 82000000, 2, 1),
      ('Volvo', 'XC60', 'suv', 'hybrid', 118000000, 1, 2),
      ('Volvo', 'S60', 'sedan', 'gasoline', 78000000, 3, 3),
      ('Jeep', 'Wrangler', 'suv', 'gasoline', 98000000, 2, 1),
      ('Jeep', 'Cherokee', 'suv', 'gasoline', 72000000, 3, 2),
      ('Jeep', 'Compass', 'suv', 'gasoline', 58000000, 2, 3),
      ('Chevrolet', 'Malibu', 'sedan', 'gasoline', 42000000, 3, 1),
      ('Chevrolet', 'Tahoe', 'suv', 'gasoline', 125000000, 2, 2),
      ('Chevrolet', 'Silverado', 'pickup', 'gasoline', 98000000, 2, 3),
      ('Dacia', 'Duster', 'suv', 'gasoline', 32000000, 2, 1),
      ('Dacia', 'Sandero', 'hatchback', 'gasoline', 22000000, 2, 2),
      ('Dacia', 'Logan', 'sedan', 'gasoline', 24000000, 3, 3),
      ('BYD', 'Atto 3', 'suv', 'electric', 68000000, 1, 1),
      ('BYD', 'Seal', 'sedan', 'electric', 78000000, 1, 2),
      ('BYD', 'Han', 'sedan', 'electric', 92000000, 2, 3),
      ('Togg', 'T10X', 'suv', 'electric', 89000000, 0, 1),
      ('Togg', 'T10F', 'sedan', 'electric', 82000000, 0, 2)
    )
    SELECT
      b.id AS brand_id,
      b.name->>'en' AS brand_en,
      c.model,
      c.body_code,
      c.fuel_code,
      c.base_price,
      c.year_off,
      c.ord
    FROM catalog c
    JOIN brands b ON b.name->>'en' = c.brand_en
    ORDER BY b.id, c.ord
  LOOP
    vid := ('b2000000-0000-4000-8000-' || lpad((r.brand_id * 100 + r.ord)::text, 12, '0'))::uuid;
    seller := CASE WHEN (r.brand_id + r.ord) % 2 = 0 THEN u_dealer ELSE u_anadolu END;

    fuel_id := CASE r.fuel_code
      WHEN 'hybrid' THEN fuel_hyb
      WHEN 'electric' THEN fuel_elec
      WHEN 'diesel' THEN fuel_diz
      ELSE fuel_gas
    END;
    tr_id := CASE
      WHEN r.fuel_code = 'hybrid' THEN COALESCE(tr_cvt, tr_auto)
      WHEN r.body_code = 'hatchback' AND r.ord % 3 = 0 THEN COALESCE(tr_manual, tr_auto)
      ELSE tr_auto
    END;
    body_id := CASE r.body_code
      WHEN 'suv' THEN body_suv
      WHEN 'hatchback' THEN body_hatch
      WHEN 'pickup' THEN body_pickup
      WHEN 'coupe' THEN body_coupe
      WHEN 'van' THEN body_van
      ELSE body_sedan
    END;

    yr := 2025 - r.year_off;
    km := 8000 + ((r.brand_id * 17 + r.ord * 1300) % 90000);
    price := r.base_price + ((r.brand_id * 100000 + r.ord * 250000) % 3000000);
    cover := covers[1 + ((r.brand_id + r.ord - 1) % array_length(covers, 1))];
    city := cities[1 + ((r.brand_id + r.ord - 1) % array_length(cities, 1))];
    featured_flag := (r.ord = 1 AND r.brand_id <= 12);

    INSERT INTO vehicles (
      id, seller_id, make_id, model, year, mileage_km, fuel_type_id, transmission_id, body_type_id,
      condition, price_amount, price_currency, negotiable, country_code, city, status,
      title_original, description_original, cover_url, featured, published_at
    ) VALUES (
      vid, seller, r.brand_id, r.model, yr, km, fuel_id, tr_id, body_id,
      CASE WHEN r.year_off <= 1 THEN 'like_new' ELSE 'used' END,
      price, 'IQD', true, 'IQ', city, 'active',
      r.brand_en || ' ' || r.model,
      'Demo ilan · ' || r.brand_en || ' ' || r.model || ' · ' || city || ' · ekspertizli soft-launch stok.',
      cover, featured_flag, now() - ((r.brand_id * 3 + r.ord) || ' hours')::interval
    )
    ON CONFLICT (id) DO UPDATE SET
      make_id = EXCLUDED.make_id,
      model = EXCLUDED.model,
      year = EXCLUDED.year,
      mileage_km = EXCLUDED.mileage_km,
      price_amount = EXCLUDED.price_amount,
      city = EXCLUDED.city,
      cover_url = EXCLUDED.cover_url,
      title_original = EXCLUDED.title_original,
      description_original = EXCLUDED.description_original,
      featured = EXCLUDED.featured,
      status = 'active',
      published_at = EXCLUDED.published_at,
      updated_at = now();

    INSERT INTO vehicle_media (vehicle_id, url, type, is_cover, sort_order)
    SELECT vid, cover, 'image', true, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM vehicle_media m WHERE m.vehicle_id = vid AND m.is_cover
    );

    n_inserted := n_inserted + 1;
  END LOOP;

  -- Ensure every brand has at least one active vehicle (fallback generic model)
  FOR r IN
    SELECT b.id AS brand_id, b.name->>'en' AS brand_en
    FROM brands b
    WHERE NOT EXISTS (
      SELECT 1 FROM vehicles v WHERE v.make_id = b.id AND v.status = 'active'
    )
  LOOP
    vid := ('b2000000-0000-4000-8000-' || lpad((r.brand_id * 100)::text, 12, '0'))::uuid;
    INSERT INTO vehicles (
      id, seller_id, make_id, model, year, mileage_km, fuel_type_id, transmission_id, body_type_id,
      condition, price_amount, price_currency, negotiable, country_code, city, status,
      title_original, description_original, cover_url, featured, published_at
    ) VALUES (
      vid, u_dealer, r.brand_id, 'Demo', 2022, 45000, fuel_gas, tr_auto, body_sedan,
      'used', 45000000, 'IQD', true, 'IQ', 'Erbil', 'active',
      r.brand_en || ' Demo',
      'Otomatik oluşturulan demo ilan.',
      covers[1], false, now()
    )
    ON CONFLICT (id) DO NOTHING;
    n_inserted := n_inserted + 1;
  END LOOP;

  RAISE NOTICE 'seed_demo_catalog: % brand/model listings upserted', n_inserted;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'mv_active_listings_feed'
  ) THEN
    REFRESH MATERIALIZED VIEW public.mv_active_listings_feed;
  END IF;
END $$;
