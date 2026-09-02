-- Seyyare.men — JWT Auth Functions
-- pgjwt uyumlu (https://github.com/michelp/pgjwt)

SET search_path TO public;

-- Basit JWT (HS256) implementasyonu — pgjwt'ye gerek kalmadan
CREATE OR REPLACE FUNCTION public.url_encode(data bytea) RETURNS text LANGUAGE sql AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;

CREATE OR REPLACE FUNCTION public.url_decode(data text) RETURNS bytea LANGUAGE sql AS $$
  BEGIN
    RETURN decode(translate(data, '-_', '+/'), 'base64');
  END;
$$;

CREATE OR REPLACE FUNCTION public.jwt_sign(payload jsonb, secret text) RETURNS text LANGUAGE sql STABLE AS $$
  WITH
    header AS (SELECT '{"alg":"HS256","typ":"JWT"}'::jsonb AS json),
    segments AS (
      SELECT
        url_encode(convert_to(header.json::text, 'UTF8')) AS h,
        url_encode(convert_to(payload::text, 'UTF8')) AS p
      FROM (SELECT '{"alg":"HS256","typ":"JWT"}'::jsonb) header
    ),
    signing_input AS (
      SELECT h || '.' || p AS si FROM segments
    ),
    signature AS (
      SELECT
        url_encode(hmac(convert_to(si, 'UTF8'), secret, 'sha256')) AS sig
      FROM signing_input
    )
  SELECT h || '.' || p || '.' || sig
  FROM segments, signature;
$$;

CREATE OR REPLACE FUNCTION public.jwt_verify(token text, secret text) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  parts text[];
  header_b64 text;
  payload_b64 text;
  sig_b64 text;
  expected_sig text;
  payload jsonb;
BEGIN
  parts := string_to_array(token, '.');
  IF array_length(parts, 1) IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'invalid token format';
  END IF;
  header_b64 := parts[1];
  payload_b64 := parts[2];
  sig_b64 := parts[3];
  expected_sig := url_encode(hmac(convert_to(header_b64 || '.' || payload_b64, 'UTF8'), secret, 'sha256'));
  IF expected_sig <> sig_b64 THEN
    RAISE EXCEPTION 'signature mismatch';
  END IF;
  payload := convert_from(url_decode(payload_b64), 'UTF8')::jsonb;
  IF (payload ? 'exp') AND (payload->>'exp')::bigint < extract(epoch from now())::bigint THEN
    RAISE EXCEPTION 'token expired';
  END IF;
  RETURN payload;
END;
$$;

-- Authenticator rolü için gerekli grants
GRANT EXECUTE ON FUNCTION public.jwt_sign(jsonb, text) TO anon, authenticated, dealer, admin;
GRANT EXECUTE ON FUNCTION public.jwt_verify(text, text) TO anon, authenticated, dealer, admin;

-- Token imzalama — auth-service tarafından da kullanılır
CREATE OR REPLACE FUNCTION public.sign_access_token(
  user_id uuid,
  role text,
  locale text,
  secret text,
  ttl_seconds int DEFAULT 900
) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT public.jwt_sign(
    jsonb_build_object(
      'sub', user_id,
      'role', role,
      'locale', locale,
      'iat', extract(epoch from now())::bigint,
      'exp', (extract(epoch from now()) + ttl_seconds)::bigint,
      'iss', 'seyyare.men'
    ),
    secret
  );
$$;
GRANT EXECUTE ON FUNCTION public.sign_access_token(uuid, text, text, text, int) TO anon, authenticated, dealer, admin;

-- ============== LOGIN / REGISTER / REFRESH ==============

-- Şifre validasyonu: bcrypt ile doğrula (bcrypt hash formatı)
-- Not: Auth-service bcrypt üretir, DB sadece doğrular
CREATE OR REPLACE FUNCTION public.basic_auth_login(
  identifier text,
  password text
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  u record;
  hash_val text;
BEGIN
  -- identifier email veya phone olabilir
  SELECT id, email, phone, password_hash, role, locale, is_active, is_banned
  INTO u
  FROM public.users
  WHERE email = lower(identifier) OR phone = identifier
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_credentials' USING ERRCODE = 'P0001';
  END IF;

  IF u.is_banned OR NOT u.is_active THEN
    RAISE EXCEPTION 'account_disabled' USING ERRCODE = 'P0001';
  END IF;

  -- password_hash formatı: bcrypt $2a$/$2b$/$2y$ ile başlar
  -- Bcrypt doğrulaması için crypt() fonksiyonu kullanılır (pgcrypto)
  IF u.password_hash IS NULL OR crypt(password, u.password_hash) <> u.password_hash THEN
    RAISE EXCEPTION 'invalid_credentials' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users SET last_login_at = now() WHERE id = u.id;

  RETURN jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'phone', u.phone,
    'role', u.role,
    'locale', u.locale
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.basic_auth_login(text, text) TO anon;

-- Register: yeni kullanıcı + profil oluştur
CREATE OR REPLACE FUNCTION public.basic_auth_register(
  email text,
  phone text,
  password text,
  locale text DEFAULT 'tr',
  display_name text DEFAULT NULL,
  role text DEFAULT 'user'
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  new_id uuid;
  hash_val text;
BEGIN
  IF role NOT IN ('user','dealer') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF email IS NULL AND phone IS NULL THEN
    RAISE EXCEPTION 'email_or_phone_required';
  END IF;

  IF email IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE email = lower(email)) THEN
    RAISE EXCEPTION 'email_taken';
  END IF;

  IF phone IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE phone = phone) THEN
    RAISE EXCEPTION 'phone_taken';
  END IF;

  hash_val := crypt(password, gen_salt('bf', 10));

  INSERT INTO public.users (email, phone, password_hash, role, locale)
  VALUES (
    CASE WHEN email IS NOT NULL THEN lower(email) END,
    phone,
    hash_val,
    role,
    coalesce(locale, 'tr')
  )
  RETURNING id INTO new_id;

  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (new_id, display_name);

  IF role = 'dealer' THEN
    INSERT INTO public.dealer_profiles (user_id, business_name)
    VALUES (new_id, display_name);
  END IF;

  RETURN jsonb_build_object(
    'user_id', new_id,
    'email', lower(email),
    'phone', phone,
    'role', role,
    'locale', coalesce(locale, 'tr')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.basic_auth_register(text, text, text, text, text, text) TO anon;

-- Refresh token rotasyonu
CREATE OR REPLACE FUNCTION public.rotate_refresh_token(
  p_token_hash text,
  p_new_token_hash text,
  p_expires_at timestamptz
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  uid uuid;
BEGIN
  UPDATE public.refresh_tokens
  SET revoked_at = now()
  WHERE token_hash = p_token_hash AND revoked_at IS NULL AND expires_at > now()
  RETURNING user_id INTO uid;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'invalid_or_expired_refresh_token';
  END IF;

  INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
  VALUES (uid, p_new_token_hash, p_expires_at);

  RETURN uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_refresh_token(text, text, timestamptz) TO anon, authenticated;

-- ============== PostgREST pre-request hook ==============
-- Her istek öncesi JWT doğrula, role claim'e göre DB rolü ata
CREATE OR REPLACE FUNCTION public.pre_request() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  jwt_claims jsonb;
  jwt_role text;
  user_id uuid;
BEGIN
  -- Token yoksa veya anon ise bir şey yapma
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF jwt_claims IS NULL THEN
    RETURN;
  END IF;

  jwt_role := jwt_claims->>'role';
  user_id := (jwt_claims->>'sub')::uuid;

  IF jwt_role IS NOT NULL THEN
    -- PostgREST zaten rolü set ediyor, ama RLS için kullanıcı id'sini de set edebiliriz
    PERFORM set_config('request.jwt.user_id', coalesce(user_id::text, ''), true);
    PERFORM set_config('request.jwt.role', jwt_role, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pre_request() TO anon, authenticated, dealer, admin;