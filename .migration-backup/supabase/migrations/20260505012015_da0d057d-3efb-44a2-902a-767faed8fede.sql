
-- 1. job_contracts: require designer role
DROP POLICY IF EXISTS "Designers can view active job contracts" ON public.job_contracts;
CREATE POLICY "Designers can view active job contracts"
ON public.job_contracts FOR SELECT
TO authenticated
USING (
  (status = 'active' OR status = 'in_progress')
  AND public.has_role(auth.uid(), 'designer'::app_role)
);

-- 2. client_projects: drop designer SELECT, add marketplace view (non-PII only)
DROP POLICY IF EXISTS "Designers can view pending client projects" ON public.client_projects;

CREATE OR REPLACE VIEW public.marketplace_projects
WITH (security_invoker = false) AS
SELECT
  id,
  title,
  category,
  description,
  budget,
  deadline,
  required_professions,
  max_assignees,
  status,
  created_at
FROM public.client_projects
WHERE status = 'pending';

REVOKE ALL ON public.marketplace_projects FROM PUBLIC, anon;
GRANT SELECT ON public.marketplace_projects TO authenticated;

-- 3. user_badges: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view badges earned" ON public.user_badges;
CREATE POLICY "Authenticated can view badges earned"
ON public.user_badges FOR SELECT
TO authenticated
USING (true);

-- 4. user_roles: restrict DELETE to masteradmin only (was: superadmin OR masteradmin)
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Only masteradmin can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'::app_role));

-- 5. SECURITY DEFINER hardening — revoke from end-user roles where not needed
REVOKE EXECUTE ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_accepted_designer() FROM PUBLIC, anon, authenticated;
-- claim_project: only authenticated designers need it
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;
-- has_role / get_user_role are required inside RLS expressions; keep public execute
