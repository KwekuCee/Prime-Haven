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
  v_active int;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'superadmin'::app_role)
             OR public.has_role(auth.uid(), 'masteradmin'::app_role);

  IF NOT v_is_admin THEN
    SELECT COUNT(*) INTO v_active FROM public.project_assignments pa
    WHERE pa.designer_id = auth.uid() AND pa.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.client_project_id = pa.project_id
          AND s.designer_id = auth.uid()
          AND s.ph_approved = true
      );
    IF v_active > 0 THEN
      RAISE EXCEPTION 'Finish your current project and wait for Prime Haven approval before claiming another.';
    END IF;

    SELECT COUNT(*) INTO v_active FROM public.job_contract_claims jcc
    WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';
    IF v_active > 0 THEN
      RAISE EXCEPTION 'You already have an active job contract. Complete it before claiming another.';
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
END;
$function$;