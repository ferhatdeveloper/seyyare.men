-- Seyyare.men — Wallets, ledger, auctions, listing fees
-- Depends on: 001 (users, vehicles), 007 (rides).
-- Listing fee constant: 25_000 IQD (see comment + public.listing_fee_iqd()).
-- PSP top-ups: orchestrator POST /webhooks/psp → BullMQ psp-reconcile → ledger topup (stub).

SET search_path TO public;

-- ============== LISTING FEE (config constant) ==============
-- İlan yayınlama ücreti: 25_000 IQD (sabit). RPC: charge_listing_fee().
COMMENT ON SCHEMA public IS 'Seyyare.men public schema. Listing fee = 25000 IQD.';

-- ============== WALLETS ==============
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance_iqd bigint NOT NULL DEFAULT 0 CHECK (balance_iqd >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_updated_at
  ON public.wallets (updated_at DESC);

-- ============== WALLET LEDGER ==============
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_iqd bigint NOT NULL, -- signed: +credit / -debit
  kind varchar(32) NOT NULL
    CHECK (kind IN ('topup', 'listing_fee', 'bid_hold', 'bid_release', 'refund', 'adjust')),
  ref_type varchar(32),
  ref_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON public.wallet_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_kind
  ON public.wallet_ledger (kind);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_ref
  ON public.wallet_ledger (ref_type, ref_id)
  WHERE ref_id IS NOT NULL;

-- ============== AUCTIONS ==============
CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  city varchar(64),
  currency char(3) NOT NULL DEFAULT 'IQD',
  start_price bigint NOT NULL CHECK (start_price >= 0),
  current_bid bigint NOT NULL DEFAULT 0 CHECK (current_bid >= 0),
  bid_count int NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
  status varchar(16) NOT NULL DEFAULT 'live'
    CHECK (status IN ('live', 'ended', 'cancelled')),
  ends_at timestamptz NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status_ends
  ON public.auctions (status, ends_at);

CREATE INDEX IF NOT EXISTS idx_auctions_live_ends
  ON public.auctions (ends_at)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_auctions_seller
  ON public.auctions (seller_id);

CREATE INDEX IF NOT EXISTS idx_auctions_vehicle
  ON public.auctions (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_auctions_created_at
  ON public.auctions (created_at DESC);

-- ============== AUCTION BIDS ==============
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_created
  ON public.auction_bids (auction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder
  ON public.auction_bids (bidder_id, created_at DESC);

-- ============== RIDES: gender preference (family / female-driver) ==============
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS gender_pref varchar(16)
  CHECK (gender_pref IS NULL OR gender_pref IN ('female', 'male', 'other'));

COMMENT ON COLUMN public.rides.gender_pref IS
  'Optional rider preference for driver gender matching (see drivers.gender).';

-- ============== ensure_wallet helper ==============
CREATE OR REPLACE FUNCTION public.ensure_wallet(p_user_id uuid)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  w public.wallets;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ensure_wallet: user_id required';
  END IF;

  INSERT INTO public.wallets (user_id, balance_iqd, updated_at)
  VALUES (p_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO w FROM public.wallets WHERE user_id = p_user_id;
  RETURN w;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO authenticated, dealer, admin;

COMMENT ON TABLE public.wallets IS 'User wallet balances in IQD. Listing fee = 25000 IQD.';
COMMENT ON TABLE public.wallet_ledger IS 'Append-only signed ledger for wallet movements.';
COMMENT ON TABLE public.auctions IS 'Vehicle auctions (live|ended|cancelled).';
COMMENT ON TABLE public.auction_bids IS 'Bids placed on auctions; holds tracked via wallet_ledger.';
