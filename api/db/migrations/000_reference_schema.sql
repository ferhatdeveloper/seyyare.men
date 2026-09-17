-- Seyyare.men — Reference tables (countries, brands, body/fuel/transmission/colors/features)
-- Must run before 001_initial_schema (vehicles FK → brands).
SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.countries (
  code char(2) PRIMARY KEY,
  name jsonb NOT NULL,
  currency_code char(3),
  phone_code varchar(8),
  default_locale varchar(10)
);

CREATE TABLE IF NOT EXISTS public.brands (
  id serial PRIMARY KEY,
  name jsonb NOT NULL,
  logo_url text,
  country_code char(2) REFERENCES public.countries(code),
  is_premium boolean DEFAULT false,
  is_electric boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.body_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fuel_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transmission_types (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  name jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.colors (
  id serial PRIMARY KEY,
  code varchar(32) UNIQUE NOT NULL,
  hex varchar(7) NOT NULL,
  name jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.features (
  id serial PRIMARY KEY,
  code varchar(64) UNIQUE NOT NULL,
  category varchar(32),
  name jsonb NOT NULL
);

GRANT SELECT ON public.countries, public.brands, public.body_types,
  public.fuel_types, public.transmission_types, public.colors, public.features
  TO anon, authenticated, dealer, admin;
