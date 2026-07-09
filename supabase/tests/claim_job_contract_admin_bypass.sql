-- Regression test: superadmin/masteradmin bypass of active-contract limit
-- Run: psql -f supabase/tests/claim_job_contract_admin_bypass.sql
-- Uses a savepoint-wrapped block so it leaves the DB untouched.

BEGIN;

DO $$
DECLARE
  v_designer uuid := gen_random_uuid();
  v_admin    uuid := gen_random_uuid();
  v_master   uuid := gen_random_uuid();
  v_c1       uuid := gen_random_uuid();
  v_c2       uuid := gen_random_uuid();
  v_c3       uuid := gen_random_uuid();
  v_before   int;
  v_after    int;
  v_logs     int;
  v_err      text;
BEGIN
  -- Seed contracts
  INSERT INTO public.job_contracts (id, title, category, description, budget, status)
  VALUES
    (v_c1, 'T1', 'graphic-design', 'x', '100', 'active'),
    (v_c2, 'T2', 'graphic-design', 'x', '100', 'active'),
    (v_c3, 'T3', 'graphic-design', 'x', '100', 'active');

  -- Seed roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_designer, 'designer'),
    (v_admin,    'superadmin'),
    (v_master,   'masteradmin');

  -- Give the designer (and admins) an existing active claim so the limit would trigger
  INSERT INTO public.job_contract_claims (contract_id, designer_id, status) VALUES
    (v_c1, v_designer, 'active'),
    (v_c1, v_admin,    'active'),
    (v_c1, v_master,   'active');

  ------------------------------------------------------------------
  -- 1) Regular designer with an active claim MUST be blocked
  ------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_designer, 'role', 'authenticated')::text, true);
  BEGIN
    PERFORM public.claim_job_contract(v_c2);
    RAISE EXCEPTION 'FAIL: designer with active claim was not blocked';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT ILIKE '%active job contract%' THEN
      RAISE EXCEPTION 'FAIL: expected active-contract error, got: %', v_err;
    END IF;
  END;

  ------------------------------------------------------------------
  -- 2) Superadmin MUST bypass and get the claim
  ------------------------------------------------------------------
  SELECT count(*) INTO v_before FROM public.job_contract_claims
   WHERE designer_id = v_admin AND status = 'active';

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  PERFORM public.claim_job_contract(v_c2);

  SELECT count(*) INTO v_after FROM public.job_contract_claims
   WHERE designer_id = v_admin AND status = 'active';
  IF v_after <> v_before + 1 THEN
    RAISE EXCEPTION 'FAIL: superadmin bypass did not create claim (before=%, after=%)', v_before, v_after;
  END IF;

  -- Audit row exists
  SELECT count(*) INTO v_logs FROM public.system_logs
   WHERE admin_id = v_admin
     AND action_type = 'job_contract_claim_bypass'
     AND (new_value->>'contract_id')::uuid = v_c2;
  IF v_logs < 1 THEN
    RAISE EXCEPTION 'FAIL: no audit log entry for superadmin bypass';
  END IF;

  ------------------------------------------------------------------
  -- 3) Masteradmin MUST bypass and get the claim + audit
  ------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_master, 'role', 'authenticated')::text, true);
  PERFORM public.claim_job_contract(v_c3);

  SELECT count(*) INTO v_logs FROM public.system_logs
   WHERE admin_id = v_master
     AND action_type = 'job_contract_claim_bypass'
     AND (new_value->>'contract_id')::uuid = v_c3;
  IF v_logs < 1 THEN
    RAISE EXCEPTION 'FAIL: no audit log entry for masteradmin bypass';
  END IF;

  ------------------------------------------------------------------
  -- 4) Contract cap (graphic-design = 2) is still enforced for admins
  ------------------------------------------------------------------
  BEGIN
    PERFORM public.claim_job_contract(v_c2); -- v_c2 now has admin + master = 2, cap reached
    RAISE EXCEPTION 'FAIL: cap should still block admin';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT ILIKE '%maximum number of designers%' THEN
      RAISE EXCEPTION 'FAIL: expected cap error, got: %', v_err;
    END IF;
  END;

  RAISE NOTICE 'PASS: claim_job_contract admin bypass regression test';
END $$;

ROLLBACK;
