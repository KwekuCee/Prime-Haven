
-- Fix views to use SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard_profiles;
CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = on)
AS SELECT id, full_name, username FROM public.profiles;

DROP VIEW IF EXISTS public.leaderboard_designer_details;
CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = on)
AS SELECT user_id, professional_title, skills, total_points, monthly_points, talent_score, profile_photo_url, experience_level FROM public.designer_details;
