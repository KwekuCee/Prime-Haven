CREATE UNIQUE INDEX IF NOT EXISTS payments_withdrawal_id_unique_idx ON public.payments ((payment_details->>'withdrawal_id')) WHERE type='withdrawal' AND payment_details ? 'withdrawal_id';
CREATE OR REPLACE FUNCTION public.finalise_withdrawal_payout_service(p_withdrawal_id uuid, p_admin_id uuid, p_status text, p_gateway text, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_withdrawal public.withdrawals%ROWTYPE; v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_status NOT IN ('approved','success','processing') THEN RAISE EXCEPTION 'Invalid completion status'; END IF;
  SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_withdrawal.status <> 'processing' THEN RAISE EXCEPTION 'Withdrawal is not reserved for processing'; END IF;
  UPDATE public.withdrawals SET status=p_status, korapay_reference=p_reference, processed_at=now(), failure_reason=NULL WHERE id=p_withdrawal_id;
  IF p_status IN ('approved','success') THEN
    INSERT INTO public.payments (user_id,amount,type,status,transaction_id,payment_gateway,processed_by_admin_id,payment_details)
    VALUES (v_withdrawal.user_id,v_withdrawal.amount,'withdrawal','completed',p_reference,p_gateway,p_admin_id,jsonb_build_object('withdrawal_id',p_withdrawal_id,'mode',case when p_gateway='Manual Transfer' then 'manual' else 'korapay' end))
    ON CONFLICT ((payment_details->>'withdrawal_id')) WHERE type='withdrawal' AND payment_details ? 'withdrawal_id' DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal was already finalised'; END IF;
    UPDATE public.designer_details SET salary_estimated=0,monthly_points=0,total_points=0,salary_payment_status='paid',salary_paid_at=now(),salary_paid_by=p_admin_id WHERE user_id=v_withdrawal.user_id;
    INSERT INTO public.notifications (user_id,title,message,type,link) VALUES (v_withdrawal.user_id,'Withdrawal Paid','Your withdrawal of GH₵'||to_char(v_withdrawal.amount,'FM999999990.00')||' has been paid. Your accumulated points have been reset for the new cycle.','payment','/payments');
    SELECT * INTO v_profile FROM public.profiles WHERE id=v_withdrawal.user_id;
    INSERT INTO public.system_logs (admin_id,action_type,description,new_value) VALUES (p_admin_id,'withdrawal_approved','Approved withdrawal of GH₵'||to_char(v_withdrawal.amount,'FM999999990.00')||' for '||coalesce(v_profile.full_name,v_withdrawal.user_id::text),jsonb_build_object('withdrawal_id',p_withdrawal_id,'amount',v_withdrawal.amount,'reference',p_reference,'status',p_status));
  END IF;
  RETURN jsonb_build_object('success',true,'status',p_status);
END; $$;
REVOKE ALL ON FUNCTION public.finalise_withdrawal_payout_service(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalise_withdrawal_payout_service(uuid,uuid,text,text,text) TO service_role;