ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.admin_archive_ledger(p_restore boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can clear the ledger';
  END IF;

  IF p_restore THEN
    UPDATE public.payments SET archived_at = NULL WHERE archived_at IS NOT NULL;
  ELSE
    UPDATE public.payments SET archived_at = now() WHERE archived_at IS NULL;
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (auth.uid(),
          CASE WHEN p_restore THEN 'ledger_restored' ELSE 'ledger_archived' END,
          CASE WHEN p_restore THEN 'Restored archived ledger records' ELSE 'Archived all ledger records' END,
          jsonb_build_object('rows', v_count));

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_withdrawal_already_paid(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w RECORD;
  v_match RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can inspect withdrawals';
  END IF;

  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'Withdrawal request not found.');
  END IF;

  SELECT p.id, p.amount, p.payment_gateway, p.created_at
  INTO v_match
  FROM public.payments p
  WHERE p.user_id = v_w.user_id
    AND lower(p.type) IN ('withdrawal', 'salary', 'payout')
    AND p.status = 'completed'
    AND p.amount = v_w.amount
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_match.id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'amount', v_w.amount,
      'message', 'No completed payout of this amount was found for this talent.');
  END IF;

  RETURN jsonb_build_object('found', true, 'amount', v_match.amount,
    'gateway', v_match.payment_gateway, 'paid_at', v_match.created_at,
    'message', 'A completed payout of the same amount already exists for this talent.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_withdrawal_request(p_withdrawal_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'superadmin'::app_role) OR public.has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can remove withdrawal requests';
  END IF;

  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found.';
  END IF;

  IF v_w.status NOT IN ('pending', 'processing', 'failed') THEN
    RAISE EXCEPTION 'Only pending, processing or failed requests can be removed.';
  END IF;

  DELETE FROM public.withdrawals WHERE id = p_withdrawal_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_w.user_id, 'Withdrawal request removed',
          COALESCE(NULLIF(btrim(p_reason), ''),
                   'Your pending withdrawal request was removed by an administrator because it was settled outside the platform.'),
          'payment', '/payments');

  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (auth.uid(), 'withdrawal_request_removed',
          'Removed a withdrawal request of GHS ' || v_w.amount::text,
          jsonb_build_object('withdrawal_id', p_withdrawal_id, 'user_id', v_w.user_id,
                             'amount', v_w.amount, 'reason', p_reason));

  RETURN jsonb_build_object('success', true, 'amount', v_w.amount);
END;
$$;