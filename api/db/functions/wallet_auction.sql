-- Seyyare.men — Wallet / auction / ride-request RPCs
-- JWT-aware via current_user_id(); money paths use SECURITY DEFINER.
-- External PSP: webhook stub at orchestrator /webhooks/psp enqueues psp-reconcile
-- (credits wallet_ledger kind=topup when the worker is wired to a real provider).

SET search_path TO public;

-- Listing fee constant (25_000 IQD) — matches apps/mobile LISTING_FEE_IQD
CREATE OR REPLACE FUNCTION public.listing_fee_iqd()
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 25000::bigint;
$$;

GRANT EXECUTE ON FUNCTION public.listing_fee_iqd() TO anon, authenticated, dealer, admin;

-- ============== Internal debit / credit ==============
-- Not granted to client roles; called only from SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id uuid,
  p_amount_iqd bigint,
  p_kind varchar,
  p_ref_type varchar DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_bal bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'debit_wallet: user_id required';
  END IF;
  IF p_amount_iqd IS NULL OR p_amount_iqd <= 0 THEN
    RAISE EXCEPTION 'debit_wallet: amount must be positive';
  END IF;

  PERFORM public.ensure_wallet(p_user_id);

  UPDATE public.wallets
  SET balance_iqd = balance_iqd - p_amount_iqd,
      updated_at = now()
  WHERE user_id = p_user_id
    AND balance_iqd >= p_amount_iqd
  RETURNING balance_iqd INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'insufficient_balance'
      USING ERRCODE = 'P0001',
            DETAIL = format('need %s IQD', p_amount_iqd);
  END IF;

  INSERT INTO public.wallet_ledger (user_id, amount_iqd, kind, ref_type, ref_id, note)
  VALUES (p_user_id, -p_amount_iqd, p_kind, p_ref_type, p_ref_id, p_note);

  RETURN new_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_wallet(uuid, bigint, varchar, varchar, uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_amount_iqd bigint,
  p_kind varchar,
  p_ref_type varchar DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_bal bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'credit_wallet: user_id required';
  END IF;
  IF p_amount_iqd IS NULL OR p_amount_iqd <= 0 THEN
    RAISE EXCEPTION 'credit_wallet: amount must be positive';
  END IF;

  PERFORM public.ensure_wallet(p_user_id);

  UPDATE public.wallets
  SET balance_iqd = balance_iqd + p_amount_iqd,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_iqd INTO new_bal;

  INSERT INTO public.wallet_ledger (user_id, amount_iqd, kind, ref_type, ref_id, note)
  VALUES (p_user_id, p_amount_iqd, p_kind, p_ref_type, p_ref_id, p_note);

  RETURN new_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet(uuid, bigint, varchar, varchar, uuid, text) FROM PUBLIC;

-- ============== Wallet RPCs ==============

CREATE OR REPLACE FUNCTION public.get_wallet_balance()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
  bal bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT balance_iqd INTO bal FROM public.wallets WHERE user_id = uid;
  RETURN coalesce(bal, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_balance() TO authenticated, dealer, admin;

-- Demo / sandbox top-up (no payment gateway)
CREATE OR REPLACE FUNCTION public.wallet_top_up(p_amount_iqd bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_amount_iqd IS NULL OR p_amount_iqd <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  RETURN public.credit_wallet(uid, p_amount_iqd, 'topup', 'wallet', uid, 'demo top-up');
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_top_up(bigint) TO authenticated, dealer, admin;

-- Charge listing fee (25_000 IQD). Returns {ok, fee, balance[, need]}.
CREATE OR REPLACE FUNCTION public.charge_listing_fee()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
  fee bigint := public.listing_fee_iqd();
  bal bigint;
  new_bal bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT balance_iqd INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;

  IF bal < fee THEN
    RETURN jsonb_build_object(
      'ok', false,
      'fee', fee,
      'balance', bal,
      'need', fee - bal
    );
  END IF;

  new_bal := public.debit_wallet(uid, fee, 'listing_fee', 'listing', NULL, 'listing fee 25000 IQD');

  RETURN jsonb_build_object(
    'ok', true,
    'fee', fee,
    'balance', new_bal
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_listing_fee() TO authenticated, dealer, admin;

-- ============== Auctions ==============

CREATE OR REPLACE FUNCTION public.list_live_auctions(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  vehicle_id uuid,
  seller_id uuid,
  title text,
  city text,
  currency char(3),
  start_price bigint,
  current_bid bigint,
  bid_count int,
  status varchar(16),
  ends_at timestamptz,
  cover_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    a.id,
    a.vehicle_id,
    a.seller_id,
    a.title,
    a.city::text,
    a.currency,
    a.start_price,
    a.current_bid,
    a.bid_count,
    a.status,
    a.ends_at,
    a.cover_url,
    a.created_at
  FROM public.auctions a
  WHERE a.status = 'live'
    AND a.ends_at > now()
  ORDER BY a.ends_at ASC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 100));
$$;

GRANT EXECUTE ON FUNCTION public.list_live_auctions(int) TO anon, authenticated, dealer, admin;

-- Live scaffold: bid history for an auction (polling-friendly).
CREATE OR REPLACE FUNCTION public.list_auction_bids(
  p_auction_id uuid,
  p_limit int DEFAULT 40
)
RETURNS TABLE (
  id uuid,
  auction_id uuid,
  bidder_id uuid,
  bidder_label text,
  amount bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    b.id,
    b.auction_id,
    b.bidder_id,
    coalesce(
      nullif(trim(up.display_name), ''),
      left(b.bidder_id::text, 8)
    ) AS bidder_label,
    b.amount,
    b.created_at
  FROM public.auction_bids b
  LEFT JOIN public.user_profiles up ON up.user_id = b.bidder_id
  WHERE b.auction_id = p_auction_id
  ORDER BY b.amount DESC, b.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 40), 100));
$$;

GRANT EXECUTE ON FUNCTION public.list_auction_bids(uuid, int) TO anon, authenticated, dealer, admin;

-- Place bid: hold new amount, release previous high bidder hold, update auction.
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
  a public.auctions;
  prev public.auction_bids;
  bid_row public.auction_bids;
  min_required bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_auction_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO a
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF a.status <> 'live' OR a.ends_at <= now() THEN
    RAISE EXCEPTION 'auction_not_live' USING ERRCODE = 'P0001';
  END IF;

  IF a.seller_id = uid THEN
    RAISE EXCEPTION 'cannot_bid_own_auction' USING ERRCODE = 'P0001';
  END IF;

  min_required := CASE
    WHEN a.bid_count = 0 THEN greatest(a.start_price, 1)
    ELSE a.current_bid + 1
  END;

  IF p_amount < min_required THEN
    RAISE EXCEPTION 'bid_too_low'
      USING ERRCODE = 'P0001',
            DETAIL = format('minimum %s', min_required);
  END IF;

  -- Previous high bid (for hold release / raise delta)
  SELECT * INTO prev
  FROM public.auction_bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC, created_at DESC
  LIMIT 1;

  IF prev.id IS NOT NULL AND prev.bidder_id = uid THEN
    -- Same bidder raising: hold only the difference
    PERFORM public.debit_wallet(
      uid, p_amount - prev.amount, 'bid_hold', 'auction', p_auction_id,
      format('bid raise hold on auction %s', p_auction_id)
    );
  ELSE
    -- New high bidder: full hold, release previous bidder
    PERFORM public.debit_wallet(
      uid, p_amount, 'bid_hold', 'auction', p_auction_id,
      format('bid hold on auction %s', p_auction_id)
    );
    IF prev.id IS NOT NULL THEN
      PERFORM public.credit_wallet(
        prev.bidder_id, prev.amount, 'bid_release', 'auction', p_auction_id,
        format('bid release after outbid on %s', p_auction_id)
      );
    END IF;
  END IF;

  INSERT INTO public.auction_bids (auction_id, bidder_id, amount)
  VALUES (p_auction_id, uid, p_amount)
  RETURNING * INTO bid_row;

  UPDATE public.auctions
  SET current_bid = p_amount,
      bid_count = bid_count + 1
  WHERE id = p_auction_id
  RETURNING * INTO a;

  RETURN jsonb_build_object(
    'ok', true,
    'bid_id', bid_row.id,
    'auction_id', a.id,
    'amount', bid_row.amount,
    'current_bid', a.current_bid,
    'bid_count', a.bid_count,
    'balance', public.get_wallet_balance()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bid(uuid, bigint) TO authenticated, dealer, admin;

-- ============== Ride request ==============

CREATE OR REPLACE FUNCTION public.request_ride(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_gender_pref varchar(16) DEFAULT NULL
) RETURNS public.rides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
  ride public.rides;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_pickup_lat IS NULL OR p_pickup_lng IS NULL
     OR p_dropoff_lat IS NULL OR p_dropoff_lng IS NULL THEN
    RAISE EXCEPTION 'invalid_coords' USING ERRCODE = '22023';
  END IF;

  IF p_gender_pref IS NOT NULL
     AND p_gender_pref NOT IN ('female', 'male', 'other') THEN
    RAISE EXCEPTION 'invalid_gender_pref' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.rides (
    rider_id,
    status,
    pickup,
    dropoff,
    gender_pref,
    created_at,
    updated_at
  ) VALUES (
    uid,
    'requested',
    ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(p_dropoff_lng, p_dropoff_lat), 4326)::geography,
    p_gender_pref,
    now(),
    now()
  )
  RETURNING * INTO ride;

  -- Queue enqueue left to app / orchestrator layer (BullMQ already exists).
  RETURN ride;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_ride(
  double precision, double precision, double precision, double precision, varchar
) TO authenticated, dealer, admin;
