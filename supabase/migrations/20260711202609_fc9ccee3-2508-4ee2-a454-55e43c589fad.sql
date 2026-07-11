
-- 1. Add 'available' status + attribution columns to referrals
ALTER TABLE public.affiliate_referrals DROP CONSTRAINT IF EXISTS affiliate_referrals_status_check;
ALTER TABLE public.affiliate_referrals
  ADD CONSTRAINT affiliate_referrals_status_check
  CHECK (status = ANY (ARRAY['pending','converted','available','paid','rejected']));
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS client_ref text;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS available_at timestamptz;
ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 2. Increment click count (public RPC, safe: only touches counter)
CREATE OR REPLACE FUNCTION public.increment_affiliate_click(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.affiliate_profiles
  SET clicks = COALESCE(clicks, 0) + 1,
      updated_at = now()
  WHERE referral_code = p_code;
$$;
GRANT EXECUTE ON FUNCTION public.increment_affiliate_click(text) TO anon, authenticated;

-- 3. Update commission rate to 15% and store attribution
CREATE OR REPLACE FUNCTION public.process_affiliate_commission(
  p_ref_code text,
  p_client_name text,
  p_service text,
  p_commission numeric,
  p_amount_paid numeric DEFAULT 0,
  p_client_ref text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  SELECT id INTO v_affiliate_id
  FROM public.affiliate_profiles
  WHERE referral_code = p_ref_code
  LIMIT 1;

  IF v_affiliate_id IS NOT NULL THEN
    INSERT INTO public.affiliate_referrals (
      affiliate_id, client_name, service_booked, commission, status, amount_paid, client_ref
    ) VALUES (
      v_affiliate_id, p_client_name, p_service, p_commission, 'converted', p_amount_paid, p_client_ref
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric, numeric, text) TO anon, authenticated;

-- 4. Admin RPC: release referrals so affiliate can withdraw
CREATE OR REPLACE FUNCTION public.release_referrals_for_withdrawal(p_affiliate_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can release affiliate commissions';
  END IF;

  UPDATE public.affiliate_referrals
  SET status = 'available', available_at = now()
  WHERE affiliate_id = p_affiliate_id AND status = 'converted';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.release_referrals_for_withdrawal(uuid) TO authenticated;

-- 5. Admin RPC: mark payout paid (flips linked referrals to 'paid')
CREATE OR REPLACE FUNCTION public.mark_affiliate_payout_paid(p_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can mark payouts paid';
  END IF;

  SELECT affiliate_id INTO v_affiliate_id FROM public.affiliate_payouts WHERE id = p_payout_id;
  IF v_affiliate_id IS NULL THEN RAISE EXCEPTION 'Payout not found'; END IF;

  UPDATE public.affiliate_payouts SET status = 'processed' WHERE id = p_payout_id;

  UPDATE public.affiliate_referrals
  SET status = 'paid', paid_at = now()
  WHERE affiliate_id = v_affiliate_id AND status = 'available';
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_affiliate_payout_paid(uuid) TO authenticated;

-- 6. Admin visibility: let admins view all affiliate data
CREATE POLICY "Admins can view all affiliate profiles"
  ON public.affiliate_profiles FOR SELECT
  USING (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'masteradmin'::app_role));

CREATE POLICY "Admins can view all referrals"
  ON public.affiliate_referrals FOR SELECT
  USING (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'masteradmin'::app_role));

CREATE POLICY "Admins can view all payouts"
  ON public.affiliate_payouts FOR SELECT
  USING (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'masteradmin'::app_role));

-- 7. Default theme flipped to light for new user_settings rows
ALTER TABLE public.user_settings ALTER COLUMN theme SET DEFAULT 'light';
