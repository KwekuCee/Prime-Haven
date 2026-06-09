-- Profession-Based Job Distribution System Migration

-- 1. Add professions to designer_details
-- We use a TEXT array to allow designers to have multiple professions (e.g., UI/UX AND Web Dev)
ALTER TABLE public.designer_details 
ADD COLUMN IF NOT EXISTS professions TEXT[] DEFAULT '{}';

-- 2. Add required_professions and job limits to client_projects
ALTER TABLE public.client_projects 
ADD COLUMN IF NOT EXISTS required_professions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_assignees INTEGER DEFAULT 1;

-- 3. Create project_assignments table
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, designer_id) -- A designer can claim a project only once
);

-- 4. Enable RLS on assignments
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for assignments
DROP POLICY IF EXISTS "Designers can view their own assignments" ON public.project_assignments;
CREATE POLICY "Designers can view their own assignments"
ON public.project_assignments FOR SELECT
TO authenticated
USING (auth.uid() = designer_id);

DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.project_assignments;
CREATE POLICY "Admins can manage all assignments"
ON public.project_assignments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 6. Claim Job Function
-- This function handles the logic of claiming a job ensuring limits are respected.
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_assignees INTEGER;
  v_current_claims INTEGER;
  v_designer_professions TEXT[];
  v_required_professions TEXT[];
BEGIN
  -- 1. Get project details
  SELECT max_assignees, required_professions INTO v_max_assignees, v_required_professions
  FROM public.client_projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- 2. Check if designer's profession matches
  SELECT professions INTO v_designer_professions
  FROM public.designer_details
  WHERE user_id = auth.uid();

  IF NOT (v_designer_professions && v_required_professions) THEN
    RAISE EXCEPTION 'Your profession does not match the requirements for this job';
  END IF;

  -- 3. Check current claims
  SELECT COUNT(*) INTO v_current_claims
  FROM public.project_assignments
  WHERE project_id = p_project_id;

  IF v_current_claims >= v_max_assignees THEN
    RAISE EXCEPTION 'This job has already been claimed by the maximum number of designers';
  END IF;

  -- 4. Insert assignment
  INSERT INTO public.project_assignments (project_id, designer_id)
  VALUES (p_project_id, auth.uid());

  -- 5. Update project status if needed (e.g., if fully claimed)
  IF v_current_claims + 1 >= v_max_assignees THEN
    UPDATE public.client_projects
    SET status = 'in_progress'
    WHERE id = p_project_id;
  END IF;
END;
$$;

-- 7. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_project(UUID) TO authenticated;

-- 8. Map existing professional_title to professions array (Initial Sync)
-- This is a one-time sync based on common titles found in the system.
UPDATE public.designer_details
SET professions = 
  CASE 
    WHEN professional_title ILIKE '%graphic%' THEN ARRAY['Graphic Designer']
    WHEN professional_title ILIKE '%ui/ux%' OR professional_title ILIKE '%product designer%' THEN ARRAY['UI/UX Designer']
    WHEN professional_title ILIKE '%web dev%' OR professional_title ILIKE '%frontend%' OR professional_title ILIKE '%backend%' THEN ARRAY['Web Developer']
    ELSE ARRAY[]::TEXT[]
  END
WHERE professions = '{}';
