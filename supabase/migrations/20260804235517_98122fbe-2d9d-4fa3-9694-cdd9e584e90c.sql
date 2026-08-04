-- 1. Make leaderboard/directory views readable by all authenticated talents (non-sensitive columns only)
ALTER VIEW public.leaderboard_designer_details SET (security_invoker = false);
ALTER VIEW public.leaderboard_profiles SET (security_invoker = false);
REVOKE ALL ON public.leaderboard_designer_details FROM anon;
REVOKE ALL ON public.leaderboard_profiles FROM anon;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated;
GRANT SELECT ON public.leaderboard_profiles TO authenticated;

-- 2. Public designer profile (no email / payment info)
CREATE OR REPLACE FUNCTION public.get_designer_public_profile(p_designer_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  username text,
  bio text,
  specialty text,
  professional_title text,
  profile_photo_url text,
  professions text[],
  skills text[],
  experience_level text,
  total_points integer,
  talent_score numeric,
  join_date timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.username, p.bio, p.specialty,
         d.professional_title, d.profile_photo_url, d.professions, d.skills,
         d.experience_level, d.total_points, d.talent_score, p.join_date
  FROM public.profiles p
  LEFT JOIN public.designer_details d ON d.user_id = p.id
  WHERE p.id = p_designer_id
$$;

GRANT EXECUTE ON FUNCTION public.get_designer_public_profile(uuid) TO anon, authenticated;

-- 3. Public portfolio (approved works only)
CREATE OR REPLACE FUNCTION public.get_designer_public_portfolio(p_designer_id uuid)
RETURNS TABLE(
  id uuid,
  project_name text,
  service_type text,
  points_awarded integer,
  files_urls text[],
  design_link text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.project_name, s.service_type, s.points_awarded,
         s.files_urls, s.design_link, s.created_at
  FROM public.submissions s
  WHERE s.designer_id = p_designer_id
    AND s.status IN ('approved', 'client_accepted', 'ph_approved')
  ORDER BY s.created_at DESC
  LIMIT 60
$$;

GRANT EXECUTE ON FUNCTION public.get_designer_public_portfolio(uuid) TO anon, authenticated;

-- 4. Active designer sync must count claimed / active / in_progress
CREATE OR REPLACE FUNCTION public.sync_job_contract_active_designers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.job_contracts
  SET
    active_designer_ids = COALESCE((
      SELECT array_agg(designer_id) FROM public.job_contract_claims
      WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
        AND status IN ('claimed','active','in_progress')
    ), '{}'::uuid[]),
    active_designers_count = (
      SELECT COUNT(*) FROM public.job_contract_claims
      WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)
        AND status IN ('claimed','active','in_progress')
    )
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Claim: one active claim at a time, no re-claiming an already submitted job
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contract RECORD;
  v_active_claims_count INT;
  v_prior_count INT;
  v_claim_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'superadmin'::app_role)
             OR public.has_role(v_user_id, 'masteradmin'::app_role);

  SELECT COUNT(*) INTO v_active_claims_count
  FROM public.job_contract_claims
  WHERE designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');

  IF v_active_claims_count > 0 THEN
    IF v_is_admin THEN
      INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
      VALUES (v_user_id, 'job_contract_claim_bypass',
              'Admin bypassed the active-contract limit while claiming a job contract',
              jsonb_build_object('contract_id', p_contract_id, 'active_claims', v_active_claims_count));
    ELSE
      RAISE EXCEPTION 'You already have an active job contract. Submit or unclaim it before claiming another.';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_prior_count
  FROM public.job_contract_claims
  WHERE designer_id = v_user_id
    AND contract_id = p_contract_id
    AND status IN ('submitted', 'completed');

  IF v_prior_count > 0 AND NOT v_is_admin THEN
    RAISE EXCEPTION 'You have already submitted work for this job. It cannot be claimed again.';
  END IF;

  SELECT * INTO v_contract FROM public.job_contracts WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job contract not found.';
  END IF;

  IF v_contract.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Job contract is no longer open for claims.';
  END IF;

  INSERT INTO public.job_contract_claims (contract_id, designer_id, status, claimed_at)
  VALUES (p_contract_id, v_user_id, 'claimed', NOW())
  RETURNING id INTO v_claim_id;

  UPDATE public.job_contracts
  SET status = CASE WHEN status = 'active' THEN 'in_progress' ELSE status END
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'message', 'Contract claimed. Click Start Work when you are ready.'
  );
END;
$$;

-- 6. Release: fully remove the claim so the designer is free again
CREATE OR REPLACE FUNCTION public.release_job_contract(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_deleted INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  DELETE FROM public.job_contract_claims
  WHERE contract_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  DELETE FROM public.project_assignments
  WHERE project_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');

  UPDATE public.job_contracts
  SET status = CASE WHEN active_designers_count = 0 AND status = 'in_progress' THEN 'active' ELSE status END
  WHERE id = p_contract_id;

  RETURN jsonb_build_object('success', true, 'released', v_deleted,
    'message', 'Job released back to the marketplace.');
END;
$$;

-- 7. Also allow releasing a claimed client project assignment
CREATE OR REPLACE FUNCTION public.release_project_claim(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  DELETE FROM public.project_assignments
  WHERE project_id = p_project_id
    AND designer_id = auth.uid()
    AND status IN ('claimed', 'active', 'in_progress');

  UPDATE public.client_projects
  SET status = 'pending'
  WHERE id = p_project_id
    AND NOT EXISTS (
      SELECT 1 FROM public.project_assignments
      WHERE project_id = p_project_id
        AND status IN ('claimed', 'active', 'in_progress')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_project_claim(uuid) TO authenticated;
