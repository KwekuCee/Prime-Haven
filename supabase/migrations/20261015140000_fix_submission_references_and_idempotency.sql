-- Migration: 20261015140000_fix_submission_references_and_idempotency.sql
-- Fixes marketplace & correction submission foreign keys, safe UUID resolution,
-- support for marketplace contracts in client acceptance / revision flows,
-- and strict idempotency for 70% talent earnings and points.

-- ====================================================================
-- 1. HARDEN approve_project_submission RPC
-- ====================================================================
CREATE OR REPLACE FUNCTION public.approve_project_submission(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_sub RECORD;
  v_project RECORD;
  v_contract RECORD;
  v_share numeric := 70;
  v_amount numeric := 0;
  v_parsed_price numeric := 0;
  v_clean_budget text;
  v_points integer := 40;
  v_email text;
  v_is_admin boolean;
  v_allowed boolean := false;
  v_service_lower text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found.'; END IF;

  IF v_sub.client_accepted OR v_sub.status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already approved.');
  END IF;

  v_is_admin := has_role(v_user, 'superadmin'::app_role) OR has_role(v_user, 'masteradmin'::app_role);

  -- Safe lookup for client_project without crashing on non-UUID strings
  IF v_sub.client_project_id IS NOT NULL THEN
    SELECT * INTO v_project FROM public.client_projects WHERE id = v_sub.client_project_id;
  END IF;

  IF v_project.id IS NULL AND v_sub.client_ref IS NOT NULL AND v_sub.client_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_project FROM public.client_projects WHERE id = v_sub.client_ref::uuid;
  END IF;

  -- Safe lookup for marketplace job_contracts
  IF v_sub.contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_sub.contract_id;
  END IF;

  IF v_contract.id IS NULL AND v_sub.client_project_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_sub.client_project_id;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user;

  -- Verify client or admin authorization
  IF v_is_admin THEN
    v_allowed := true;
  ELSIF v_project.id IS NOT NULL THEN
    IF (v_project.client_email IS NOT NULL AND lower(v_project.client_email) = lower(COALESCE(v_email, '')))
       OR (v_project.created_by IS NOT NULL AND v_project.created_by = v_user) THEN
      v_allowed := true;
    END IF;
  ELSIF v_contract.id IS NOT NULL THEN
    IF v_contract.posted_by IS NOT NULL AND v_contract.posted_by = v_user THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Only the client who owns this project can approve the work.';
  END IF;

  -- Fetch configured revenue share percentage (defaults to 70%)
  SELECT COALESCE((value #>> '{}')::numeric, 70) INTO v_share
  FROM public.system_settings WHERE key = 'revenue_share_percentage';
  v_share := COALESCE(v_share, 70);

  -- Resolve price from contract budget or client project price
  IF v_contract.id IS NOT NULL THEN
    v_clean_budget := regexp_replace(COALESCE(v_contract.budget, '0'), '[^0-9.]', '', 'g');
    IF v_clean_budget ~ '^[0-9]+(\.[0-9]+)?$' THEN
      v_parsed_price := v_clean_budget::numeric;
    END IF;
  ELSIF v_project.id IS NOT NULL THEN
    v_parsed_price := COALESCE(v_project.price_ghs, 0);
  END IF;

  v_amount := ROUND(COALESCE(v_parsed_price, 0) * v_share / 100.0, 2);

  -- Determine points: 0 points for corrections, track-specific points for regular submissions
  IF v_sub.parent_submission_id IS NOT NULL THEN
    v_points := 0;
  ELSE
    v_service_lower := lower(COALESCE(v_sub.service_type, ''));
    IF v_service_lower LIKE '%ui%' OR v_service_lower LIKE '%ux%' THEN v_points := 65;
    ELSIF v_service_lower LIKE '%web%' THEN v_points := 65;
    ELSIF v_service_lower LIKE '%mobile%' OR v_service_lower LIKE '%app%' THEN v_points := 65;
    ELSIF v_service_lower LIKE '%logo%' THEN v_points := 45;
    ELSIF v_service_lower LIKE '%brand%' THEN v_points := 50;
    ELSIF v_service_lower LIKE '%motion%' OR v_service_lower LIKE '%animat%' THEN v_points := 50;
    ELSIF v_service_lower LIKE '%video%' THEN v_points := 50;
    ELSIF v_service_lower LIKE '%it%' OR v_service_lower LIKE '%tech%' OR v_service_lower LIKE '%solution%' THEN v_points := 50;
    ELSIF v_service_lower LIKE '%social%' OR v_service_lower LIKE '%smm%' THEN v_points := 40;
    ELSIF v_service_lower LIKE '%flyer%' THEN v_points := 40;
    ELSIF v_service_lower LIKE '%print%' THEN v_points := 20;
    ELSE v_points := 40;
    END IF;
  END IF;

  PERFORM set_config('app.workflow_bypass', 'on', true);

  -- 1. Mark submission approved
  UPDATE public.submissions
  SET status = 'approved',
      client_accepted = true,
      client_accepted_at = now(),
      client_accepted_by = v_user,
      points_awarded = CASE WHEN v_sub.parent_submission_id IS NOT NULL THEN 0 ELSE COALESCE(points_awarded, v_points) END,
      final_approval_date = now(),
      updated_at = now()
  WHERE id = p_submission_id;

  -- 2. Award points (only once, if points > 0)
  IF v_points > 0 THEN
    UPDATE public.designer_details
    SET total_points = COALESCE(total_points, 0) + v_points,
        monthly_points = COALESCE(monthly_points, 0) + v_points,
        updated_at = now()
    WHERE user_id = v_sub.designer_id;
  END IF;

  -- 3. Close out contract or project
  IF v_contract.id IS NOT NULL THEN
    UPDATE public.job_contracts
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE id = v_contract.id;

    UPDATE public.job_contract_claims
    SET status = 'completed',
        updated_at = now()
    WHERE contract_id = v_contract.id
      AND designer_id = v_sub.designer_id;
  END IF;

  IF v_project.id IS NOT NULL THEN
    UPDATE public.client_projects
    SET status = 'completed',
        progress_percentage = 100,
        accepted_designer_id = COALESCE(accepted_designer_id, v_sub.designer_id),
        updated_at = now()
    WHERE id = v_project.id;

    UPDATE public.project_assignments
    SET status = 'completed'
    WHERE project_id = v_project.id
      AND designer_id = v_sub.designer_id;
  END IF;

  -- 4. Idempotently insert 70% talent earning and increment estimated salary
  IF v_amount > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.job_earnings
      WHERE submission_id = p_submission_id
         OR (contract_id = v_contract.id AND v_contract.id IS NOT NULL)
         OR (project_id = v_project.id AND v_project.id IS NOT NULL AND v_contract.id IS NULL)
    ) THEN
      INSERT INTO public.job_earnings (
        designer_id,
        project_id,
        contract_id,
        submission_id,
        job_price,
        share_percent,
        amount,
        currency,
        status,
        created_at,
        updated_at
      )
      VALUES (
        v_sub.designer_id,
        v_project.id,
        v_contract.id,
        p_submission_id,
        v_parsed_price,
        v_share,
        v_amount,
        'GHS',
        'available',
        now(),
        now()
      );

      UPDATE public.designer_details
      SET salary_estimated = COALESCE(salary_estimated, 0) + v_amount,
          updated_at = now()
      WHERE user_id = v_sub.designer_id;
    END IF;
  END IF;

  -- 5. Notify talent
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_sub.designer_id,
    'Work approved by client',
    'Your submission was approved. Points and your ' || v_share::text || '% share (GH₵' || v_amount::text || ') have been credited.',
    'success',
    '/dashboard'
  );

  RETURN jsonb_build_object('success', true, 'amount', v_amount, 'share_percent', v_share);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_project_submission(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_project_submission(uuid) TO authenticated;


-- ====================================================================
-- 2. HARDEN request_project_revision RPC (Supports Marketplace Contracts)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.request_project_revision(p_submission_id uuid, p_feedback text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_project RECORD;
  v_contract RECORD;
  v_allowed boolean := false;
  v_is_admin boolean;
  v_feedback text := NULLIF(btrim(COALESCE(p_feedback, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  IF v_feedback IS NULL OR length(v_feedback) < 5 THEN
    RAISE EXCEPTION 'Please describe the changes you need (at least 5 characters).';
  END IF;
  IF length(v_feedback) > 4000 THEN RAISE EXCEPTION 'Feedback is too long.'; END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deliverable not found.'; END IF;
  IF v_sub.status = 'approved' OR v_sub.client_accepted THEN
    RAISE EXCEPTION 'This deliverable is already approved.';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'superadmin'::app_role)
             OR public.has_role(auth.uid(), 'masteradmin'::app_role);

  -- Safe lookup for client_project
  IF v_sub.client_project_id IS NOT NULL THEN
    SELECT * INTO v_project FROM public.client_projects WHERE id = v_sub.client_project_id;
  END IF;
  IF v_project.id IS NULL AND v_sub.client_ref IS NOT NULL AND v_sub.client_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_project FROM public.client_projects WHERE id = v_sub.client_ref::uuid;
  END IF;

  -- Safe lookup for marketplace job_contracts
  IF v_sub.contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_sub.contract_id;
  END IF;
  IF v_contract.id IS NULL AND v_sub.client_project_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_sub.client_project_id;
  END IF;

  -- Verify client ownership or admin role
  v_allowed := v_is_admin
            OR (v_project.id IS NOT NULL AND (
                  lower(COALESCE(v_project.client_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
                  OR v_project.created_by = auth.uid()
               ))
            OR (v_contract.id IS NOT NULL AND (
                  v_contract.posted_by = auth.uid()
               ));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You cannot review this deliverable.';
  END IF;

  -- Update submission status to revision
  UPDATE public.submissions
  SET status = 'revision',
      revisions_count = COALESCE(revisions_count, 0) + 1,
      rejection_reason = v_feedback,
      updated_at = now()
  WHERE id = p_submission_id;

  -- Update project status if attached
  IF v_project.id IS NOT NULL THEN
    UPDATE public.client_projects
    SET status = 'correction',
        updated_at = now()
    WHERE id = v_project.id;
  END IF;

  -- Update marketplace contract status if attached
  IF v_contract.id IS NOT NULL THEN
    UPDATE public.job_contracts
    SET status = 'correction',
        updated_at = now()
    WHERE id = v_contract.id;
  END IF;

  -- Record revision history
  INSERT INTO public.project_revisions (submission_id, client_email, feedback)
  VALUES (p_submission_id, COALESCE(auth.jwt() ->> 'email', v_project.client_email, ''), v_feedback);

  -- Notify the claiming talent
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_sub.designer_id,
    'Correction requested',
    'The client asked for changes on "' || v_sub.project_name || '": ' || v_feedback,
    'warning',
    '/submit-work?correction=' || p_submission_id::text
  );

  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (
    auth.uid(),
    'correction_requested',
    'Client requested changes on "' || v_sub.project_name || '"',
    jsonb_build_object('submission_id', p_submission_id, 'contract_id', v_sub.contract_id, 'project_id', v_sub.client_project_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Revision requested.');
END;
$function$;

REVOKE ALL ON FUNCTION public.request_project_revision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_project_revision(uuid, text) TO authenticated;


-- ====================================================================
-- 3. HARDEN admin_client_accept_submission RPC (Idempotent 70% earnings)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_client_accept_submission(
  p_submission_id uuid,
  p_points integer,
  p_dept_label text DEFAULT 'Dept'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points integer;
  v_contract public.job_contracts;
  v_project public.client_projects;
  v_parsed_price numeric := 0;
  v_talent_earned numeric := 0;
  v_clean_budget text;
  v_contract_id uuid;
  v_service_lower text;
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'submission_not_found'; END IF;
  IF v_sub.client_accepted THEN RAISE EXCEPTION 'already_accepted'; END IF;

  -- If it's a correction revision, points are 0
  IF v_sub.parent_submission_id IS NOT NULL THEN
    v_points := 0;
  ELSE
    v_service_lower := lower(COALESCE(v_sub.service_type, ''));
    IF p_points IS NULL OR p_points <= 0 OR p_points = 40 THEN
      IF v_service_lower LIKE '%ui%' OR v_service_lower LIKE '%ux%' THEN v_points := 65;
      ELSIF v_service_lower LIKE '%web%' THEN v_points := 65;
      ELSIF v_service_lower LIKE '%mobile%' OR v_service_lower LIKE '%app%' THEN v_points := 65;
      ELSIF v_service_lower LIKE '%logo%' THEN v_points := 45;
      ELSIF v_service_lower LIKE '%brand%' THEN v_points := 50;
      ELSIF v_service_lower LIKE '%motion%' OR v_service_lower LIKE '%animat%' THEN v_points := 50;
      ELSIF v_service_lower LIKE '%video%' THEN v_points := 50;
      ELSIF v_service_lower LIKE '%it%' OR v_service_lower LIKE '%tech%' OR v_service_lower LIKE '%solution%' THEN v_points := 50;
      ELSIF v_service_lower LIKE '%social%' OR v_service_lower LIKE '%smm%' THEN v_points := 40;
      ELSIF v_service_lower LIKE '%flyer%' THEN v_points := 40;
      ELSIF v_service_lower LIKE '%print%' THEN v_points := 20;
      ELSE v_points := GREATEST(COALESCE(p_points, 40), 0);
      END IF;
    ELSE
      v_points := p_points;
    END IF;
  END IF;

  -- 1. Mark submission accepted and approved
  UPDATE public.submissions
     SET client_accepted = true,
         client_accepted_at = now(),
         client_accepted_by = auth.uid(),
         points_awarded = COALESCE(points_awarded, 0) + v_points,
         status = 'approved',
         final_approval_date = now(),
         updated_at = now()
   WHERE id = p_submission_id;

  -- 2. Award points to talent
  IF v_points > 0 THEN
    UPDATE public.designer_details
       SET total_points = COALESCE(total_points, 0) + v_points,
           monthly_points = COALESCE(monthly_points, 0) + v_points,
           updated_at = now()
     WHERE user_id = v_sub.designer_id;
  END IF;

  -- 3. Check for linked job contract or client project
  v_contract_id := COALESCE(v_sub.contract_id, v_sub.client_project_id);

  IF v_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_contract_id;
    IF v_contract.id IS NOT NULL THEN
      v_clean_budget := regexp_replace(COALESCE(v_contract.budget, '0'), '[^0-9.]', '', 'g');
      IF v_clean_budget ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_parsed_price := v_clean_budget::numeric;
      END IF;

      UPDATE public.job_contracts
         SET status = 'completed',
             completed_at = now(),
             updated_at = now()
       WHERE id = v_contract.id;

      UPDATE public.job_contract_claims
         SET status = 'completed',
             updated_at = now()
       WHERE contract_id = v_contract.id
         AND designer_id = v_sub.designer_id;
    ELSE
      SELECT * INTO v_project FROM public.client_projects WHERE id = v_contract_id;
      IF v_project.id IS NOT NULL THEN
        v_parsed_price := COALESCE(v_project.price_ghs, 0);
        UPDATE public.client_projects
           SET status = 'completed',
               updated_at = now()
         WHERE id = v_project.id;
      END IF;
    END IF;
  END IF;

  -- 4. Calculate 70% share and insert into job_earnings if price > 0 (IDEMPOTENT)
  IF v_parsed_price > 0 THEN
    v_talent_earned := round(v_parsed_price * 0.70, 2);

    IF NOT EXISTS (
      SELECT 1 FROM public.job_earnings
      WHERE submission_id = v_sub.id
         OR (contract_id = v_contract.id AND v_contract.id IS NOT NULL)
         OR (project_id = v_project.id AND v_project.id IS NOT NULL AND v_contract.id IS NULL)
    ) THEN
      INSERT INTO public.job_earnings (
        designer_id,
        project_id,
        contract_id,
        submission_id,
        job_price,
        share_percent,
        amount,
        currency,
        status,
        created_at,
        updated_at
      )
      VALUES (
        v_sub.designer_id,
        v_sub.client_project_id,
        v_contract_id,
        v_sub.id,
        v_parsed_price,
        70,
        v_talent_earned,
        'GHS',
        'available',
        now(),
        now()
      );

      UPDATE public.designer_details
         SET salary_estimated = COALESCE(salary_estimated, 0) + v_talent_earned,
             updated_at = now()
       WHERE user_id = v_sub.designer_id;
    END IF;
  END IF;

  -- 5. Audit log
  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (
    auth.uid(),
    'admin_client_accept_submission',
    'Work for project "' || v_sub.project_name || '" approved with 70% payout and ' || v_points || ' points.',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'designer_id', v_sub.designer_id,
      'contract_id', v_contract_id,
      'points_awarded', v_points,
      'parsed_price_ghs', v_parsed_price,
      'talent_earned_ghs', v_talent_earned,
      'dept', p_dept_label
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'parsed_price', v_parsed_price,
    'talent_earned', v_talent_earned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) TO authenticated;
