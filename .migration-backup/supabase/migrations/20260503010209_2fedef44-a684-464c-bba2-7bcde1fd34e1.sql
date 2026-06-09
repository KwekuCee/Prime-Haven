
-- ============ profiles: drop broad authenticated SELECT ============
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;

-- ============ designer_details: drop broad authenticated SELECT ============
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboard" ON public.designer_details;

-- ============ Recreate leaderboard views as SECURITY DEFINER (bypass RLS, expose only safe columns) ============
DROP VIEW IF EXISTS public.leaderboard_profiles CASCADE;
CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = off)
AS SELECT id, full_name, username FROM public.profiles;

DROP VIEW IF EXISTS public.leaderboard_designer_details CASCADE;
CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = off)
AS SELECT user_id, professional_title, skills, total_points, monthly_points,
          talent_score, profile_photo_url, experience_level, professions
   FROM public.designer_details;

GRANT SELECT ON public.leaderboard_profiles TO authenticated, anon;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated, anon;

-- ============ project_tips: restrict reads to admins only ============
DROP POLICY IF EXISTS "Anyone can view tip by id" ON public.project_tips;
CREATE POLICY "Admins view all tips" ON public.project_tips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ client_orders: drop broad designer view of unassigned orders ============
DROP POLICY IF EXISTS "Designers can view unassigned paid orders" ON public.client_orders;
DROP POLICY IF EXISTS "Designers can claim orders" ON public.client_orders;

-- ============ project_messages: drop overly broad SELECT/INSERT ============
DROP POLICY IF EXISTS "Users view project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users send project messages" ON public.project_messages;

-- ============ client_projects: restrict designer view to those with designer role ============
DROP POLICY IF EXISTS "Designers can view pending projects" ON public.client_projects;
CREATE POLICY "Designers can view pending client projects"
ON public.client_projects FOR SELECT TO authenticated
USING (
  status = 'pending'
  AND public.has_role(auth.uid(), 'designer')
);

-- ============ user_badges: enable RLS ============
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges earned"
  ON public.user_badges FOR SELECT
  USING (true);
CREATE POLICY "Admins manage user badges"
  ON public.user_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ badges: enable RLS ============
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);
CREATE POLICY "Admins manage badge defs"
  ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ system_logs: drop permissive insert policies, restrict to admins ============
DROP POLICY IF EXISTS "Authenticated users can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Clients can insert system logs" ON public.system_logs;
CREATE POLICY "Only admins can insert system logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ Function hardening: search_path + revoke anon execute ============
ALTER FUNCTION public.claim_project(uuid) SET search_path = public;
ALTER FUNCTION public.allocate_client_acceptance_points(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_affiliate_commission(text, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM anon;
