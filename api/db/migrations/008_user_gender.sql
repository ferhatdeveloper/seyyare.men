-- 008_user_gender.sql
-- Profile gender for family / female-driver rental preference (see drivers.gender in 007)

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS gender varchar(16)
  CHECK (gender IS NULL OR gender IN ('female', 'male', 'unspecified'));

COMMENT ON COLUMN public.user_profiles.gender IS
  'Member gender; female unlocks family/female-driver rental option. Synced via PATCH /auth/me.';
