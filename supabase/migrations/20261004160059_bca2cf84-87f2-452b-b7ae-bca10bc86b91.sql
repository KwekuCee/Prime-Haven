CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_unique_idx ON public.payments (transaction_id) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_one_open_per_user_idx ON public.withdrawals (user_id) WHERE status IN ('pending','processing');

CREATE OR REPLACE FUNCTION public.manage_talent_payout_method_service(
  p_user_id uuid,
  p_action text,
  p_method_id uuid DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_account_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method public.user_payout_methods%ROWTYPE;
  v_phone text;
  v_name text;
  v_provider text;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'User is required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  IF p_action = 'create' THEN
    v_provider := lower(trim(coalesce(p_provider, '')));
    v_phone := regexp_replace(coalesce(p_phone_number, ''), '[^0-9+]', '', 'g');
    v_name := trim(coalesce(p_account_name, ''));
    IF v_provider NOT IN ('mtn', 'vodafone', 'airteltigo') THEN RAISE EXCEPTION 'Unsupported payout provider'; END IF;
    IF v_phone !~ '^(\+233|0)[0-9]{9}$' THEN RAISE EXCEPTION 'Enter a valid Ghana mobile number'; END IF;
    IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN RAISE EXCEPTION 'Account name must be between 2 and 100 characters'; END IF;
    INSERT INTO public.user_payout_methods (user_id, provider, phone_number, account_name, is_default, withdrawal_available_at)
    VALUES (p_user_id, v_provider, v_phone, v_name, NOT EXISTS (SELECT 1 FROM public.user_payout_methods WHERE user_id = p_user_id), now() + interval '24 hours')
    RETURNING * INTO v_method;
    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (p_user_id, 'payout_method_added', 'payout_method', v_method.id, 'Added a payout destination', jsonb_build_object('provider', v_provider, 'phone_last4', right(v_phone, 4)));
    INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
    VALUES (p_user_id, 'talent_payout_method_added', 'Talent added a payout destination', jsonb_build_object('method_id', v_method.id, 'provider', v_provider, 'phone_last4', right(v_phone, 4)));
    RETURN jsonb_build_object('success', true, 'id', v_method.id, 'available_at', v_method.withdrawal_available_at);
  ELSIF p_action = 'delete' THEN
    IF p_method_id IS NULL THEN RAISE EXCEPTION 'Payout method is required'; END IF;
    SELECT * INTO v_method FROM public.user_payout_methods WHERE id = p_method_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payout method not found'; END IF;
    IF EXISTS (SELECT 1 FROM public.withdrawals WHERE payout_method_id = p_method_id AND status IN ('pending','processing')) THEN RAISE EXCEPTION 'This payout method has an active withdrawal'; END IF;
    DELETE FROM public.user_payout_methods WHERE id = p_method_id AND user_id = p_user_id;
    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (p_user_id, 'payout_method_removed', 'payout_method', p_method_id, 'Removed a payout destination', jsonb_build_object('provider', v_method.provider, 'phone_last4', right(v_method.phone_number, 4)));
    INSERT INTO public.system_logs (admin_id, action_type, description, old_value)
    VALUES (p_user_id, 'talent_payout_method_removed', 'Talent removed a payout destination', jsonb_build_object('method_id', p_method_id, 'provider', v_method.provider, 'phone_last4', right(v_method.phone_number, 4)));
    RETURN jsonb_build_object('success', true);
  END IF;
  RAISE EXCEPTION 'Unsupported payout method action';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_talent_payout_method_service(uuid,text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_talent_payout_method_service(uuid,text,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.request_talent_withdrawal_service(p_user_id uuid, p_payout_method_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_earned numeric; v_locked numeric; v_available numeric; v_method public.user_payout_methods%ROWTYPE; v_withdrawal public.withdrawals%ROWTYPE; v_amount numeric; v_reference text;
BEGIN
  IF p_user_id IS NULL OR p_payout_method_id IS NULL THEN RAISE EXCEPTION 'User and payout method are required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  SELECT * INTO v_method FROM public.user_payout_methods WHERE id = p_payout_method_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout method not found'; END IF;
  IF v_method.withdrawal_available_at > now() THEN RAISE EXCEPTION 'Payout method is under security hold'; END IF;
  SELECT coalesce(salary_estimated, 0) INTO v_earned FROM public.designer_details WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Talent profile not found'; END IF;
  SELECT coalesce(sum(amount), 0) INTO v_locked FROM public.withdrawals WHERE user_id = p_user_id AND status NOT IN ('failed','rejected','cancelled');
  v_available := greatest(0, v_earned - v_locked);
  v_amount := CASE WHEN p_amount IS NOT NULL AND p_amount > 0 THEN p_amount ELSE v_available END;
  IF v_available < 100 OR v_amount < 100 THEN RAISE EXCEPTION 'Minimum withdrawal is GH₵100'; END IF;
  IF v_amount > v_available THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE user_id = p_user_id AND status IN ('pending','processing')) THEN RAISE EXCEPTION 'A withdrawal request is already open'; END IF;
  v_reference := 'ph_wd_' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint || '_' || left(p_user_id::text, 8);
  INSERT INTO public.withdrawals (user_id,payout_method_id,amount,currency,status,korapay_reference)
  VALUES (p_user_id,p_payout_method_id,v_amount,'GHS','pending',v_reference) RETURNING * INTO v_withdrawal;
  RETURN jsonb_build_object('id',v_withdrawal.id,'amount',v_withdrawal.amount,'created_at',v_withdrawal.created_at,'reference',v_reference,'provider',v_method.provider,'phone_number',v_method.phone_number,'account_name',v_method.account_name);
END; $$;
REVOKE ALL ON FUNCTION public.request_talent_withdrawal_service(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_talent_withdrawal_service(uuid,uuid,numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_withdrawal_for_payout_service(p_withdrawal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_withdrawal public.withdrawals%ROWTYPE;
BEGIN
  UPDATE public.withdrawals SET status='processing', failure_reason=NULL
  WHERE id=p_withdrawal_id AND status IN ('pending','failed') RETURNING * INTO v_withdrawal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal is already being processed or completed'; END IF;
  RETURN to_jsonb(v_withdrawal);
END; $$;
REVOKE ALL ON FUNCTION public.claim_withdrawal_for_payout_service(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_withdrawal_for_payout_service(uuid) TO service_role;