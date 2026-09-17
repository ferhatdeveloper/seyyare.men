-- Seyyare.men — Soft-launch demo marketplace data
-- Password for all demo accounts: Demo123!
-- Idempotent: fixed UUIDs + ON CONFLICT / NOT EXISTS guards.

SET search_path TO public;

-- bcrypt of Demo123! (cost 10)
-- $2b$10$pvE/HVTpAO6JYBtUb4TbYe2CE5dA5vELg6jfotsEC0.3WXuZkGqHq
DO $$
DECLARE
  pw text := '$2b$10$pvE/HVTpAO6JYBtUb4TbYe2CE5dA5vELg6jfotsEC0.3WXuZkGqHq';
  u_dealer uuid := 'c1000000-0000-4000-8000-000000000001';
  u_anadolu uuid := 'c1000000-0000-4000-8000-000000000002';
  u_buyer uuid := 'c1000000-0000-4000-8000-000000000003';
  u_driver uuid := 'c1000000-0000-4000-8000-000000000004';
  u_admin uuid := 'c1000000-0000-4000-8000-000000000099';
  v_bmw uuid := 'b1000000-0000-4000-8000-000000000001';
  v_corolla uuid := 'b1000000-0000-4000-8000-000000000002';
  v_tiguan uuid := 'b1000000-0000-4000-8000-000000000003';
  v_merc uuid := 'b1000000-0000-4000-8000-000000000004';
  v_togg uuid := 'b1000000-0000-4000-8000-000000000005';
  v_kia uuid := 'b1000000-0000-4000-8000-000000000006';
  v_hyun uuid := 'b1000000-0000-4000-8000-000000000007';
  v_mazda uuid := 'b1000000-0000-4000-8000-000000000008';
  r1 uuid := 'd1000000-0000-4000-8000-000000000001';
  r2 uuid := 'd1000000-0000-4000-8000-000000000002';
  r3 uuid := 'd1000000-0000-4000-8000-000000000003';
  r4 uuid := 'd1000000-0000-4000-8000-000000000004';
  a1 uuid := 'e1000000-0000-4000-8000-000000000001';
  a2 uuid := 'e1000000-0000-4000-8000-000000000002';
  bid_bmw int;
  bid_toyota int;
  bid_vw int;
  bid_merc int;
  bid_togg int;
  bid_kia int;
  bid_hyun int;
  bid_mazda int;
  fuel_gas int;
  fuel_hyb int;
  fuel_elec int;
  fuel_diz int;
  tr_auto int;
  tr_cvt int;
  body_sedan int;
  body_suv int;
BEGIN
  SELECT id INTO bid_bmw FROM brands WHERE name->>'en' = 'BMW' LIMIT 1;
  SELECT id INTO bid_toyota FROM brands WHERE name->>'en' = 'Toyota' LIMIT 1;
  SELECT id INTO bid_vw FROM brands WHERE name->>'en' = 'Volkswagen' LIMIT 1;
  SELECT id INTO bid_merc FROM brands WHERE name->>'en' = 'Mercedes-Benz' LIMIT 1;
  SELECT id INTO bid_togg FROM brands WHERE name->>'en' = 'Togg' LIMIT 1;
  SELECT id INTO bid_kia FROM brands WHERE name->>'en' = 'Kia' LIMIT 1;
  SELECT id INTO bid_hyun FROM brands WHERE name->>'en' = 'Hyundai' LIMIT 1;
  SELECT id INTO bid_mazda FROM brands WHERE name->>'en' = 'Mazda' LIMIT 1;

  SELECT id INTO fuel_gas FROM fuel_types WHERE code = 'gasoline';
  SELECT id INTO fuel_hyb FROM fuel_types WHERE code = 'hybrid';
  SELECT id INTO fuel_elec FROM fuel_types WHERE code = 'electric';
  SELECT id INTO fuel_diz FROM fuel_types WHERE code = 'diesel';
  SELECT id INTO tr_auto FROM transmission_types WHERE code = 'automatic';
  SELECT id INTO tr_cvt FROM transmission_types WHERE code = 'cvt';
  SELECT id INTO body_sedan FROM body_types WHERE code = 'sedan';
  SELECT id INTO body_suv FROM body_types WHERE code = 'suv';

  IF bid_bmw IS NULL THEN
    RAISE EXCEPTION 'seed_demo: brands missing — run 99_seed.sql first';
  END IF;

  -- Users
  INSERT INTO users (id, email, phone, password_hash, role, locale, email_verified_at, is_active)
  VALUES
    (u_dealer, 'premium@seyyare.men', '+9647501000001', pw, 'dealer', 'tr', now(), true),
    (u_anadolu, 'anadolu@seyyare.men', '+9647501000002', pw, 'dealer', 'tr', now(), true),
    (u_buyer, 'demo@seyyare.men', '+9647501000003', pw, 'user', 'tr', now(), true),
    (u_driver, 'driver@seyyare.men', '+9647501000004', pw, 'user', 'tr', now(), true),
    (u_admin, 'admin@seyyare.men', '+9647501000099', pw, 'admin', 'tr', now(), true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_profiles (user_id, display_name, bio, country_code, city, verified, rating_avg, rating_count, gender)
  VALUES
    (u_dealer, 'Seyyare Premium Galeri', 'Baghdad premium ikinci el — ekspertizli araçlar.', 'IQ', 'Baghdad', true, 4.80, 124, 'male'),
    (u_anadolu, 'Anadolu Oto Market', 'Erbil aile / hibrit / SUV odaklı satış.', 'IQ', 'Erbil', true, 4.60, 86, 'male'),
    (u_buyer, 'Demo Kullanıcı', 'Soft-launch demo hesap.', 'IQ', 'Erbil', true, 0, 0, 'female'),
    (u_driver, 'Demo Şoför', 'Taksi / paylaşımlı / havalimanı sürücü demosu.', 'IQ', 'Erbil', true, 4.90, 42, 'male'),
    (u_admin, 'Seyyare Admin', 'Platform admin', 'IQ', 'Baghdad', true, 0, 0, 'unspecified')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO dealer_profiles (
    user_id, business_name, address, city, country_code, verified, rating_avg, rating_count, total_listings
  ) VALUES
    (u_dealer, 'Seyyare Premium Galeri', 'Karada District, Baghdad', 'Baghdad', 'IQ', true, 4.80, 124, 5),
    (u_anadolu, 'Anadolu Oto Market', '100 Meter Street, Erbil', 'Erbil', 'IQ', true, 4.60, 86, 3)
  ON CONFLICT (user_id) DO NOTHING;

  -- Wallets (buyer funded for listing fee demos)
  INSERT INTO wallets (user_id, balance_iqd, updated_at) VALUES
    (u_dealer, 500000, now()),
    (u_anadolu, 250000, now()),
    (u_buyer, 150000, now()),
    (u_driver, 85000, now()),
    (u_admin, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Taxi driver online near Erbil (for nearby_drivers demos)
  INSERT INTO public.drivers (user_id, online, gender, geo, updated_at)
  VALUES (
    u_driver,
    true,
    'male',
    ST_SetSRID(ST_MakePoint(44.0094, 36.1911), 4326)::geography,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    online = EXCLUDED.online,
    gender = EXCLUDED.gender,
    geo = EXCLUDED.geo,
    updated_at = now();

  INSERT INTO wallet_ledger (user_id, amount_iqd, kind, note)
  SELECT u_buyer, 150000, 'topup', 'Soft-launch demo topup'
  WHERE NOT EXISTS (
    SELECT 1 FROM wallet_ledger WHERE user_id = u_buyer AND kind = 'topup' AND note = 'Soft-launch demo topup'
  );

  -- Vehicles
  INSERT INTO vehicles (
    id, seller_id, make_id, model, year, mileage_km, fuel_type_id, transmission_id, body_type_id,
    condition, price_amount, price_currency, negotiable, country_code, city, status,
    title_original, description_original, cover_url, featured, published_at
  ) VALUES
    (v_bmw, u_dealer, bid_bmw, '320i', 2021, 42000, fuel_gas, tr_auto, body_sedan,
     'used', 74000000, 'IQD', true, 'IQ', 'Baghdad', 'active',
     'BMW 320i M Sport', 'Ekspertizli · tek sahip · M Sport paket.',
     'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
     true, now() - interval '2 hours'),
    (v_corolla, u_anadolu, bid_toyota, 'Corolla', 2022, 28000, fuel_hyb, tr_cvt, body_sedan,
     'used', 58000000, 'IQD', true, 'IQ', 'Erbil', 'active',
     'Toyota Corolla Hybrid', 'Hibrit · ekonomik · aile aracı.',
     'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
     true, now() - interval '5 hours'),
    (v_tiguan, u_dealer, bid_vw, 'Tiguan', 2020, 61000, fuel_gas, tr_auto, body_suv,
     'used', 67200000, 'IQD', true, 'IQ', 'Basra', 'active',
     'Volkswagen Tiguan 1.5 TSI', 'SUV · panoramic · bakım kayıtlı.',
     'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
     true, now() - interval '8 hours'),
    (v_merc, u_dealer, bid_merc, 'C 200', 2023, 12000, fuel_gas, tr_auto, body_sedan,
     'like_new', 128000000, 'IQD', false, 'IQ', 'Baghdad', 'active',
     'Mercedes-Benz C 200 AMG', 'AMG line · düşük km · bayiden.',
     'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
     true, now() - interval '12 hours'),
    (v_togg, u_anadolu, bid_togg, 'T10X', 2024, 8000, fuel_elec, tr_auto, body_suv,
     'like_new', 89000000, 'IQD', true, 'IQ', 'Duhok', 'active',
     'Togg T10X V2 Uzun Menzil', 'Elektrik · uzun menzil · yerli.',
     'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
     true, now() - interval '1 day'),
    (v_kia, u_anadolu, bid_kia, 'Sportage', 2021, 45000, fuel_diz, tr_auto, body_suv,
     'used', 52000000, 'IQD', true, 'IQ', 'Erbil', 'active',
     'Kia Sportage 1.6 CRDi', 'Dizel SUV · şehir içi rahat.',
     'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80',
     false, now() - interval '2 days'),
    (v_hyun, u_dealer, bid_hyun, 'Tucson', 2022, 33000, fuel_hyb, tr_auto, body_suv,
     'used', 61000000, 'IQD', true, 'IQ', 'Sulaymaniyah', 'active',
     'Hyundai Tucson Hybrid', 'Hibrit SUV · garanti devam.',
     'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
     false, now() - interval '3 days'),
    (v_mazda, u_dealer, bid_mazda, 'CX-5', 2019, 72000, fuel_gas, tr_auto, body_suv,
     'used', 45500000, 'IQD', true, 'IQ', 'Kirkuk', 'active',
     'Mazda CX-5 Skyactiv', 'Skyactiv · temiz iç mekan.',
     'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=80',
     false, now() - interval '4 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO vehicle_media (vehicle_id, url, type, is_cover, sort_order)
  SELECT v.id, v.cover_url, 'image', true, 0
  FROM vehicles v
  WHERE v.id IN (v_bmw, v_corolla, v_tiguan, v_merc, v_togg, v_kia, v_hyun, v_mazda)
    AND v.cover_url IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM vehicle_media m WHERE m.vehicle_id = v.id AND m.is_cover
    );

  -- Rentals (sale cars also listed for rent where sensible)
  INSERT INTO rentals (
    id, owner_id, vehicle_id, daily_rate_amount, daily_rate_currency,
    weekly_rate_amount, monthly_rate_amount, deposit_amount,
    min_days, max_days, insurance_included, delivery_available, instant_book,
    age_requirement, country_code, city, status
  ) VALUES
    (r1, u_dealer, v_bmw, 160000, 'IQD', 750000, 1850000, 600000, 1, 30, true, true, true, 21, 'IQ', 'Erbil', 'active'),
    (r2, u_anadolu, v_togg, 112000, 'IQD', 640000, 1450000, 480000, 2, 21, true, true, false, 21, 'IQ', 'Duhok', 'active'),
    (r3, u_dealer, v_tiguan, 96000, 'IQD', 560000, 1200000, 400000, 1, 45, false, false, true, 21, 'IQ', 'Baghdad', 'active'),
    (r4, u_anadolu, v_corolla, 72000, 'IQD', 420000, 980000, 300000, 1, 30, true, true, true, 21, 'IQ', 'Erbil', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Live auctions
  INSERT INTO auctions (
    id, vehicle_id, seller_id, title, city, currency, start_price, current_bid, bid_count, status, ends_at, cover_url
  ) VALUES
    (a1, v_bmw, u_dealer, 'BMW 320i M Sport · Açık artırma', 'Erbil', 'IQD',
     55000000, 62500000, 3, 'live', now() + interval '18 hours',
     'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'),
    (a2, v_togg, u_anadolu, 'Togg T10X · Canlı müzayede', 'Duhok', 'IQD',
     48000000, 52000000, 2, 'live', now() + interval '8 hours',
     'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auction_bids (auction_id, bidder_id, amount, created_at)
  SELECT a1, u_buyer, 62500000, now() - interval '30 minutes'
  WHERE NOT EXISTS (SELECT 1 FROM auction_bids WHERE auction_id = a1 AND amount = 62500000);

  INSERT INTO auction_bids (auction_id, bidder_id, amount, created_at)
  SELECT a2, u_buyer, 52000000, now() - interval '12 minutes'
  WHERE NOT EXISTS (SELECT 1 FROM auction_bids WHERE auction_id = a2 AND amount = 52000000);

  RAISE NOTICE 'seed_demo: marketplace demo data ready (password Demo123!)';
END $$;

-- Refresh home feed matview (non-concurrent inside init is OK)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'mv_active_listings_feed'
  ) THEN
    REFRESH MATERIALIZED VIEW public.mv_active_listings_feed;
  END IF;
END $$;
