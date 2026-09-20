CREATE OR REPLACE FUNCTION public.guard_submissions_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- SECURITY DEFINER RPCs and internal roles run unrestricted
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(auth.uid(), 'superadmin'::app_role)
           OR public.has_role(auth.uid(), 'masteradmin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Designer editing their own pending submission: content fields only
  IF NEW.designer_id = auth.uid() AND OLD.status = 'pending' THEN
    IF NEW.designer_id IS DISTINCT FROM OLD.designer_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
       OR NEW.ph_approved IS DISTINCT FROM OLD.ph_approved
       OR NEW.ph_approved_by IS DISTINCT FROM OLD.ph_approved_by
       OR NEW.ph_approved_at IS DISTINCT FROM OLD.ph_approved_at
       OR NEW.client_accepted IS DISTINCT FROM OLD.client_accepted
       OR NEW.client_accepted_by IS DISTINCT FROM OLD.client_accepted_by
       OR NEW.client_accepted_at IS DISTINCT FROM OLD.client_accepted_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
       OR NEW.final_approval_date IS DISTINCT FROM OLD.final_approval_date
       OR NEW.client_preference IS DISTINCT FROM OLD.client_preference
       OR NEW.client_project_id IS DISTINCT FROM OLD.client_project_id
       OR NEW.parent_submission_id IS DISTINCT FROM OLD.parent_submission_id
    THEN
      RAISE EXCEPTION 'Designers may only edit the content of a pending submission';
    END IF;
    RETURN NEW;
  END IF;

  -- Otherwise treat as a client review: acceptance-related fields only
  IF NEW.designer_id IS DISTINCT FROM OLD.designer_id
     OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
     OR NEW.ph_approved IS DISTINCT FROM OLD.ph_approved
     OR NEW.ph_approved_by IS DISTINCT FROM OLD.ph_approved_by
     OR NEW.ph_approved_at IS DISTINCT FROM OLD.ph_approved_at
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     OR NEW.project_name IS DISTINCT FROM OLD.project_name
     OR NEW.service_type IS DISTINCT FROM OLD.service_type
     OR NEW.files_urls IS DISTINCT FROM OLD.files_urls
     OR NEW.design_link IS DISTINCT FROM OLD.design_link
     OR NEW.client_project_id IS DISTINCT FROM OLD.client_project_id
     OR NEW.parent_submission_id IS DISTINCT FROM OLD.parent_submission_id
  THEN
    RAISE EXCEPTION 'Clients may only record acceptance or revision feedback';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('client_accepted', 'approved', 'revision') THEN
    RAISE EXCEPTION 'Invalid status change';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_submissions_update_trg ON public.submissions;
CREATE TRIGGER guard_submissions_update_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submissions_update();

-- Column-level WITH CHECK reinforcement on the client/designer policies
DROP POLICY IF EXISTS "Clients can accept and revise deliverables" ON public.submissions;
CREATE POLICY "Clients can accept and revise deliverables"
ON public.submissions FOR UPDATE TO authenticated
USING (
  current_user_email() <> ''
  AND client_ref IN (
    SELECT co.id::text FROM public.client_orders co
    WHERE lower(co.client_email) = current_user_email()
  )
)
WITH CHECK (
  current_user_email() <> ''
  AND client_ref IN (
    SELECT co.id::text FROM public.client_orders co
    WHERE lower(co.client_email) = current_user_email()
  )
  AND ph_approved IS NOT TRUE
  AND ph_approved_by IS NULL
  AND status IN ('pending', 'client_accepted', 'approved', 'revision')
);

DROP POLICY IF EXISTS "Designers can update their own pending submissions" ON public.submissions;
CREATE POLICY "Designers can update their own pending submissions"
ON public.submissions FOR UPDATE TO authenticated
USING (auth.uid() = designer_id AND status = 'pending')
WITH CHECK (
  auth.uid() = designer_id
  AND status = 'pending'
  AND ph_approved IS NOT TRUE
  AND ph_approved_by IS NULL
  AND client_accepted IS NOT TRUE
);