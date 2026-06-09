
-- Drop overly-broad SELECT policies that expose PII / financial data
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboa" ON public.designer_details;

-- Ensure leaderboard views remain accessible (they're SECURITY DEFINER and expose only safe columns)
GRANT SELECT ON public.leaderboard_profiles TO authenticated, anon;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated, anon;

-- Restrict project_assignments SELECT
DROP POLICY IF EXISTS "Authenticated users can view all project assignments" ON public.project_assignments;

CREATE POLICY "Designers can view their own assignments"
ON public.project_assignments FOR SELECT
TO authenticated
USING (designer_id = auth.uid() OR has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
