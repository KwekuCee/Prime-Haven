-- ====================================================================
-- PRIME HAVEN JOB CONTRACT LIFECYCLE SCHEMA & RPC MIGRATION
-- ====================================================================
-- Run this script in your Supabase SQL Editor to support:
-- 1. Job claim lifecycle ('claimed' -> 'in_progress' -> 'submitted')
-- 2. Releasing / Unclaiming jobs
-- 3. Resetting user account state after work submission
-- ====================================================================

-- 1. Ensure check constraints on job_contract_claims allow all lifecycle statuses
ALTER TABLE IF EXISTS public.job_contract_claims 
  DROP CONSTRAINT IF EXISTS job_contract_claims_status_check;

ALTER TABLE IF EXISTS public.job_contract_claims 
  ADD CONSTRAINT job_contract_claims_status_check 
  CHECK (status IN ('claimed', 'active', 'in_progress', 'submitted', 'completed', 'cancelled'));

-- Ensure project_assignments check constraint supports 'claimed', 'in_progress', 'submitted', 'completed', 'cancelled'
ALTER TABLE IF EXISTS public.project_assignments 
  DROP CONSTRAINT IF EXISTS project_assignments_status_check;

ALTER TABLE IF EXISTS public.project_assignments 
  ADD CONSTRAINT project_assignments_status_check 
  CHECK (status IN ('claimed', 'active', 'in_progress', 'submitted', 'completed', 'cancelled'));

-- 2. RPC: claim_job_contract
DROP FUNCTION IF EXISTS public.claim_job_contract(UUID);
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contract RECORD;
  v_active_claims_count INT;
  v_claim_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Check if user already has an active or in_progress job contract
  SELECT COUNT(*) INTO v_active_claims_count
  FROM public.job_contract_claims
  WHERE designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');

  IF v_active_claims_count > 0 THEN
    RAISE EXCEPTION 'Active contract limit reached. Please finish, submit, or release your current active job before claiming a new one.';
  END IF;

  -- Fetch contract
  SELECT * INTO v_contract
  FROM public.job_contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job contract not found.';
  END IF;

  IF v_contract.status = 'cancelled' OR v_contract.status = 'completed' THEN
    RAISE EXCEPTION 'Job contract is no longer open for claims.';
  END IF;

  -- Insert claim
  INSERT INTO public.job_contract_claims (contract_id, designer_id, status, claimed_at)
  VALUES (p_contract_id, v_user_id, 'claimed', NOW())
  RETURNING id INTO v_claim_id;

  -- Update contract active designers list & count
  UPDATE public.job_contracts
  SET 
    active_designer_ids = ARRAY_APPEND(COALESCE(active_designer_ids, '{}'), v_user_id),
    active_designers_count = COALESCE(active_designers_count, 0) + 1,
    status = CASE WHEN status = 'active' THEN 'in_progress' ELSE status END
  WHERE id = p_contract_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'message', 'Contract successfully claimed. Please start work when ready.'
  );
END;
$$;

-- 3. RPC: start_job_contract_work
DROP FUNCTION IF EXISTS public.start_job_contract_work(UUID);
CREATE OR REPLACE FUNCTION public.start_job_contract_work(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Update claim status to in_progress for job_contract_claims
  UPDATE public.job_contract_claims
  SET status = 'in_progress'
  WHERE contract_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active');

  -- Update project_assignments if applicable
  UPDATE public.project_assignments
  SET status = 'in_progress'
  WHERE project_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active');

  RETURN jsonb_build_object('success', true, 'message', 'Work started successfully.');
END;
$$;

-- 4. RPC: release_job_contract (Release / Unclaim Job)
DROP FUNCTION IF EXISTS public.release_job_contract(UUID);
CREATE OR REPLACE FUNCTION public.release_job_contract(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contract RECORD;
  v_new_ids UUID[];
  v_new_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Update claim status to cancelled
  UPDATE public.job_contract_claims
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');

  -- Update project assignments
  DELETE FROM public.project_assignments
  WHERE project_id = p_contract_id
    AND designer_id = v_user_id;

  -- Update contract active_designer_ids and active_designers_count
  SELECT active_designer_ids, active_designers_count INTO v_contract
  FROM public.job_contracts
  WHERE id = p_contract_id;

  IF FOUND THEN
    SELECT ARRAY_AGG(elem) INTO v_new_ids
    FROM UNNEST(COALESCE(v_contract.active_designer_ids, '{}')) AS elem
    WHERE elem <> v_user_id;

    IF v_new_ids IS NULL THEN
      v_new_ids := '{}';
    END IF;

    v_new_count := GREATEST(0, COALESCE(v_contract.active_designers_count, 1) - 1);

    UPDATE public.job_contracts
    SET 
      active_designer_ids = v_new_ids,
      active_designers_count = v_new_count,
      status = CASE WHEN v_new_count = 0 THEN 'active' ELSE status END
    WHERE id = p_contract_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Job contract successfully released back to the pool.');
END;
$$;

-- 5. RPC: submit_job_contract_work (resets user account claim lock upon submission)
DROP FUNCTION IF EXISTS public.submit_job_contract_work(UUID);
CREATE OR REPLACE FUNCTION public.submit_job_contract_work(p_contract_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contract RECORD;
  v_new_ids UUID[];
  v_new_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Mark claim as submitted
  UPDATE public.job_contract_claims
  SET status = 'submitted'
  WHERE contract_id = p_contract_id
    AND designer_id = v_user_id
    AND status IN ('claimed', 'active', 'in_progress');

  -- Mark project assignment as submitted
  UPDATE public.project_assignments
  SET status = 'submitted'
  WHERE project_id = p_contract_id
    AND designer_id = v_user_id;

  -- Update contract active list
  SELECT active_designer_ids, active_designers_count INTO v_contract
  FROM public.job_contracts
  WHERE id = p_contract_id;

  IF FOUND THEN
    SELECT ARRAY_AGG(elem) INTO v_new_ids
    FROM UNNEST(COALESCE(v_contract.active_designer_ids, '{}')) AS elem
    WHERE elem <> v_user_id;

    IF v_new_ids IS NULL THEN
      v_new_ids := '{}';
    END IF;

    v_new_count := GREATEST(0, COALESCE(v_contract.active_designers_count, 1) - 1);

    UPDATE public.job_contracts
    SET 
      active_designer_ids = v_new_ids,
      active_designers_count = v_new_count
    WHERE id = p_contract_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Work submitted successfully. User account reset for new claims.');
END;
$$;
