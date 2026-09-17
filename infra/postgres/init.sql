-- Seyyare.men PostgreSQL init script
-- Extensions ve ana roller

-- pgvector (vector similarity search — Recommendation Agent)
-- Optional: image may not ship pgvector; soft-launch still works without it.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector not available — skipping (recommendations deferred)';
END
$$;
-- PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
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
DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;
  GRANT USAGE ON SCHEMA extensions TO anon, authenticated, dealer, admin;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'extensions schema grant skipped: %', SQLERRM;
END
$$;

-- Tüm public tabloları anon/authenticated'a okuma, authenticated'a yazma yetkisi
-- (RLS daha sonra policies/rls.sql'de tanımlanacak)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated, dealer, admin;