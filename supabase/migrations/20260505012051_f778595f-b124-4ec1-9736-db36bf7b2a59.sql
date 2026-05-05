
DROP VIEW IF EXISTS public.marketplace_projects;

CREATE OR REPLACE FUNCTION public.get_pending_client_projects()
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  description text,
  budget text,
  deadline timestamptz,
  required_professions text[],
  max_assignees integer,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, category, description, budget, deadline,
         required_professions, max_assignees, status, created_at
  FROM public.client_projects
  WHERE status = 'pending'
    AND (
      public.has_role(auth.uid(), 'designer'::app_role)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::app_role)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_client_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_client_projects() TO authenticated;
