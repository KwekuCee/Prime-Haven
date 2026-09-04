-- 1. Client role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- 2. client_projects new columns
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS price_ghs numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.client_projects ALTER COLUMN max_assignees SET DEFAULT 1;
UPDATE public.client_projects SET max_assignees = 1 WHERE COALESCE(max_assignees, 1) <> 1;

-- 3. Per-job earnings (70% share), only created on client approval
CREATE TABLE IF NOT EXISTS public.job_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL,
  project_id uuid,
  submission_id uuid,
  job_price numeric NOT NULL DEFAULT 0,
  share_percent numeric NOT NULL DEFAULT 70,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'earned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_earnings TO authenticated;
GRANT ALL ON public.job_earnings TO service_role;
ALTER TABLE public.job_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designers view their own earnings" ON public.job_earnings;
CREATE POLICY "Designers view their own earnings"
ON public.job_earnings FOR SELECT TO authenticated
USING (designer_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role));

DROP TRIGGER IF EXISTS trg_job_earnings_updated ON public.job_earnings;
CREATE TRIGGER trg_job_earnings_updated BEFORE UPDATE ON public.job_earnings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_job_earnings_designer ON public.job_earnings(designer_id);

-- 4. New signups can be clients (no designer records / leaderboard presence)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type text;
BEGIN
  v_account_type := COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'designer');

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  IF v_account_type = 'client' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'designer');
    INSERT INTO public.designer_details (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. First-come-first-served claiming, one active job per professional
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_project RECORD;
  v_existing INTEGER;
  v_designer_professions TEXT[];
  v_is_admin BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  v_is_admin := has_role(v_user, 'superadmin'::app_role) OR has_role(v_user, 'masteradmin'::app_role);

  -- Lock the project row: guarantees only the first claimer wins
  SELECT * INTO v_project FROM public.client_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project.paid_at IS NULL AND COALESCE(v_project.price_ghs, 0) > 0 THEN
    RAISE EXCEPTION 'This project is not confirmed yet.';
  END IF;

  IF v_project.claimed_by IS NOT NULL THEN
    RAISE EXCEPTION 'This job has already been claimed by another professional.';
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM public.project_assignments
  WHERE project_id = p_project_id AND status IN ('claimed','in_progress','active','submitted');
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'This job has already been claimed by another professional.';
  END IF;

  -- One active job at a time (until submitted work is approved by the client)
  IF NOT v_is_admin THEN
    SELECT COUNT(*) INTO v_existing
    FROM public.project_assignments pa
    WHERE pa.designer_id = v_user
      AND pa.status IN ('claimed','in_progress','active','submitted');
    IF v_existing > 0 THEN
      RAISE EXCEPTION 'You already have an active job. Finish and submit it before claiming another.';
    END IF;

    SELECT COUNT(*) INTO v_existing
    FROM public.job_contract_claims
    WHERE designer_id = v_user AND status IN ('claimed','active','in_progress');
    IF v_existing > 0 THEN
      RAISE EXCEPTION 'You have an active job contract. Complete it before claiming another job.';
    END IF;

    SELECT professions INTO v_designer_professions
    FROM public.designer_details WHERE user_id = v_user;

    IF array_length(v_project.required_professions, 1) > 0
       AND NOT (COALESCE(v_designer_professions, '{}') && v_project.required_professions) THEN
      RAISE EXCEPTION 'Your profession does not match the requirements for this job';
    END IF;
  ELSE
    INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
    VALUES (v_user, 'project_claim_admin', 'Admin claimed a client project from the marketplace',
            jsonb_build_object('project_id', p_project_id));
  END IF;

  INSERT INTO public.project_assignments (project_id, designer_id, status)
  VALUES (p_project_id, v_user, 'claimed');

  UPDATE public.client_projects
  SET claimed_by = v_user, claimed_at = now(), status = 'in_progress', updated_at = now()
  WHERE id = p_project_id;
END;
$function$;

-- Releasing a claim clears the claimant
CREATE OR REPLACE FUNCTION public.release_project_claim(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  DELETE FROM public.project_assignments
  WHERE project_id = p_project_id
    AND designer_id = auth.uid()
    AND status IN ('claimed', 'active', 'in_progress');

  UPDATE public.client_projects
  SET claimed_by = NULL, claimed_at = NULL, status = 'pending', updated_at = now()
  WHERE id = p_project_id
    AND NOT EXISTS (
      SELECT 1 FROM public.project_assignments
      WHERE project_id = p_project_id AND status IN ('claimed','active','in_progress','submitted')
    );
END;
$function$;

-- 6. Auto-release claims whose deadline passed with nothing submitted
CREATE OR REPLACE FUNCTION public.release_expired_project_claims()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_count integer := 0;
BEGIN
  WITH expired AS (
    SELECT cp.id
    FROM public.client_projects cp
    WHERE cp.claimed_by IS NOT NULL
      AND cp.deadline IS NOT NULL
      AND cp.deadline < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.project_assignments pa
        WHERE pa.project_id = cp.id AND pa.status IN ('submitted','completed')
      )
  ), del AS (
    DELETE FROM public.project_assignments pa
    USING expired e
    WHERE pa.project_id = e.id AND pa.status IN ('claimed','active','in_progress')
    RETURNING pa.project_id
  )
  UPDATE public.client_projects cp
  SET claimed_by = NULL, claimed_at = NULL, status = 'pending', updated_at = now()
  WHERE cp.id IN (SELECT id FROM expired);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 7. Client approval completes the job, awards points and records the 70% share
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
  v_share numeric;
  v_amount numeric;
  v_email text;
  v_is_admin boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found.'; END IF;

  IF v_sub.status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already approved.');
  END IF;

  v_is_admin := has_role(v_user, 'superadmin'::app_role) OR has_role(v_user, 'masteradmin'::app_role);

  SELECT * INTO v_project FROM public.client_projects
  WHERE id = COALESCE(v_sub.client_project_id, NULLIF(v_sub.client_ref, '')::uuid);

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user;

  IF NOT v_is_admin THEN
    IF v_project.id IS NULL OR lower(COALESCE(v_project.client_email, '')) <> lower(COALESCE(v_email, '')) THEN
      RAISE EXCEPTION 'Only the client who owns this project can approve the work.';
    END IF;
  END IF;

  SELECT COALESCE((value #>> '{}')::numeric, 70) INTO v_share
  FROM public.system_settings WHERE key = 'revenue_share_percentage';
  v_share := COALESCE(v_share, 70);

  v_amount := ROUND(COALESCE(v_project.price_ghs, 0) * v_share / 100.0, 2);

  PERFORM set_config('app.workflow_bypass', 'on', true);

  UPDATE public.submissions
  SET status = 'approved',
      client_accepted = true,
      client_accepted_at = now(),
      client_accepted_by = v_user,
      final_approval_date = now(),
      updated_at = now()
  WHERE id = p_submission_id;

  UPDATE public.designer_details
  SET total_points = COALESCE(total_points, 0) + COALESCE(v_sub.points_awarded, 0),
      monthly_points = COALESCE(monthly_points, 0) + COALESCE(v_sub.points_awarded, 0),
      updated_at = now()
  WHERE user_id = v_sub.designer_id;

  IF v_project.id IS NOT NULL THEN
    INSERT INTO public.job_earnings (designer_id, project_id, submission_id, job_price, share_percent, amount, status)
    VALUES (v_sub.designer_id, v_project.id, p_submission_id, COALESCE(v_project.price_ghs, 0), v_share, v_amount, 'earned');

    UPDATE public.project_assignments
    SET status = 'completed'
    WHERE project_id = v_project.id AND designer_id = v_sub.designer_id;

    UPDATE public.client_projects
    SET status = 'completed', progress_percentage = 100,
        accepted_designer_id = COALESCE(accepted_designer_id, v_sub.designer_id),
        updated_at = now()
    WHERE id = v_project.id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_sub.designer_id, 'Work approved by client',
          'Your submission was approved. Points and your ' || v_share::text || '% share have been credited.',
          'success', '/dashboard');

  RETURN jsonb_build_object('success', true, 'amount', v_amount, 'share_percent', v_share);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_project_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_project_claims() TO service_role;

-- 8. Drop the PH-approval gate from the workflow guard
CREATE OR REPLACE FUNCTION public.guard_submissions_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  is_designer boolean;
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.workflow_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  is_admin := has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role);
  IF is_admin THEN
    -- Admins keep an emergency override (reject / revoke) but cannot approve for a client
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved'
       AND COALESCE(NEW.client_accepted, false) = false THEN
      RAISE EXCEPTION 'Only the client can approve work. Admins may reject or revoke it.';
    END IF;
    RETURN NEW;
  END IF;

  is_designer := (auth.uid() = OLD.designer_id);

  NEW.designer_id := OLD.designer_id;
  NEW.client_project_id := OLD.client_project_id;
  NEW.client_ref := OLD.client_ref;
  NEW.points_awarded := OLD.points_awarded;
  NEW.reviewer_id := OLD.reviewer_id;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.final_approval_date := OLD.final_approval_date;
  NEW.client_preference := OLD.client_preference;
  NEW.ph_approved := OLD.ph_approved;
  NEW.ph_approved_at := OLD.ph_approved_at;
  NEW.ph_approved_by := OLD.ph_approved_by;

  IF is_designer THEN
    NEW.status := OLD.status;
    NEW.client_accepted := OLD.client_accepted;
    NEW.client_accepted_at := OLD.client_accepted_at;
    NEW.client_accepted_by := OLD.client_accepted_by;
    NEW.revisions_count := OLD.revisions_count;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('revision', 'client_rejected') THEN
      NEW.status := OLD.status;
    END IF;
    NEW.files_urls := OLD.files_urls;
    NEW.design_link := OLD.design_link;
    NEW.project_name := OLD.project_name;
    NEW.service_type := OLD.service_type;
    NEW.client_accepted := OLD.client_accepted;
    NEW.client_accepted_at := OLD.client_accepted_at;
    NEW.client_accepted_by := OLD.client_accepted_by;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_release_designer_on_ph_approval ON public.submissions;

-- 9. Marketplace listing: only confirmed (paid) projects, unclaimed
DROP FUNCTION IF EXISTS public.get_pending_client_projects();
CREATE OR REPLACE FUNCTION public.get_pending_client_projects()
RETURNS TABLE(id uuid, title text, category text, description text, budget text, deadline timestamp with time zone, required_professions text[], max_assignees integer, status text, created_at timestamp with time zone, price_ghs numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cp.id, cp.title, cp.category, cp.description, cp.budget, cp.deadline,
         cp.required_professions, cp.max_assignees, cp.status, cp.created_at, cp.price_ghs
  FROM public.client_projects cp
  WHERE cp.status = 'pending'
    AND cp.claimed_by IS NULL
    AND (cp.paid_at IS NOT NULL OR COALESCE(cp.price_ghs, 0) = 0)
    AND (
      public.has_role(auth.uid(), 'designer'::app_role)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::app_role)
    );
$function$;

-- 10. Project chat: client owner + current claimant only
DROP POLICY IF EXISTS "Project chat participants can read" ON public.project_chat_messages;
CREATE POLICY "Project chat participants can read"
ON public.project_chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND (
        cp.claimed_by = auth.uid()
        OR cp.accepted_designer_id = auth.uid()
        OR cp.created_by = auth.uid()
        OR lower(COALESCE(cp.client_email, '')) = lower(COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
      )
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);

DROP POLICY IF EXISTS "Project chat participants can write" ON public.project_chat_messages;
CREATE POLICY "Project chat participants can write"
ON public.project_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND char_length(content) BETWEEN 1 AND 5000
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND (
        cp.claimed_by = auth.uid()
        OR cp.accepted_designer_id = auth.uid()
        OR cp.created_by = auth.uid()
        OR lower(COALESCE(cp.client_email, '')) = lower(COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
      )
  )
);

-- Clients can see their own projects and their submissions
DROP POLICY IF EXISTS "Clients view their own projects" ON public.client_projects;
CREATE POLICY "Clients view their own projects"
ON public.client_projects FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR claimed_by = auth.uid()
  OR accepted_designer_id = auth.uid()
  OR lower(COALESCE(client_email, '')) = lower(COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), ''))
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);
