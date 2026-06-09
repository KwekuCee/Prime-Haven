
-- 1. Allow authenticated clients to insert their own client_projects
DROP POLICY IF EXISTS "Authenticated clients can post jobs" ON public.client_projects;
CREATE POLICY "Authenticated clients can post jobs"
ON public.client_projects FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- 2. Authenticated clients/designers can view their own/assigned client_projects
DROP POLICY IF EXISTS "Owners and assignees can view client_projects" ON public.client_projects;
CREATE POLICY "Owners and assignees can view client_projects"
ON public.client_projects FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR accepted_designer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = client_projects.id AND pa.designer_id = auth.uid()
  )
);

-- 3. Project-owner client can read/post project chat
DROP POLICY IF EXISTS "Client owner can view project chat" ON public.project_chat_messages;
CREATE POLICY "Client owner can view project chat"
ON public.project_chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Client owner can post project chat" ON public.project_chat_messages;
CREATE POLICY "Client owner can post project chat"
ON public.project_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'client'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.created_by = auth.uid()
  )
);

-- 4. Allow designers to insert their own job_contract_claims (used via RPC)
DROP POLICY IF EXISTS "Designers can self-claim contracts" ON public.job_contract_claims;
CREATE POLICY "Designers can self-claim contracts"
ON public.job_contract_claims FOR INSERT
TO authenticated
WITH CHECK (designer_id = auth.uid());

-- 5. Strengthen claim_project with active-work lock
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max_assignees INTEGER;
  v_current_claims INTEGER;
  v_designer_professions TEXT[];
  v_required_professions TEXT[];
  v_active_count INTEGER;
BEGIN
  -- Block if designer already has an unfinished client project
  SELECT COUNT(*) INTO v_active_count
  FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid()
    AND pa.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You have an active project awaiting Prime Haven approval. Submit it and wait for ph-approval before claiming another.';
  END IF;

  -- Block if designer has an active job contract claim
  SELECT COUNT(*) INTO v_active_count
  FROM public.job_contract_claims jcc
  WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You have an active job contract. Complete it before claiming another job.';
  END IF;

  SELECT max_assignees, required_professions INTO v_max_assignees, v_required_professions
  FROM public.client_projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;

  SELECT professions INTO v_designer_professions
  FROM public.designer_details WHERE user_id = auth.uid();

  IF array_length(v_required_professions, 1) > 0 THEN
    IF NOT (v_designer_professions && v_required_professions) THEN
      RAISE EXCEPTION 'Your profession does not match the requirements for this job';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_current_claims
  FROM public.project_assignments
  WHERE project_id = p_project_id AND status = 'active';

  IF v_current_claims >= COALESCE(v_max_assignees, 1) THEN
    RAISE EXCEPTION 'This job has already been claimed by the maximum number of designers';
  END IF;

  INSERT INTO public.project_assignments (project_id, designer_id, status)
  VALUES (p_project_id, auth.uid(), 'active');

  IF v_current_claims + 1 >= COALESCE(v_max_assignees, 1) THEN
    UPDATE public.client_projects SET status = 'in_progress' WHERE id = p_project_id;
  END IF;
END;
$$;

-- 6. New RPC: claim_job_contract enforces category cap + active lock
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_category text;
  v_cap int;
  v_current int;
  v_active int;
BEGIN
  SELECT COUNT(*) INTO v_active FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid() AND pa.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );
  IF v_active > 0 THEN
    RAISE EXCEPTION 'Finish your current project and wait for Prime Haven approval before claiming another.';
  END IF;

  SELECT COUNT(*) INTO v_active FROM public.job_contract_claims jcc
  WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';
  IF v_active > 0 THEN
    RAISE EXCEPTION 'You already have an active job contract. Complete it before claiming another.';
  END IF;

  SELECT category INTO v_category FROM public.job_contracts WHERE id = p_contract_id;
  IF v_category IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;

  v_cap := CASE
    WHEN v_category IN (
      'graphic-design','Graphic Design',
      'logo-design','brand-identity','print-design','flyer-design','social-media'
    ) THEN 2
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_current FROM public.job_contract_claims
  WHERE contract_id = p_contract_id AND status = 'active';

  IF v_current >= v_cap THEN
    RAISE EXCEPTION 'This contract has reached the maximum number of designers.';
  END IF;

  INSERT INTO public.job_contract_claims (contract_id, designer_id, status)
  VALUES (p_contract_id, auth.uid(), 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_job_contract(uuid) TO authenticated;

-- 7. Auto-release designer when Prime Haven approves their submission
CREATE OR REPLACE FUNCTION public.release_designer_on_ph_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ph_approved = true AND (OLD.ph_approved IS DISTINCT FROM true) THEN
    IF NEW.client_project_id IS NOT NULL THEN
      UPDATE public.project_assignments
      SET status = 'completed'
      WHERE project_id = NEW.client_project_id
        AND designer_id = NEW.designer_id
        AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_designer_on_ph_approval ON public.submissions;
CREATE TRIGGER trg_release_designer_on_ph_approval
AFTER UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.release_designer_on_ph_approval();
