CREATE POLICY "Clients can view deliverables for their projects"
ON public.submissions
FOR SELECT
TO authenticated
USING (
  client_project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = submissions.client_project_id
      AND (cp.client_email = (auth.jwt() ->> 'email') OR cp.created_by = auth.uid())
  )
);

CREATE POLICY "Clients can review deliverables for their projects"
ON public.submissions
FOR UPDATE
TO authenticated
USING (
  client_project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = submissions.client_project_id
      AND (cp.client_email = (auth.jwt() ->> 'email') OR cp.created_by = auth.uid())
  )
)
WITH CHECK (
  client_project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = submissions.client_project_id
      AND (cp.client_email = (auth.jwt() ->> 'email') OR cp.created_by = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.request_project_revision(p_submission_id uuid, p_feedback text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub RECORD;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT s.*, cp.client_email, cp.created_by
  INTO v_sub
  FROM public.submissions s
  JOIN public.client_projects cp ON cp.id = s.client_project_id
  WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deliverable not found for a project you own.';
  END IF;

  v_allowed := v_sub.client_email = (auth.jwt() ->> 'email')
            OR v_sub.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'superadmin'::app_role)
            OR public.has_role(auth.uid(), 'masteradmin'::app_role);

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'You cannot review this deliverable.';
  END IF;

  UPDATE public.submissions
  SET status = 'revision',
      revisions_count = COALESCE(revisions_count, 0) + 1,
      rejection_reason = NULLIF(btrim(COALESCE(p_feedback, '')), ''),
      updated_at = now()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object('success', true, 'message', 'Revision requested.');
END;
$$;

REVOKE ALL ON FUNCTION public.request_project_revision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_project_revision(uuid, text) TO authenticated;