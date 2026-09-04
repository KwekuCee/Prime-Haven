ALTER TABLE public.job_contracts
  ADD COLUMN IF NOT EXISTS client_project_id uuid REFERENCES public.client_projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS job_contracts_client_project_id_idx ON public.job_contracts(client_project_id);

-- Claiming a mirrored job contract also claims the underlying client project
CREATE OR REPLACE FUNCTION public.sync_contract_claim_to_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT client_project_id INTO v_project_id FROM public.job_contracts WHERE id = NEW.contract_id;
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('claimed','active','in_progress') THEN
    UPDATE public.client_projects
    SET claimed_by = COALESCE(claimed_by, NEW.designer_id),
        claimed_at = COALESCE(claimed_at, now()),
        status = CASE WHEN status IN ('pending','active') THEN 'in_progress' ELSE status END,
        updated_at = now()
    WHERE id = v_project_id;

    INSERT INTO public.project_assignments (project_id, designer_id, status)
    SELECT v_project_id, NEW.designer_id, 'claimed'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.project_assignments
      WHERE project_id = v_project_id AND designer_id = NEW.designer_id
        AND status IN ('claimed','in_progress','active','submitted')
    );
  ELSIF NEW.status IN ('released','cancelled') THEN
    UPDATE public.client_projects
    SET claimed_by = NULL, claimed_at = NULL,
        status = CASE WHEN status = 'in_progress' THEN 'pending' ELSE status END,
        updated_at = now()
    WHERE id = v_project_id AND claimed_by = NEW.designer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contract_claim_to_project ON public.job_contract_claims;
CREATE TRIGGER trg_sync_contract_claim_to_project
AFTER INSERT OR UPDATE OF status ON public.job_contract_claims
FOR EACH ROW EXECUTE FUNCTION public.sync_contract_claim_to_project();

-- Project state changes mirror onto the linked job contract
CREATE OR REPLACE FUNCTION public.sync_project_state_to_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by THEN
    UPDATE public.job_contracts
    SET status = CASE
          WHEN NEW.status = 'completed' THEN 'completed'
          WHEN NEW.status = 'cancelled' THEN 'cancelled'
          WHEN NEW.claimed_by IS NOT NULL THEN 'in_progress'
          ELSE 'active'
        END,
        updated_at = now()
    WHERE client_project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_state_to_contract ON public.client_projects;
CREATE TRIGGER trg_sync_project_state_to_contract
AFTER UPDATE ON public.client_projects
FOR EACH ROW EXECUTE FUNCTION public.sync_project_state_to_contract();

-- Client correction requests now flag the project itself
CREATE OR REPLACE FUNCTION public.request_project_revision(p_submission_id uuid, p_feedback text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT s.*, cp.client_email, cp.created_by, cp.id AS project_id
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

  UPDATE public.client_projects
  SET status = 'correction', updated_at = now()
  WHERE id = v_sub.project_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_sub.designer_id, 'Correction requested',
          'The client asked for changes: ' || COALESCE(NULLIF(btrim(COALESCE(p_feedback, '')), ''), 'see project chat'),
          'warning', '/submit-work');

  RETURN jsonb_build_object('success', true, 'message', 'Revision requested.');
END;
$function$;