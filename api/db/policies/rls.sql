-- Seyyare.men — Row-Level Security policies
SET search_path TO public;

-- Helper: current user_id from JWT
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.user_id', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon, authenticated, dealer, admin;

CREATE OR REPLACE FUNCTION public.current_jwt_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.role', true), ''), 'anon');
$$;
GRANT EXECUTE ON FUNCTION public.current_jwt_role() TO anon, authenticated, dealer, admin;

-- ============== USERS / PROFILES ==============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (
    id = public.current_user_id()
    OR public.current_jwt_role() IN ('admin','dealer')
  );

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (public.current_jwt_role() = 'admin')
  WITH CHECK (public.current_jwt_role() = 'admin');

-- user_profiles: herkes okuyabilir (public profil), sadece sahibi yazabilir
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select_all ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_profiles_admin_all ON public.user_profiles
  FOR ALL USING (public.current_jwt_role() = 'admin');

-- dealer_profiles: herkes okuyabilir, dealer sadece kendi kaydını yazabilir
ALTER TABLE public.dealer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY dealer_profiles_select_all ON public.dealer_profiles FOR SELECT USING (true);
CREATE POLICY dealer_profiles_modify_own ON public.dealer_profiles
  FOR ALL USING (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin')
  WITH CHECK (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

-- ============== VEHICLES ==============
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Aktif ilanları herkes görebilir
CREATE POLICY vehicles_select_active ON public.vehicles
  FOR SELECT USING (
    status = 'active'
    OR seller_id = public.current_user_id()
    OR public.current_jwt_role() IN ('admin','dealer')
  );

CREATE POLICY vehicles_insert_own ON public.vehicles
  FOR INSERT WITH CHECK (seller_id = public.current_user_id());

CREATE POLICY vehicles_update_own ON public.vehicles
  FOR UPDATE USING (seller_id = public.current_user_id() OR public.current_jwt_role() = 'admin')
  WITH CHECK (seller_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

CREATE POLICY vehicles_delete_own ON public.vehicles
  FOR DELETE USING (seller_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

-- vehicle_media
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_media_select_all ON public.vehicle_media
  FOR SELECT USING (true);

CREATE POLICY vehicle_media_modify_owner ON public.vehicle_media
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_media.vehicle_id
      AND (v.seller_id = public.current_user_id() OR public.current_jwt_role() = 'admin')
    )
  );

-- ai_vehicle_analysis: okunabilir (vehicle sahibi + admin)
ALTER TABLE public.ai_vehicle_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_analysis_select ON public.ai_vehicle_analysis
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.vehicles v
      WHERE v.id = ai_vehicle_analysis.vehicle_id
      AND (v.seller_id = public.current_user_id() OR public.current_jwt_role() IN ('admin','dealer') OR v.status = 'active')
    )
  );

-- ============== RENTALS / BOOKINGS ==============
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY rentals_select_active ON public.rentals
  FOR SELECT USING (status = 'active' OR owner_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

CREATE POLICY rentals_modify_own ON public.rentals
  FOR ALL USING (owner_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.rental_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY rental_avail_select_all ON public.rental_availability FOR SELECT USING (true);
CREATE POLICY rental_avail_modify_owner ON public.rental_availability
  FOR ALL USING (
    EXISTS(SELECT 1 FROM public.rentals r WHERE r.id = rental_availability.rental_id AND (r.owner_id = public.current_user_id() OR public.current_jwt_role() = 'admin'))
  );

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_select_party ON public.bookings
  FOR SELECT USING (
    renter_id = public.current_user_id()
    OR EXISTS(SELECT 1 FROM public.rentals r WHERE r.id = bookings.rental_id AND r.owner_id = public.current_user_id())
    OR public.current_jwt_role() = 'admin'
  );

CREATE POLICY bookings_insert_renter ON public.bookings
  FOR INSERT WITH CHECK (renter_id = public.current_user_id());

CREATE POLICY bookings_update_party ON public.bookings
  FOR UPDATE USING (
    renter_id = public.current_user_id()
    OR EXISTS(SELECT 1 FROM public.rentals r WHERE r.id = bookings.rental_id AND r.owner_id = public.current_user_id())
    OR public.current_jwt_role() = 'admin'
  );

-- ============== FAVORITES / SAVED SEARCHES / ALERTS ==============
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_modify_own ON public.favorites
  FOR ALL USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_searches_modify_own ON public.saved_searches
  FOR ALL USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_alerts_modify_own ON public.price_alerts
  FOR ALL USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ============== MESSAGING ==============
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_select_party ON public.conversations
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = conversations.id AND p.user_id = public.current_user_id())
    OR public.current_jwt_role() = 'admin'
  );

CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY conv_participants_select ON public.conversation_participants
  FOR SELECT USING (
    user_id = public.current_user_id()
    OR EXISTS(SELECT 1 FROM public.conversation_participants me WHERE me.conversation_id = conversation_participants.conversation_id AND me.user_id = public.current_user_id())
  );

CREATE POLICY conv_participants_insert ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_party ON public.messages
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = messages.conversation_id AND p.user_id = public.current_user_id()
    )
    OR public.current_jwt_role() = 'admin'
  );

CREATE POLICY messages_insert_sender ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_user_id()
    AND EXISTS(
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = messages.conversation_id AND p.user_id = public.current_user_id()
    )
  );

-- ============== REVIEWS ==============
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_all ON public.reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert_reviewer ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = public.current_user_id());
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE USING (reviewer_id = public.current_user_id());

-- ============== TRANSLATIONS ==============
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_select_all ON public.content_translations FOR SELECT USING (true);
CREATE POLICY ct_insert_owner ON public.content_translations
  FOR INSERT WITH CHECK (
    public.current_jwt_role() IN ('admin','dealer','authenticated')
  );

-- ============== AI JOBS / NOTIFICATIONS / DEVICES ==============
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_jobs_select_own ON public.ai_jobs
  FOR SELECT USING (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = public.current_user_id());
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = public.current_user_id());

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY device_tokens_modify_own ON public.device_tokens
  FOR ALL USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ============== STATIC TABLES — herkes okuyabilir ==============
-- countries, brands, body_types, fuel_types, transmission_types, colors, features
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['countries','brands','body_types','fuel_types','transmission_types','colors','features','price_history','market_stats']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I_select_all ON public.%I FOR SELECT USING (true)', t, t);
  END LOOP;
END
$$;