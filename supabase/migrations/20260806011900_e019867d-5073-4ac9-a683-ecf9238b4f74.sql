-- 1) client_orders: block mass assignment of workflow fields on self-service inserts
DROP POLICY IF EXISTS "Public can create orders" ON public.client_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.client_orders;

CREATE POLICY "Public can create orders"
ON public.client_orders FOR INSERT TO anon
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(price, 0) >= 0 AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (
    COALESCE(payment_status, 'pending') = 'pending'
    OR (payment_status = 'completed' AND COALESCE(price, 0) = 0
        AND payment_reference IS NOT NULL AND payment_reference LIKE 'PH-FREE-%')
  )
  AND assigned_designer_id IS NULL
  AND claimed_at IS NULL
  AND deadline_at IS NULL
  AND COALESCE(project_status, 'unassigned') = 'unassigned'
  AND COALESCE(discord_posted, false) = false
  AND discord_message_id IS NULL
  AND client_rating IS NULL
  AND client_review IS NULL
);

CREATE POLICY "Authenticated users can create orders"
ON public.client_orders FOR INSERT TO authenticated
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(price, 0) >= 0 AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (
    COALESCE(payment_status, 'pending') = 'pending'
    OR (payment_status = 'completed' AND COALESCE(price, 0) = 0
        AND payment_reference IS NOT NULL AND payment_reference LIKE 'PH-FREE-%')
  )
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
    OR (
      assigned_designer_id IS NULL
      AND claimed_at IS NULL
      AND deadline_at IS NULL
      AND COALESCE(project_status, 'unassigned') = 'unassigned'
      AND COALESCE(discord_posted, false) = false
      AND discord_message_id IS NULL
      AND client_rating IS NULL
      AND client_review IS NULL
    )
  )
);

-- 2) client_projects: block mass assignment on anon inserts
DROP POLICY IF EXISTS "Public can create client projects" ON public.client_projects;

CREATE POLICY "Public can create client projects"
ON public.client_projects FOR INSERT TO anon
WITH CHECK (
  created_by IS NULL
  AND client_email IS NOT NULL
  AND client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL AND char_length(client_name) BETWEEN 1 AND 200
  AND title IS NOT NULL AND char_length(title) BETWEEN 1 AND 300
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(status, 'pending') = 'pending'
  AND accepted_designer_id IS NULL
  AND client_id IS NULL
  AND COALESCE(tip_total, 0) = 0
  AND COALESCE(progress_percentage, 0) = 0
  AND COALESCE(max_assignees, 1) BETWEEN 1 AND 5
  AND (required_professions IS NULL OR COALESCE(array_length(required_professions, 1), 0) <= 5)
);

-- 3) promo_codes: consistent admin role check
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;

-- 4) Leaderboard: remove SECURITY DEFINER views, expose safe columns via restricted functions
DROP VIEW IF EXISTS public.leaderboard_profiles CASCADE;
DROP VIEW IF EXISTS public.leaderboard_designer_details CASCADE;

CREATE OR REPLACE FUNCTION public.leaderboard_profiles_fn()
RETURNS TABLE (id uuid, full_name text, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.username FROM public.profiles p
$$;

CREATE OR REPLACE FUNCTION public.leaderboard_designer_details_fn()
RETURNS TABLE (
  user_id uuid, professional_title text, skills text[], total_points integer,
  monthly_points integer, talent_score numeric, profile_photo_url text,
  experience_level text, professions text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.user_id, d.professional_title, d.skills, d.total_points, d.monthly_points,
         d.talent_score, d.profile_photo_url, d.experience_level, d.professions
  FROM public.designer_details d
$$;

REVOKE EXECUTE ON FUNCTION public.leaderboard_profiles_fn() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leaderboard_designer_details_fn() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_profiles_fn() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_designer_details_fn() TO authenticated;

CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = on)
AS SELECT * FROM public.leaderboard_profiles_fn();

CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = on)
AS SELECT * FROM public.leaderboard_designer_details_fn();

GRANT SELECT ON public.leaderboard_profiles TO authenticated;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated;