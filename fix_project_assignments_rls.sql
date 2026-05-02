-- fix_project_assignments_rls.sql
-- Allow all authenticated users to see assignments so they can accurately see how many people have claimed a project.

DROP POLICY IF EXISTS "Designers can view their own assignments" ON public.project_assignments;

CREATE POLICY "Authenticated users can view all project assignments"
ON public.project_assignments FOR SELECT
TO authenticated
USING (true);
