-- Migration: Marketplace 1-Person Claim Enforcement, Live Countdown Timers,
-- 48-Hour Talent Cooldown on Missed Deadlines, Job Re-Listing,
-- Real-time Project Chat & Anti-Circumvention Moderation

-- 1. Ensure Columns in designer_details for 48-Hour Cooldown
ALTER TABLE IF EXISTS public.designer_details
  ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cooldown_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deadline_warnings_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_designer_cooldown_until ON public.designer_details (cooldown_until);

-- 2. Ensure Columns in client_projects for Deadlines & Claim Tracking
ALTER TABLE IF EXISTS public.client_projects
  ADD COLUMN IF NOT EXISTS deadline_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepted_designer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- 3. Ensure Columns in client_orders for Deadlines
ALTER TABLE IF EXISTS public.client_orders
  ADD COLUMN IF NOT EXISTS deadline_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. Ensure Columns in job_contracts
ALTER TABLE IF EXISTS public.job_contracts
  ADD COLUMN IF NOT EXISTS deadline_hours INTEGER DEFAULT 48,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- 5. Create / Ensure project_chat_messages Table for Real-time Messaging & Moderation
CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'designer', 'admin', 'system')),
  sender_name TEXT,
  content TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure all columns exist even if project_chat_messages table already existed
ALTER TABLE IF EXISTS public.project_chat_messages
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_project_id ON public.project_chat_messages (project_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON public.project_chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_is_flagged ON public.project_chat_messages (is_flagged);

-- Enable RLS on project_chat_messages
ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if existing to avoid conflicts
DROP POLICY IF EXISTS "Users can view project chat messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert project messages" ON public.project_chat_messages;
DROP POLICY IF EXISTS "Admins have full access to project chat" ON public.project_chat_messages;

-- RLS: Superadmins and Masteradmins can read all conversations (for compliance review)
CREATE POLICY "Admins have full access to project chat"
  ON public.project_chat_messages
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'masteradmin'::app_role)
  );

-- RLS: Clients & Designers can read messages for their own projects
CREATE POLICY "Users can view project chat messages"
  ON public.project_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.id::text = project_chat_messages.project_id::text
        AND (cp.client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
             OR cp.claimed_by::text = auth.uid()::text
             OR cp.accepted_designer_id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.client_orders co
      WHERE co.id::text = project_chat_messages.project_id::text
        AND (co.client_email = (SELECT email FROM auth.users WHERE id = auth.uid())
             OR co.assigned_designer_id::text = auth.uid()::text)
    )
    OR EXISTS (
      SELECT 1 FROM public.job_contracts jc
      JOIN public.job_contract_claims jcc ON jcc.contract_id = jc.id
      WHERE jc.id::text = project_chat_messages.project_id::text
        AND jcc.designer_id::text = auth.uid()::text
    )
  );

-- RLS: Authenticated participants can insert messages into their project
CREATE POLICY "Authenticated users can insert project messages"
  ON public.project_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Enable Realtime publication for chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. Enforce Strictly 1-Person Claiming & 48h Cooldown in claim_project RPC
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
  v_cooldown_until TIMESTAMP WITH TIME ZONE;
  v_hours INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  v_is_admin := has_role(v_user, 'superadmin'::app_role) OR has_role(v_user, 'masteradmin'::app_role);

  -- 1. Check if professional is in 48-Hour Cooldown
  SELECT cooldown_until INTO v_cooldown_until
  FROM public.designer_details
  WHERE user_id = v_user;

  IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
    RAISE EXCEPTION 'Account in 48-hour cooldown until %. Work actions are paused.', v_cooldown_until;
  END IF;

  -- 2. Lock the project row: ensures only the first claimant succeeds
  SELECT * INTO v_project FROM public.client_projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project.paid_at IS NULL AND COALESCE(v_project.price_ghs, 0) > 0 THEN
    RAISE EXCEPTION 'This project is not confirmed yet.';
  END IF;

  -- Strictly one claimant allowed per job
  IF v_project.claimed_by IS NOT NULL THEN
    RAISE EXCEPTION 'This job has already been claimed by another professional.';
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM public.project_assignments
  WHERE project_id = p_project_id AND status IN ('claimed','in_progress','active','submitted');
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'This job has already been claimed by another professional.';
  END IF;

  -- One active job limit per designer
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

  v_hours := COALESCE(v_project.deadline_hours, 48);

  -- Record assignment
  INSERT INTO public.project_assignments (project_id, designer_id, status)
  VALUES (p_project_id, v_user, 'claimed');

  -- Update client_project with claimant, claim timestamp, and deadline timestamp
  UPDATE public.client_projects
  SET
    claimed_by = v_user::text,
    accepted_designer_id = v_user::text,
    claimed_at = now(),
    deadline_at = now() + (v_hours * INTERVAL '1 hour'),
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_project_id;
END;
$function$;

-- 7. Enforce Strictly 1-Person Claiming & 48h Cooldown in claim_job_contract RPC
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_contract RECORD;
  v_cooldown_until TIMESTAMP WITH TIME ZONE;
  v_existing INTEGER;
  v_hours INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Check cooldown
  SELECT cooldown_until INTO v_cooldown_until
  FROM public.designer_details
  WHERE user_id = v_user;

  IF v_cooldown_until IS NOT NULL AND v_cooldown_until > now() THEN
    RAISE EXCEPTION 'Account in 48-hour cooldown until %. Work actions are paused.', v_cooldown_until;
  END IF;

  -- Lock contract row
  SELECT * INTO v_contract FROM public.job_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found';
  END IF;

  -- Strictly 1 person per contract
  SELECT COUNT(*) INTO v_existing
  FROM public.job_contract_claims
  WHERE contract_id = p_contract_id AND status IN ('claimed','active','in_progress','submitted');
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'This contract has already been claimed by another professional.';
  END IF;

  -- Check talent active claims
  SELECT COUNT(*) INTO v_existing
  FROM public.job_contract_claims
  WHERE designer_id = v_user AND status IN ('claimed','active','in_progress');
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'You already have an active job contract. Finish it first.';
  END IF;

  v_hours := COALESCE(v_contract.deadline_hours, 48);

  INSERT INTO public.job_contract_claims (contract_id, designer_id, status, created_at)
  VALUES (p_contract_id, v_user, 'claimed', now());

  UPDATE public.job_contracts
  SET
    claimed_at = now(),
    deadline_at = now() + (v_hours * INTERVAL '1 hour'),
    active_designers_count = 1,
    status = 'in_progress',
    updated_at = now()
  WHERE id = p_contract_id;
END;
$function$;

-- 8. Automated Deadline Expiration & 48-Hour Cooldown Activation Function
CREATE OR REPLACE FUNCTION public.check_and_expire_deadlines()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expired_count INTEGER := 0;
  v_proj RECORD;
  v_contract RECORD;
  v_claimant text;
BEGIN
  -- 1. Check expired client_projects
  FOR v_proj IN
    SELECT cp.*
    FROM public.client_projects cp
    WHERE cp.claimed_by IS NOT NULL
      AND cp.status = 'in_progress'
      AND cp.deadline_at IS NOT NULL
      AND cp.deadline_at < now()
      -- Exclude if work was submitted
      AND NOT EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.client_project_id::text = cp.id::text
          AND s.status IN ('pending', 'approved', 'correction_requested')
      )
  LOOP
    v_claimant := v_proj.claimed_by::text;

    -- Apply 48-hour cooldown to defaulting talent
    UPDATE public.designer_details
    SET
      cooldown_until = now() + INTERVAL '48 hours',
      cooldown_reason = 'Project deadline expired without submission. 48-hour cooldown applied.'
    WHERE user_id::text = v_claimant;

    -- Unassign project assignment
    UPDATE public.project_assignments
    SET status = 'expired_unclaimed'
    WHERE project_id::text = v_proj.id::text AND designer_id::text = v_claimant;

    -- Release project back to open marketplace
    UPDATE public.client_projects
    SET
      claimed_by = NULL,
      accepted_designer_id = NULL,
      claimed_at = NULL,
      deadline_at = NULL,
      status = 'pending',
      updated_at = now()
    WHERE id = v_proj.id;

    -- Log system event
    INSERT INTO public.system_logs (action_type, description, new_value)
    VALUES (
      'project_deadline_expired',
      'Project deadline expired. Job released to marketplace and 48-hour cooldown applied to talent.',
      jsonb_build_object('project_id', v_proj.id, 'talent_id', v_claimant)
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  -- 2. Check expired job_contracts
  FOR v_contract IN
    SELECT jc.*, jcc.designer_id::text as claimant_id
    FROM public.job_contracts jc
    JOIN public.job_contract_claims jcc ON jcc.contract_id::text = jc.id::text
    WHERE jcc.status IN ('claimed', 'active', 'in_progress')
      AND jc.deadline_at IS NOT NULL
      AND jc.deadline_at < now()
  LOOP
    v_claimant := v_contract.claimant_id;

    -- Apply 48-hour cooldown
    UPDATE public.designer_details
    SET
      cooldown_until = now() + INTERVAL '48 hours',
      cooldown_reason = 'Job contract deadline expired without submission. 48-hour cooldown applied.'
    WHERE user_id::text = v_claimant;

    -- Expire claim
    UPDATE public.job_contract_claims
    SET status = 'expired_unclaimed'
    WHERE contract_id::text = v_contract.id::text AND designer_id::text = v_claimant;

    -- Release contract back to open pool
    UPDATE public.job_contracts
    SET
      active_designers_count = 0,
      claimed_at = NULL,
      deadline_at = NULL,
      status = 'active',
      updated_at = now()
    WHERE id = v_contract.id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'expired_count', v_expired_count,
    'checked_at', now()
  );
END;
$function$;

-- 9. Super Admin Cancel Project for Off-Platform Communication (No Refund)
CREATE OR REPLACE FUNCTION public.admin_cancel_project_for_circumvention(p_project_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_is_admin BOOLEAN;
  v_proj RECORD;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  v_is_admin := has_role(v_admin, 'superadmin'::app_role) OR has_role(v_admin, 'masteradmin'::app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only super administrators can cancel projects for circumvention.';
  END IF;

  SELECT * INTO v_proj FROM public.client_projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  UPDATE public.client_projects
  SET
    status = 'cancelled',
    cancellation_reason = COALESCE(p_reason, 'Violation of Terms: Off-platform contact request. Non-refundable cancellation.'),
    updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.project_assignments
  SET status = 'cancelled'
  WHERE project_id = p_project_id;

  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (
    v_admin,
    'project_cancelled_circumvention',
    'Project cancelled with NO REFUND due to off-platform contact or communication violation.',
    jsonb_build_object('project_id', p_project_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object('status', 'success', 'project_id', p_project_id);
END;
$function$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_job_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_expire_deadlines() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_project_for_circumvention(uuid, text) TO authenticated;
