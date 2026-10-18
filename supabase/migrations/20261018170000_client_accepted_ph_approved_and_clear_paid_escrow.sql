-- Migration: Ensure ph_approved is recorded as true when client_accepted is marked,
-- and provide secure RPC and RLS policies for clearing paid escrow (client_debts).

-- 1. Automatic sync trigger on submissions: whenever client_accepted = true, ph_approved must be true
CREATE OR REPLACE FUNCTION public.sync_submission_client_accepted_ph_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_accepted = true THEN
    NEW.ph_approved := true;
    IF NEW.ph_approved_at IS NULL THEN
      NEW.ph_approved_at := COALESCE(NEW.client_accepted_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_submission_client_accepted_ph_approved ON public.submissions;
CREATE TRIGGER trg_sync_submission_client_accepted_ph_approved
BEFORE INSERT OR UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_submission_client_accepted_ph_approved();

-- Backfill existing accepted submissions to have ph_approved = true
UPDATE public.submissions
SET ph_approved = true,
    ph_approved_at = COALESCE(ph_approved_at, client_accepted_at, now())
WHERE client_accepted = true AND ph_approved IS NOT TRUE;

-- 2. Update admin_client_accept_submission RPC to explicitly record ph_approved = true
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

  -- 1. Mark submission accepted and approved (both ph_approved and client_accepted are recorded as true)
  UPDATE public.submissions
     SET client_accepted = true,
         client_accepted_at = now(),
         client_accepted_by = auth.uid(),
         ph_approved = true,
         ph_approved_at = COALESCE(ph_approved_at, now()),
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

      v_talent_earned := ROUND(v_parsed_price * 0.70, 2);

      UPDATE public.job_contracts
         SET status = 'completed',
             completed_at = now(),
             updated_at = now()
       WHERE id = v_contract.id;

      UPDATE public.job_contract_claims
         SET status = 'completed',
             updated_at = now()
       WHERE contract_id = v_contract.id AND designer_id = v_sub.designer_id;

      IF v_talent_earned > 0 THEN
        UPDATE public.designer_details
           SET job_earnings = COALESCE(job_earnings, 0) + v_talent_earned,
               salary_estimated = COALESCE(salary_estimated, 0) + v_talent_earned,
               updated_at = now()
         WHERE user_id = v_sub.designer_id;
      END IF;
    ELSE
      SELECT * INTO v_project FROM public.client_projects WHERE id = v_contract_id;
      IF v_project.id IS NOT NULL THEN
        v_parsed_price := COALESCE(v_project.price_ghs, 0);
        v_talent_earned := ROUND(v_parsed_price * 0.70, 2);

        UPDATE public.client_projects
           SET status = 'completed',
               updated_at = now()
         WHERE id = v_project.id;

        IF v_talent_earned > 0 THEN
          UPDATE public.designer_details
             SET job_earnings = COALESCE(job_earnings, 0) + v_talent_earned,
                 salary_estimated = COALESCE(salary_estimated, 0) + v_talent_earned,
                 updated_at = now()
           WHERE user_id = v_sub.designer_id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Free any remaining active claims for this talent
  UPDATE public.job_contract_claims
     SET status = 'completed',
         updated_at = now()
   WHERE designer_id = v_sub.designer_id
     AND status IN ('claimed', 'active', 'in_progress', 'submitted');

  -- Free any project assignments
  UPDATE public.project_assignments
     SET status = 'completed'
   WHERE designer_id = v_sub.designer_id
     AND status IN ('assigned', 'claimed', 'active', 'in_progress', 'submitted');

  -- Log action
  INSERT INTO public.system_logs (action_type, admin_id, description, timestamp)
  VALUES (
    'admin_client_accept_submission',
    auth.uid(),
    '[' || COALESCE(p_dept_label, 'Dept') || '] Admin accepted: ' || COALESCE(v_sub.project_name, 'Project') || ' (+' || v_points || ' pts, GH₵' || v_talent_earned || ' 70% share)',
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'earned', v_talent_earned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) TO authenticated;

-- 3. Update approve_project_submission RPC to explicitly record ph_approved = true
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

  -- 1. Mark submission approved and recorded as both client_accepted and ph_approved = true
  UPDATE public.submissions
  SET status = 'approved',
      ph_approved = true,
      ph_approved_at = COALESCE(ph_approved_at, now()),
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
    WHERE contract_id = v_contract.id AND designer_id = v_sub.designer_id;
  ELSIF v_project.id IS NOT NULL THEN
    UPDATE public.client_projects
    SET status = 'completed',
        updated_at = now()
    WHERE id = v_project.id;
  END IF;

  -- 4. Free talent active claims
  UPDATE public.job_contract_claims
  SET status = 'completed',
      updated_at = now()
  WHERE designer_id = v_sub.designer_id
    AND status IN ('claimed', 'active', 'in_progress', 'submitted');

  -- 5. Free project assignments
  UPDATE public.project_assignments
  SET status = 'completed'
  WHERE designer_id = v_sub.designer_id
    AND status IN ('assigned', 'claimed', 'active', 'in_progress', 'submitted');

  -- 6. Award 70% share to designer details
  IF v_amount > 0 THEN
    UPDATE public.designer_details
    SET job_earnings = COALESCE(job_earnings, 0) + v_amount,
        salary_estimated = COALESCE(salary_estimated, 0) + v_amount,
        updated_at = now()
    WHERE user_id = v_sub.designer_id;
  END IF;

  -- 7. Notify designer
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_sub.designer_id,
    'Client Approved Your Work',
    'Your delivery for "' || v_sub.project_name || '" has been approved. You earned ' || v_points || ' points' || CASE WHEN v_amount > 0 THEN ' and GH₵ ' || v_amount || ' (70% revenue share)' ELSE '' END || '.',
    'project_accepted',
    '/dashboard'
  );

  PERFORM set_config('app.workflow_bypass', 'off', true);

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'amount', v_amount,
    'message', 'Project approved and completed successfully.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_project_submission(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_project_submission(uuid) TO authenticated;

-- 4. Secure RPC function to clear paid client debts (escrow)
CREATE OR REPLACE FUNCTION public.clear_paid_client_debts(p_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_ids IS NOT NULL AND array_length(p_ids, 1) > 0 THEN
    DELETE FROM public.client_debts
    WHERE id = ANY(p_ids) AND lower(COALESCE(status, '')) = 'paid';
  ELSE
    DELETE FROM public.client_debts
    WHERE lower(COALESCE(status, '')) = 'paid';
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_paid_client_debts(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clear_paid_client_debts(uuid[]) TO authenticated;

-- 5. Ensure RLS policies allow admins to delete, select, update, and insert client_debts
ALTER TABLE public.client_debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete client_debts" ON public.client_debts;
CREATE POLICY "Admins can delete client_debts"
  ON public.client_debts
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'masteradmin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can select client_debts" ON public.client_debts;
CREATE POLICY "Admins can select client_debts"
  ON public.client_debts
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'masteradmin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update client_debts" ON public.client_debts;
CREATE POLICY "Admins can update client_debts"
  ON public.client_debts
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'masteradmin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can insert client_debts" ON public.client_debts;
CREATE POLICY "Admins can insert client_debts"
  ON public.client_debts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'masteradmin'::app_role)
  );
