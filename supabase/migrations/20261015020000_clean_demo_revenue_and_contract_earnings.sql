-- Migration: Clean Demo Revenue, Enforce Real Contract Budgets & Payment Gateway Revenue, Standardize 40 Points and 70% Profit Split
-- Date: 2026-10-15

-- ====================================================================
-- 1. CLEAN PHANTOM / DEMO REVENUE IN system_settings
-- ====================================================================
-- Clear old demo revenue allocations (Graphic Design GH₵6,500, Web Dev GH₵3,500, Mobile App GH₵1,200)
-- All profession figures will now strictly derive from active job contract budgets and real payment gateway money.
INSERT INTO public.system_settings (key, value, updated_at)
VALUES 
  ('monthly_revenue_by_category', '{
    "graphic": 0,
    "uiux": 0,
    "web": 0,
    "graphic-design": 0,
    "ui-ux-design": 0,
    "web-development": 0,
    "mobile-app-development": 0,
    "motion-graphics": 0,
    "video-editing": 0,
    "social-media-management": 0,
    "it-solutions": 0
  }'::jsonb, now()),
  ('monthly_revenue', '{"amount": 0}'::jsonb, now()),
  ('client_acceptance_points', '{"value": 40}'::jsonb, now()),
  ('revenue_share_percentage', '{"value": 70}'::jsonb, now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- ====================================================================
-- 2. ENSURE REQUIRED COLUMNS ON submissions AND job_contracts
-- ====================================================================
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS client_project_id uuid,
  ADD COLUMN IF NOT EXISTS client_ref text,
  ADD COLUMN IF NOT EXISTS parent_submission_id uuid,
  ADD COLUMN IF NOT EXISTS ph_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_accepted_by uuid,
  ADD COLUMN IF NOT EXISTS final_approval_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_submissions_client_project_id ON public.submissions(client_project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_designer_id ON public.submissions(designer_id);

ALTER TABLE public.job_contracts
  ADD COLUMN IF NOT EXISTS active_designer_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_professions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS budget text DEFAULT '0';

-- Enable RLS and add full admin and viewer policies on job_contracts
ALTER TABLE public.job_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage all job contracts" ON public.job_contracts;
CREATE POLICY "Admins can view and manage all job contracts"
ON public.job_contracts FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users view open contracts" ON public.job_contracts;
CREATE POLICY "Authenticated users view open contracts"
ON public.job_contracts FOR SELECT TO authenticated
USING (true);

-- ====================================================================
-- 3. ENSURE job_contract_claims TABLE AND POLICIES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.job_contract_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.job_contracts(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_contract_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view claims" ON public.job_contract_claims;
CREATE POLICY "Authenticated users view claims"
ON public.job_contract_claims FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Talents claim contracts" ON public.job_contract_claims;
CREATE POLICY "Talents claim contracts"
ON public.job_contract_claims FOR INSERT TO authenticated
WITH CHECK (auth.uid() = designer_id);

DROP POLICY IF EXISTS "Talents and Admins update claims" ON public.job_contract_claims;
CREATE POLICY "Talents and Admins update claims"
ON public.job_contract_claims FOR UPDATE TO authenticated
USING (
  auth.uid() = designer_id
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
)
WITH CHECK (
  auth.uid() = designer_id
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_job_contract_claims_contract ON public.job_contract_claims(contract_id);
CREATE INDEX IF NOT EXISTS idx_job_contract_claims_designer ON public.job_contract_claims(designer_id);

-- ====================================================================
-- 4. ENSURE job_earnings TABLE FOR 70% PROFIT SPLIT
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.job_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL,
  project_id uuid,
  submission_id uuid,
  job_price numeric NOT NULL DEFAULT 0,
  share_percent numeric NOT NULL DEFAULT 70,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_earnings TO authenticated;
GRANT ALL ON public.job_earnings TO service_role;
ALTER TABLE public.job_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designers view their own earnings" ON public.job_earnings;
CREATE POLICY "Designers view their own earnings"
ON public.job_earnings FOR SELECT TO authenticated
USING (
  designer_id = auth.uid()
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);

DROP POLICY IF EXISTS "Admins manage all earnings" ON public.job_earnings;
CREATE POLICY "Admins manage all earnings"
ON public.job_earnings FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'masteradmin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_job_earnings_designer ON public.job_earnings(designer_id);
CREATE INDEX IF NOT EXISTS idx_job_earnings_submission ON public.job_earnings(submission_id);
CREATE INDEX IF NOT EXISTS idx_job_earnings_project ON public.job_earnings(project_id);

-- Reset leftover estimated salaries in designer_details so no talent sees phantom salary
UPDATE public.designer_details
   SET salary_estimated = COALESCE((
     SELECT SUM(je.amount)
       FROM public.job_earnings je
      WHERE je.designer_id = designer_details.user_id
        AND je.status = 'available'
   ), 0);

-- ====================================================================
-- 5. UPDATED admin_client_accept_submission RPC FUNCTION
-- ====================================================================
-- Awards standard 40 points, marks submission approved, closes any linked contract/project,
-- and inserts/updates 70% profit share in job_earnings.
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
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'submission_not_found'; END IF;
  IF v_sub.client_accepted THEN RAISE EXCEPTION 'already_accepted'; END IF;

  v_points := GREATEST(COALESCE(p_points, 40), 0);

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

  -- 3. Check for linked job contract
  IF v_sub.client_project_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.job_contracts WHERE id = v_sub.client_project_id;
    IF v_contract.id IS NOT NULL THEN
      -- Clean budget string to numeric (e.g. 'GH₵500' -> 500)
      v_clean_budget := regexp_replace(COALESCE(v_contract.budget, '0'), '[^0-9.]', '', 'g');
      IF v_clean_budget ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_parsed_price := v_clean_budget::numeric;
      END IF;

      -- Mark contract completed
      UPDATE public.job_contracts
         SET status = 'completed'
       WHERE id = v_contract.id;

      -- Mark claim completed
      UPDATE public.job_contract_claims
         SET status = 'completed',
             updated_at = now()
       WHERE contract_id = v_contract.id
         AND designer_id = v_sub.designer_id;
    ELSE
      -- Check if it is a client_project
      SELECT * INTO v_project FROM public.client_projects WHERE id = v_sub.client_project_id;
      IF v_project.id IS NOT NULL THEN
        v_parsed_price := COALESCE(v_project.price_ghs, 0);
        UPDATE public.client_projects
           SET status = 'completed'
         WHERE id = v_project.id;
      END IF;
    END IF;
  END IF;

  -- 4. Calculate 70% share and insert/update job_earnings if price > 0
  IF v_parsed_price > 0 THEN
    v_talent_earned := round(v_parsed_price * 0.70, 2);

    INSERT INTO public.job_earnings (
      designer_id,
      project_id,
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
      v_sub.id,
      v_parsed_price,
      70,
      v_talent_earned,
      'GHS',
      'available',
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Update talent estimated salary in designer_details
    UPDATE public.designer_details
       SET salary_estimated = COALESCE(salary_estimated, 0) + v_talent_earned,
           updated_at = now()
     WHERE user_id = v_sub.designer_id;
  END IF;

  -- 5. Log activity
  INSERT INTO public.system_logs (action_type, admin_id, description)
  VALUES (
    'client_acceptance',
    auth.uid(),
    format('[%s] Client accepted: %s (+%s pts, GH₵%s credited to talent)', p_dept_label, v_sub.project_name, v_points, v_talent_earned)
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', v_points,
    'earned', v_talent_earned,
    'price', v_parsed_price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) TO authenticated;
