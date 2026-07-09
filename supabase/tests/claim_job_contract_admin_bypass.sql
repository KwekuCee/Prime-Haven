-- Regression test: superadmin/masteradmin bypass of active-contract limit
-- Run: psql -f supabase/tests/claim_job_contract_admin_bypass.sql
-- Wrapped in a rolled-back transaction so it leaves the DB untouched.
-- Reuses real users already present in auth.users (test env cannot INSERT into auth).

BEGIN;

DO $$
DECLARE
  v_designer uuid;
  v_admin    uuid;
  v_master   uuid;
  v_c1       uuid := gen_random_uuid();
  v_c2       uuid := gen_random_uuid();
  v_c3       uuid := gen_random_uuid();
  v_before   int;
  v_after    int;
  v_logs     int;
  v_err      text;
  v_pre_designer_active int;
  v_pre_admin_active    int;
  v_pre_master_active   int;
BEGIN
  -- Pick real users for each role, borrowing extra designers when a role slot is missing.
  SELECT user_id INTO v_designer FROM public.user_roles WHERE role = 'designer'    LIMIT 1;
  SELECT user_id INTO v_master   FROM public.user_roles WHERE role = 'masteradmin' LIMIT 1;
  SELECT user_id INTO v_admin    FROM public.user_roles WHERE role = 'superadmin'  LIMIT 1;
  IF v_admin IS NULL THEN
    -- Borrow another designer and grant superadmin (rolled back at end of test)
    SELECT user_id INTO v_admin FROM public.user_roles
     WHERE role = 'designer' AND user_id <> v_designer LIMIT 1;
    IF v_admin IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_admin, 'superadmin');
    END IF;
  END IF;
  IF v_designer IS NULL OR v_admin IS NULL OR v_master IS NULL THEN
    RAISE NOTICE 'SKIP: need a designer, superadmin, and masteradmin present in user_roles';
    RETURN;
  END IF;

  -- Capture pre-existing active claim counts so assertions are relative
  SELECT count(*) INTO v_pre_designer_active FROM public.job_contract_claims
   WHERE designer_id = v_designer AND status = 'active';
  SELECT count(*) INTO v_pre_admin_active FROM public.job_contract_claims
   WHERE designer_id = v_admin AND status = 'active';
  SELECT count(*) INTO v_pre_master_active FROM public.job_contract_claims
   WHERE designer_id = v_master AND status = 'active';

  -- Seed contracts (graphic-design cap = 2)
  INSERT INTO public.job_contracts (id, title, category, description, budget, status)
  VALUES
    (v_c1, 'RT1', 'graphic-design', 'x', '100', 'active'),
    (v_c2, 'RT2', 'graphic-design', 'x', '100', 'active'),
    (v_c3, 'RT3', 'graphic-design', 'x', '100', 'active');

  -- Force an active claim on each subject so the limit would trigger
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
    IF v_err NOT ILIKE '%active job contract%' AND v_err NOT ILIKE '%Finish your current project%' THEN
      RAISE EXCEPTION 'FAIL: expected active-contract error, got: %', v_err;
    END IF;
  END;

  ------------------------------------------------------------------
  -- 2) Superadmin MUST bypass, get the claim, and be audited
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

  SELECT count(*) INTO v_logs FROM public.system_logs
   WHERE admin_id = v_admin
     AND action_type = 'job_contract_claim_bypass'
     AND (new_value->>'contract_id')::uuid = v_c2;
  IF v_logs < 1 THEN
    RAISE EXCEPTION 'FAIL: no audit log entry for superadmin bypass';
  END IF;

  ------------------------------------------------------------------
  -- 3) Masteradmin MUST bypass, get the claim, and be audited
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
  -- 4) Contract cap (graphic-design = 2) still enforced for admins.
  -- v_c1 already holds 3 active claims from seeding, well over cap of 2,
  -- so any further claim (even admin) must fail with the cap error.
  ------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  -- Remove admin's existing v_c1 claim so we're testing the cap, not the unique constraint
  DELETE FROM public.job_contract_claims WHERE contract_id = v_c1 AND designer_id = v_admin;
  BEGIN
    PERFORM public.claim_job_contract(v_c1);
    RAISE EXCEPTION 'FAIL_CAP_NOT_ENFORCED: cap should still block admin';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT ILIKE '%maximum number of designers%' THEN
      RAISE EXCEPTION 'FAIL: expected cap error, got: %', v_err;
    END IF;
  END;

  RAISE NOTICE 'PASS: claim_job_contract admin bypass regression test';
END $$;

ROLLBACK;
