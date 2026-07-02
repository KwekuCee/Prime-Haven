
-- 1. Reference image columns
ALTER TABLE public.client_orders ADD COLUMN IF NOT EXISTS reference_images text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.client_projects ADD COLUMN IF NOT EXISTS reference_images text[] NOT NULL DEFAULT '{}';

-- 2. Storage policies for client-order-attachments (private bucket, but readable so signed/public URLs work in-app)
DROP POLICY IF EXISTS "client_order_attachments_read" ON storage.objects;
CREATE POLICY "client_order_attachments_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-order-attachments');

DROP POLICY IF EXISTS "client_order_attachments_insert" ON storage.objects;
CREATE POLICY "client_order_attachments_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-order-attachments');

-- 3. Marketplace claim → start → submit rework
-- Backfill existing 'active' assignments to 'in_progress' (they are already being worked on).
UPDATE public.project_assignments SET status = 'in_progress' WHERE status = 'active';
ALTER TABLE public.project_assignments ALTER COLUMN status SET DEFAULT 'claimed';

-- Redefine claim_project: inserts 'claimed', blocks new claim while any 'claimed' or 'in_progress' assignment exists.
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_assignees INTEGER;
  v_current_claims INTEGER;
  v_designer_professions TEXT[];
  v_required_professions TEXT[];
  v_active_count INTEGER;
BEGIN
  -- Block if designer already has an active client-project claim (claimed OR in_progress and not yet approved by PH)
  SELECT COUNT(*) INTO v_active_count
  FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid()
    AND pa.status IN ('claimed','in_progress','active')
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You already have an active project. Submit it and wait for Prime Haven approval before claiming another.';
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
  WHERE project_id = p_project_id AND status IN ('claimed','in_progress','active');

  IF v_current_claims >= COALESCE(v_max_assignees, 1) THEN
    RAISE EXCEPTION 'This job has already been claimed by the maximum number of designers';
  END IF;

  INSERT INTO public.project_assignments (project_id, designer_id, status)
  VALUES (p_project_id, auth.uid(), 'claimed');

  IF v_current_claims + 1 >= COALESCE(v_max_assignees, 1) THEN
    UPDATE public.client_projects SET status = 'in_progress' WHERE id = p_project_id;
  END IF;
END;
$function$;

-- New RPC: start_project_work — flips designer's claim from 'claimed' to 'in_progress'.
CREATE OR REPLACE FUNCTION public.start_project_work(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.project_assignments
     SET status = 'in_progress'
   WHERE project_id = p_project_id
     AND designer_id = auth.uid()
     AND status = 'claimed';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No claimed assignment found for this project';
  END IF;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.start_project_work(uuid) TO authenticated;

-- Trigger: when a submission is inserted for a client_project, flip the matching assignment to 'submitted'.
CREATE OR REPLACE FUNCTION public.mark_assignment_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.client_project_id IS NOT NULL AND NEW.designer_id IS NOT NULL THEN
    UPDATE public.project_assignments
       SET status = 'submitted'
     WHERE project_id = NEW.client_project_id
       AND designer_id = NEW.designer_id
       AND status IN ('claimed','in_progress');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_mark_assignment_submitted ON public.submissions;
CREATE TRIGGER trg_mark_assignment_submitted
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.mark_assignment_submitted();
