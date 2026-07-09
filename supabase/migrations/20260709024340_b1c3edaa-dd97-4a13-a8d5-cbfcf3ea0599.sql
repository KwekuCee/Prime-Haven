
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_category text;
  v_cap int;
  v_current int;
  v_active_proj int;
  v_active_claim int;
  v_is_admin boolean;
  v_bypass_reasons text[] := ARRAY[]::text[];
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'superadmin'::app_role)
             OR public.has_role(auth.uid(), 'masteradmin'::app_role);

  -- Compute what WOULD have blocked a normal designer
  SELECT COUNT(*) INTO v_active_proj FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid() AND pa.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );

  SELECT COUNT(*) INTO v_active_claim FROM public.job_contract_claims jcc
  WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';

  IF NOT v_is_admin THEN
    IF v_active_proj > 0 THEN
      RAISE EXCEPTION 'Finish your current project and wait for Prime Haven approval before claiming another.';
    END IF;
    IF v_active_claim > 0 THEN
      RAISE EXCEPTION 'You already have an active job contract. Complete it before claiming another.';
    END IF;
  ELSE
    IF v_active_proj > 0 THEN
      v_bypass_reasons := array_append(v_bypass_reasons, 'active_project_assignment');
    END IF;
    IF v_active_claim > 0 THEN
      v_bypass_reasons := array_append(v_bypass_reasons, 'active_job_contract_claim');
    END IF;
  END IF;

  SELECT category INTO v_category FROM public.job_contracts WHERE id = p_contract_id;
  IF v_category IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;

  v_cap := CASE
    WHEN v_category IN (
      'graphic-design','Graphic Design',
      'logo-design','brand-identity','print-design','flyer-design','social-media'
    ) THEN 2
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_current FROM public.job_contract_claims
  WHERE contract_id = p_contract_id AND status = 'active';

  IF v_current >= v_cap THEN
    RAISE EXCEPTION 'This contract has reached the maximum number of designers.';
  END IF;

  INSERT INTO public.job_contract_claims (contract_id, designer_id, status)
  VALUES (p_contract_id, auth.uid(), 'active');

  -- Audit any admin bypass
  IF v_is_admin AND array_length(v_bypass_reasons, 1) > 0 THEN
    INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
    VALUES (
      auth.uid(),
      'job_contract_claim_bypass',
      'Admin claimed job contract while active-contract limit would normally block a designer.',
      jsonb_build_object(
        'contract_id', p_contract_id,
        'category', v_category,
        'reasons', v_bypass_reasons,
        'active_project_assignments', v_active_proj,
        'active_job_contract_claims', v_active_claim
      )
    );
  END IF;
END;
$function$;
