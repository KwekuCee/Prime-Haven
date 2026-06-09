
-- 1. Recreate leaderboard views as SECURITY INVOKER (respect caller's RLS)
DROP VIEW IF EXISTS public.leaderboard_profiles;
DROP VIEW IF EXISTS public.leaderboard_designer_details;

CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, username FROM public.profiles;

CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = true) AS
SELECT
  user_id,
  professional_title,
  skills,
  total_points,
  monthly_points,
  talent_score,
  profile_photo_url,
  experience_level,
  professions
FROM public.designer_details;

-- Allow anon + authenticated to read leaderboards (no PII fields here)
GRANT SELECT ON public.leaderboard_profiles TO anon, authenticated;
GRANT SELECT ON public.leaderboard_designer_details TO anon, authenticated;

-- 2. Lock down SECURITY DEFINER functions

-- Trigger functions: should never be called via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_accepted_designer() FROM PUBLIC, anon, authenticated;

-- Internal helpers used by RLS / security_definer chain only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;

-- Admin / service-only functions should NOT be callable from clients
REVOKE ALL ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;

-- claim_project is a designer-initiated action; keep for authenticated, deny anon
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;
