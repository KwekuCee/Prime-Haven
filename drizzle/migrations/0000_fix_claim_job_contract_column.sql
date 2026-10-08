CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_contract RECORD;
  v_cooldown_until TIMESTAMP WITH TIME ZONE;
  v_existing INTEGER;
  v_hours INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  SELECT cooldown_until INTO v_cooldown_until FROM public.designer_details WHERE user_id = v_user;
  IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
    RAISE EXCEPTION 'Account in 48-hour cooldown until %. Work actions are paused.', v_cooldown_until;
  END IF;
  SELECT * INTO v_contract FROM public.job_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;
  SELECT COUNT(*) INTO v_existing FROM public.job_contract_claims
  WHERE contract_id = p_contract_id AND status IN ('claimed','active','in_progress','submitted');
  IF v_existing > 0 THEN RAISE EXCEPTION 'This contract has already been claimed by another professional.'; END IF;
  SELECT COUNT(*) INTO v_existing FROM public.job_contract_claims
  WHERE designer_id = v_user AND status IN ('claimed','active','in_progress');
  IF v_existing > 0 THEN RAISE EXCEPTION 'You already have an active job contract. Finish it first.'; END IF;
  v_hours := COALESCE(v_contract.deadline_hours, 48);
  INSERT INTO public.job_contract_claims (contract_id, designer_id, status, claimed_at)
  VALUES (p_contract_id, v_user, 'claimed', now());
  UPDATE public.job_contracts
  SET claimed_at = now(), deadline_at = now() + (v_hours * INTERVAL '1 hour'),
      active_designers_count = 1, status = 'in_progress', updated_at = now()
  WHERE id = p_contract_id;
END;
$function$;