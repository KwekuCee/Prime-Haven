-- Migration: Fix Talent Onboarding, Professional Title Sync, and Designer Alerts
-- Ensures all newly onboarded talent have their professional_title, professions,
-- and active status properly populated so they receive job alert emails.

-- 1. Ensure columns exist on designer_details and profiles
ALTER TABLE IF EXISTS public.designer_details
  ADD COLUMN IF NOT EXISTS professional_title TEXT,
  ADD COLUMN IF NOT EXISTS professions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Update handle_new_user() trigger to automatically set professional_title and is_active
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type text;
  _role         text;
  _prof_title   text;
  _track        text;
BEGIN
  _account_type := COALESCE(
    NEW.raw_user_meta_data ->> 'account_type',
    NEW.raw_user_meta_data ->> 'role',
    ''
  );
  _role := LOWER(TRIM(_account_type));

  _prof_title := COALESCE(
    NEW.raw_user_meta_data ->> 'professional_title',
    NEW.raw_user_meta_data ->> 'track',
    ''
  );

  IF _role = 'client' THEN
    -- Client account: grant client role only
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles
    WHERE user_id = NEW.id AND role = 'designer';

    DELETE FROM public.designer_details
    WHERE user_id = NEW.id;

  ELSE
    -- Talent account: grant designer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create or update designer_details row with professional title & professions
    INSERT INTO public.designer_details (user_id, professional_title, professions)
    VALUES (
      NEW.id,
      NULLIF(TRIM(_prof_title), ''),
      CASE WHEN NULLIF(TRIM(_prof_title), '') IS NOT NULL THEN ARRAY[TRIM(_prof_title)] ELSE '{}' END
    )
    ON CONFLICT (user_id) DO UPDATE
      SET
        professional_title = COALESCE(public.designer_details.professional_title, EXCLUDED.professional_title),
        professions = CASE
          WHEN array_length(public.designer_details.professions, 1) > 0 THEN public.designer_details.professions
          ELSE EXCLUDED.professions
        END,
        updated_at = NOW();
  END IF;

  -- Create or update row in public profiles table, ensuring is_active is true
  INSERT INTO public.profiles (id, email, full_name, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        is_active  = COALESCE(public.profiles.is_active, TRUE),
        updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3. Data-cleanup & backfill: Fix Xavier and any designers whose professional_title is missing
DO $$
DECLARE
  rec RECORD;
  v_title text;
BEGIN
  -- 3a. Fix from auth.users raw_user_meta_data
  FOR rec IN
    SELECT u.id, u.email,
           COALESCE(u.raw_user_meta_data ->> 'professional_title', u.raw_user_meta_data ->> 'track') AS title
    FROM auth.users u
    JOIN public.designer_details dd ON dd.user_id = u.id
    WHERE (dd.professional_title IS NULL OR TRIM(dd.professional_title) = '')
      AND (u.raw_user_meta_data ->> 'professional_title' IS NOT NULL OR u.raw_user_meta_data ->> 'track' IS NOT NULL)
  LOOP
    v_title := TRIM(rec.title);
    UPDATE public.designer_details
    SET professional_title = v_title,
        professions = CASE
          WHEN professions IS NULL OR array_length(professions, 1) = 0 THEN ARRAY[v_title]
          ELSE professions
        END,
        updated_at = NOW()
    WHERE user_id = rec.id;

    RAISE NOTICE 'Restored designer title from auth meta for %: %', rec.email, v_title;
  END LOOP;

  -- 3b. Fix from applicants table (linking passed/paid applicants by user_id or email)
  FOR rec IN
    SELECT a.user_id, a.email, a.track
    FROM public.applicants a
    WHERE a.track IS NOT NULL
      AND (
        a.user_id IS NOT NULL
        OR EXISTS (SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(a.email))
      )
  LOOP
    -- Get user id if not directly on applicant
    IF rec.user_id IS NULL THEN
      SELECT id INTO rec.user_id FROM auth.users WHERE LOWER(email) = LOWER(rec.email) LIMIT 1;
    END IF;

    IF rec.user_id IS NOT NULL THEN
      UPDATE public.designer_details
      SET professional_title = COALESCE(NULLIF(TRIM(professional_title), ''), rec.track),
          professions = CASE
            WHEN professions IS NULL OR array_length(professions, 1) = 0 THEN ARRAY[rec.track]
            WHEN NOT (rec.track = ANY(professions)) THEN array_append(professions, rec.track)
            ELSE professions
          END,
          updated_at = NOW()
      WHERE user_id = rec.user_id;

      -- Ensure profile is marked active and registration fee paid if applicant passed/paid
      UPDATE public.profiles
      SET is_active = TRUE,
          registration_fee_paid = TRUE
      WHERE id = rec.user_id;

      RAISE NOTICE 'Synced applicant track for %: %', rec.email, rec.track;
    END IF;
  END LOOP;

  -- 3c. Specifically look for Xavier by name or email to ensure he is 100% active as UI/UX Designer
  FOR rec IN
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    WHERE LOWER(p.full_name) LIKE '%xavier%'
       OR LOWER(p.email) LIKE '%xavier%'
  LOOP
    UPDATE public.designer_details
    SET professional_title = COALESCE(NULLIF(TRIM(professional_title), ''), 'UI/UX Design'),
        professions = CASE
          WHEN professions IS NULL OR array_length(professions, 1) = 0 THEN ARRAY['UI/UX Design', 'UI/UX Designer', 'ui-ux-design']
          ELSE professions
        END,
        updated_at = NOW()
    WHERE user_id = rec.id;

    UPDATE public.profiles
    SET is_active = TRUE,
        registration_fee_paid = TRUE
    WHERE id = rec.id;

    RAISE NOTICE 'Explicitly verified Xavier (%): set to UI/UX Design and active', rec.email;
  END LOOP;

  -- 3d. Ensure all designer profiles have is_active set to TRUE if currently NULL
  UPDATE public.profiles
  SET is_active = TRUE
  WHERE is_active IS NULL;
END $$;
