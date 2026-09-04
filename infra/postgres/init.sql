-- Seyyare.men PostgreSQL init script
-- Extensions ve ana roller

-- pgvector (vector similarity search — Recommendation Agent)
-- Bu image (pgvector/pgvector:pg16) pgvector ile gelir, ayrıca yüklüyoruz güvende olmak için
CREATE EXTENSION IF NOT EXISTS vector;
-- PostGIS yerine geçen coğrafi extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostgREST için gerekli roller
-- NOT: Production'da bu kullanıcılar farklı secretlara sahip olmalı
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'change_me_in_production';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dealer') THEN
    CREATE ROLE dealer NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
  END IF;
END
$$;

-- PostgREST: anonymous + authenticated + dealer + admin
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT dealer TO authenticator;
GRANT admin TO authenticator;

-- Public schema varsayılan izinler
GRANT USAGE ON SCHEMA public TO anon, authenticated, dealer, admin;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, dealer, admin;

-- Tüm public tabloları anon/authenticated'a okuma, authenticated'a yazma yetkisi
-- (RLS daha sonra policies/rls.sql'de tanımlanacak)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated, dealer, admin;