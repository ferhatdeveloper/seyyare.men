-- Seyyare.men — Faz 1 Schema
-- users, vehicles, rentals, favorites, conversations, messages, reviews, content_translations

SET search_path TO public;

-- ============== USERS ==============
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email citext UNIQUE,
  phone varchar(32) UNIQUE,
  password_hash text NOT NULL,
  role varchar(16) NOT NULL DEFAULT 'user' CHECK (role IN ('user','dealer','admin')),
  locale varchar(10) NOT NULL DEFAULT 'tr',
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  is_active boolean DEFAULT true,
  is_banned boolean DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name varchar(64),
  avatar_url text,
  bio text,
  country_code char(2) REFERENCES public.countries(code),
  city varchar(64),
  geo geography(Point, 4326),
  verified boolean DEFAULT false,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_geo ON public.user_profiles USING GIST(geo);

CREATE TABLE IF NOT EXISTS public.dealer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_name varchar(128) NOT NULL,
  license_no varchar(64),
  tax_no varchar(64),
  address text,
  city varchar(64),
  country_code char(2) REFERENCES public.countries(code),
  geo geography(Point, 4326),
  verified boolean DEFAULT false,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  total_listings int DEFAULT 0,
  qr_code_url text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_profiles_geo ON public.dealer_profiles USING GIST(geo);

-- ============== REFRESH TOKENS ==============
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash varchar(128) UNIQUE NOT NULL,
  device_info jsonb,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON public.refresh_tokens(expires_at);

-- ============== VEHICLES ==============
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vin varchar(32),
  make_id int REFERENCES public.brands(id),
  make_custom text,
  model varchar(64),
  trim varchar(64),
  year int CHECK (year BETWEEN 1900 AND 2100),
  mileage_km int CHECK (mileage_km >= 0),
  fuel_type_id int REFERENCES public.fuel_types(id),
  transmission_id int REFERENCES public.transmission_types(id),
  body_type_id int REFERENCES public.body_types(id),
  color_id int REFERENCES public.colors(id),
  interior_color_id int REFERENCES public.colors(id),
  condition varchar(16) CHECK (condition IN ('new','like_new','used','damaged','salvage')),
  price_amount bigint,
  price_currency char(3) DEFAULT 'USD',
  negotiable boolean DEFAULT true,
  country_code char(2) REFERENCES public.countries(code),
  city varchar(64),
  geo geography(Point, 4326),
  status varchar(16) DEFAULT 'draft' CHECK (status IN ('draft','active','reserved','sold','expired','removed')),
  views_count int DEFAULT 0,
  favorites_count int DEFAULT 0,
  title_original text,
  title_translations jsonb DEFAULT '{}'::jsonb,
  description_original text,
  description_translations jsonb DEFAULT '{}'::jsonb,
  features int[] DEFAULT '{}',
  search_tsv tsvector,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_seller ON public.vehicles(seller_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_geo ON public.vehicles USING GIST(geo);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_year ON public.vehicles(make_id, model, year);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON public.vehicles(price_amount);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON public.vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_search_tsv ON public.vehicles USING GIN(search_tsv);

CREATE OR REPLACE FUNCTION public.vehicles_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title_original,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description_original,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.make_custom,'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.model,'')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_search_tsv ON public.vehicles;
CREATE TRIGGER trg_vehicles_search_tsv
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.vehicles_search_tsv_update();

CREATE TABLE IF NOT EXISTS public.vehicle_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  type varchar(16) DEFAULT 'image' CHECK (type IN ('image','video')),
  is_cover boolean DEFAULT false,
  sort_order int DEFAULT 0,
  width int,
  height int,
  duration_sec int,
  ai_tags jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle ON public.vehicle_media(vehicle_id, sort_order);

CREATE TABLE IF NOT EXISTS public.ai_vehicle_analysis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  recognized_make varchar(64),
  recognized_model varchar(64),
  recognized_year int,
  confidence numeric(4,3),
  damage_detected jsonb DEFAULT '{}'::jsonb,
  condition_score numeric(4,2),
  suggested_price_amount bigint,
  suggested_price_currency char(3),
  suggested_price_range_low bigint,
  suggested_price_range_high bigint,
  price_factors jsonb DEFAULT '[]'::jsonb,
  raw_response jsonb,
  model_used varchar(128),
  cost_usd numeric(10,6),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_vehicle_analysis_vehicle ON public.ai_vehicle_analysis(vehicle_id);

-- ============== RENTALS ==============
CREATE TABLE IF NOT EXISTS public.rentals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  daily_rate_amount bigint,
  daily_rate_currency char(3) DEFAULT 'USD',
  weekly_rate_amount bigint,
  monthly_rate_amount bigint,
  deposit_amount bigint,
  min_days int DEFAULT 1,
  max_days int DEFAULT 30,
  insurance_included boolean DEFAULT false,
  delivery_available boolean DEFAULT false,
  delivery_radius_km int DEFAULT 0,
  instant_book boolean DEFAULT false,
  age_requirement int DEFAULT 21,
  country_code char(2) REFERENCES public.countries(code),
  city varchar(64),
  geo geography(Point, 4326),
  status varchar(16) DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  total_bookings int DEFAULT 0,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rentals_owner ON public.rentals(owner_id);
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle ON public.rentals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_geo ON public.rentals USING GIST(geo);

CREATE TABLE IF NOT EXISTS public.rental_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  date date NOT NULL,
  status varchar(16) DEFAULT 'available' CHECK (status IN ('available','booked','blocked')),
  custom_price_amount bigint,
  custom_price_currency char(3),
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(rental_id, date)
);
CREATE INDEX IF NOT EXISTS idx_rental_availability_rental_date ON public.rental_availability(rental_id, date);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id),
  renter_id uuid NOT NULL REFERENCES public.users(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days int NOT NULL,
  daily_rate_snapshot bigint,
  total_amount bigint,
  currency char(3),
  deposit_amount bigint,
  price_breakdown jsonb DEFAULT '[]'::jsonb,
  status varchar(16) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','active','completed','cancelled','rejected')),
  payment_id uuid,
  pickup_at timestamptz,
  return_at timestamptz,
  contract_pdf_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bookings_dates CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_bookings_rental ON public.bookings(rental_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON public.bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  currency char(3) NOT NULL,
  provider varchar(32),
  status varchar(16) DEFAULT 'pending' CHECK (status IN ('pending','authorized','captured','refunded','failed')),
  txn_id text,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON public.booking_payments(booking_id);

-- ============== FAVORITES / SEARCHES ==============
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(64),
  filters jsonb DEFAULT '{}'::jsonb,
  alerts_enabled boolean DEFAULT false,
  alert_interval_hours int DEFAULT 24,
  last_alert_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_match jsonb NOT NULL,
  threshold_amount bigint,
  threshold_currency char(3),
  active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============== MESSAGING ==============
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type varchar(16) DEFAULT 'direct' CHECK (type IN ('direct','group')),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_conversations_vehicle ON public.conversations(vehicle_id);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id),
  body text,
  media_url text,
  media_type varchar(16),
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- ============== REVIEWS ==============
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_id uuid NOT NULL,
  target_type varchar(16) NOT NULL CHECK (target_type IN ('user','dealer','rental')),
  reviewer_id uuid NOT NULL REFERENCES public.users(id),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(target_id, target_type, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON public.reviews(target_id, target_type);

-- ============== TRANSLATIONS ==============
CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type varchar(32) NOT NULL,
  content_id uuid NOT NULL,
  locale varchar(10) NOT NULL,
  field varchar(32) NOT NULL,
  value text NOT NULL,
  source_locale varchar(10),
  translated_by varchar(16) DEFAULT 'ai' CHECK (translated_by IN ('ai','human','manual')),
  model_used varchar(128),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(content_type, content_id, locale, field)
);
CREATE INDEX IF NOT EXISTS idx_content_translations_lookup ON public.content_translations(content_type, content_id, locale);

-- ============== AI / MARKET ==============
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  price_amount bigint,
  currency char(3),
  recorded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_history_vehicle ON public.price_history(vehicle_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.market_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code char(2),
  make_id int REFERENCES public.brands(id),
  model varchar(64),
  year int,
  avg_price_amount bigint,
  median_price_amount bigint,
  count int DEFAULT 0,
  period_start date,
  period_end date,
  computed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_stats_lookup ON public.market_stats(country_code, make_id, model, year);

CREATE TABLE IF NOT EXISTS public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id),
  type varchar(32) NOT NULL,
  status varchar(16) DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  payload jsonb,
  result jsonb,
  error text,
  model_used varchar(128),
  cost_usd numeric(10,6),
  duration_ms int,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON public.ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_type_status ON public.ai_jobs(type, status);

-- ============== NOTIFICATIONS / DEVICES ==============
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  platform varchar(16) CHECK (platform IN ('ios','android','web')),
  locale varchar(10),
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL,
  title jsonb,
  body jsonb,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ============== updated_at triggers ==============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','user_profiles','dealer_profiles','vehicles','rentals','bookings','booking_payments','saved_searches','content_translations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_%s ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_touch_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END
$$;