-- Seyyare.men — Booking RPCs (partner / rental stub)
-- Relies on public.bookings from 001_initial_schema.sql

SET search_path TO public;

-- Create a pending booking for the current user as renter.
CREATE OR REPLACE FUNCTION public.create_booking(
  p_rental_id uuid,
  p_start_date date,
  p_end_date date,
  p_total_amount bigint DEFAULT NULL,
  p_currency char(3) DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_price_breakdown jsonb DEFAULT '[]'::jsonb
) RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  uid uuid := public.current_user_id();
  r public.rentals;
  days int;
  row public.bookings;
  amount bigint;
  cur char(3);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_rental_id IS NULL OR p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'invalid_args' USING ERRCODE = '22023';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_dates' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO r FROM public.rentals WHERE id = p_rental_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rental_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF r.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'rental_not_available' USING ERRCODE = 'P0001';
  END IF;

  IF r.owner_id = uid THEN
    RAISE EXCEPTION 'cannot_book_own_rental' USING ERRCODE = 'P0001';
  END IF;

  days := (p_end_date - p_start_date) + 1;
  IF days < coalesce(r.min_days, 1) THEN
    RAISE EXCEPTION 'below_min_days' USING ERRCODE = 'P0001';
  END IF;
  IF r.max_days IS NOT NULL AND days > r.max_days THEN
    RAISE EXCEPTION 'above_max_days' USING ERRCODE = 'P0001';
  END IF;

  amount := coalesce(p_total_amount, coalesce(r.daily_rate_amount, 0) * days);
  cur := coalesce(nullif(p_currency, ''), r.daily_rate_currency, 'IQD');

  INSERT INTO public.bookings (
    rental_id,
    renter_id,
    start_date,
    end_date,
    total_days,
    daily_rate_snapshot,
    total_amount,
    currency,
    deposit_amount,
    price_breakdown,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_rental_id,
    uid,
    p_start_date,
    p_end_date,
    days,
    r.daily_rate_amount,
    amount,
    cur,
    r.deposit_amount,
    coalesce(p_price_breakdown, '[]'::jsonb),
    'pending',
    p_notes,
    now(),
    now()
  )
  RETURNING * INTO row;

  UPDATE public.rentals
  SET total_bookings = coalesce(total_bookings, 0) + 1,
      updated_at = now()
  WHERE id = p_rental_id;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(
  uuid, date, date, bigint, char, text, jsonb
) TO authenticated, dealer, admin;

-- Bookings where the caller is renter or rental owner (partner panel).
CREATE OR REPLACE FUNCTION public.list_my_bookings(p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  rental_id uuid,
  renter_id uuid,
  start_date date,
  end_date date,
  total_days int,
  total_amount bigint,
  currency char(3),
  status varchar(16),
  notes text,
  city text,
  rental_title text,
  guest_label text,
  party_role text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    b.id,
    b.rental_id,
    b.renter_id,
    b.start_date,
    b.end_date,
    b.total_days,
    b.total_amount,
    b.currency,
    b.status,
    b.notes,
    r.city::text,
    coalesce(
      nullif(trim(v.title_original), ''),
      format('Rental %s', left(r.id::text, 8))
    ) AS rental_title,
    coalesce(
      nullif(trim(up.display_name), ''),
      left(b.renter_id::text, 8)
    ) AS guest_label,
    CASE
      WHEN r.owner_id = public.current_user_id() THEN 'owner'
      ELSE 'renter'
    END AS party_role,
    b.created_at
  FROM public.bookings b
  JOIN public.rentals r ON r.id = b.rental_id
  LEFT JOIN public.vehicles v ON v.id = r.vehicle_id
  LEFT JOIN public.user_profiles up ON up.user_id = b.renter_id
  WHERE public.current_user_id() IS NOT NULL
    AND (
      b.renter_id = public.current_user_id()
      OR r.owner_id = public.current_user_id()
    )
  ORDER BY b.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
$$;

GRANT EXECUTE ON FUNCTION public.list_my_bookings(int) TO authenticated, dealer, admin;
