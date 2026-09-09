-- ============================================================
-- Migration: ensure_client_role_and_cleanup
-- Purpose:
--   1. Patch handle_new_user() so accounts created with
--      account_type='client' or role='client' in user metadata
--      receive the 'client' role in user_roles and do NOT get
--      a designer_details row.
--   2. Data-cleanup: fix any existing test / client accounts
--      that ended up with a 'designer' role by checking whether
--      their email appears in client_orders or clients, then
--      granting them 'client' and stripping designer artefacts.
-- ============================================================

-- ─── 1. Patch the new-user trigger ───────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type text;
  _role         text;
BEGIN
  -- Prefer explicit account_type, fall back to role field
  _account_type := COALESCE(
    NEW.raw_user_meta_data ->> 'account_type',
    NEW.raw_user_meta_data ->> 'role',
    ''
  );
  _role := LOWER(TRIM(_account_type));

  IF _role = 'client' THEN
    -- ── Client account: grant client role only ──────────────
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure no stale designer role
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'designer';

    -- Ensure no stale designer_details row
    DELETE FROM public.designer_details
    WHERE user_id = NEW.id;

  ELSE
    -- ── Talent / unknown account: grant designer role ───────
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create an empty designer_details row for the profile
    INSERT INTO public.designer_details (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Always create a row in the public profiles table
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ─── 2. Data-cleanup: fix miscategorised accounts ────────────
-- For every auth user whose email appears in client_orders or
-- clients but who currently has 'designer' in user_roles:
--   a. Grant the 'client' role
--   b. Remove the 'designer' role
--   c. Remove any designer_details row

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT u.id AS user_id, u.email
    FROM auth.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'designer'
    WHERE
      EXISTS (
        SELECT 1 FROM public.client_orders co
        WHERE LOWER(co.client_email) = LOWER(u.email)
      )
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE LOWER(c.email) = LOWER(u.email)
      )
  LOOP
    -- Grant client role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (rec.user_id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove designer role
    DELETE FROM public.user_roles
    WHERE user_id = rec.user_id AND role = 'designer';

    -- Remove designer_details
    DELETE FROM public.designer_details
    WHERE user_id = rec.user_id;

    RAISE NOTICE 'Fixed miscategorised client account: % (%)', rec.email, rec.user_id;
  END LOOP;
END;
$$;
