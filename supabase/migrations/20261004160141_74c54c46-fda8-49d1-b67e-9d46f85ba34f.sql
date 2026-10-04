CREATE OR REPLACE FUNCTION public.claim_withdrawal_for_payout_service(p_withdrawal_id uuid, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_withdrawal public.withdrawals%ROWTYPE;
BEGIN
  IF p_reference IS NULL OR p_reference !~ '^ph_wd_[0-9]+_[0-9a-f]{8}$' THEN RAISE EXCEPTION 'Invalid payout reference'; END IF;
  UPDATE public.withdrawals SET status='processing', failure_reason=NULL, korapay_reference=coalesce(korapay_reference,p_reference)
  WHERE id=p_withdrawal_id AND status IN ('pending','failed') RETURNING * INTO v_withdrawal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal is already being processed or completed'; END IF;
  RETURN to_jsonb(v_withdrawal);
END; $$;
REVOKE ALL ON FUNCTION public.claim_withdrawal_for_payout_service(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_withdrawal_for_payout_service(uuid,text) TO service_role;
DROP FUNCTION IF EXISTS public.claim_withdrawal_for_payout_service(uuid);