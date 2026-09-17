CREATE OR REPLACE FUNCTION public.guard_submissions_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Server-side / definer contexts and admins are unrestricted
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  is_admin := has_role(auth.uid(), 'masteradmin'::app_role)
           OR has_role(auth.uid(), 'superadmin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.designer_id THEN
    -- Designers may only revise their own submission content
    NEW.designer_id        := OLD.designer_id;
    NEW.status             := OLD.status;
    NEW.ph_approved        := OLD.ph_approved;
    NEW.ph_approved_at     := OLD.ph_approved_at;
    NEW.ph_approved_by     := OLD.ph_approved_by;
    NEW.client_accepted    := OLD.client_accepted;
    NEW.client_accepted_at := OLD.client_accepted_at;
    NEW.client_accepted_by := OLD.client_accepted_by;
    NEW.client_preference  := OLD.client_preference;
    NEW.points_awarded     := OLD.points_awarded;
    NEW.rejection_reason   := OLD.rejection_reason;
    NEW.revisions_count    := OLD.revisions_count;
    NEW.final_approval_date := OLD.final_approval_date;
    NEW.reviewer_id        := OLD.reviewer_id;
    NEW.client_project_id  := OLD.client_project_id;
    NEW.client_ref         := OLD.client_ref;
    NEW.parent_submission_id := OLD.parent_submission_id;
    RETURN NEW;
  END IF;

  -- Any other caller (clients) must use the review RPCs; internal fields are frozen
  NEW.designer_id        := OLD.designer_id;
  NEW.ph_approved        := OLD.ph_approved;
  NEW.ph_approved_at     := OLD.ph_approved_at;
  NEW.ph_approved_by     := OLD.ph_approved_by;
  NEW.points_awarded     := OLD.points_awarded;
  NEW.reviewer_id        := OLD.reviewer_id;
  NEW.files_urls         := OLD.files_urls;
  NEW.design_link        := OLD.design_link;
  NEW.project_name       := OLD.project_name;
  NEW.service_type       := OLD.service_type;
  NEW.client_ref         := OLD.client_ref;
  NEW.client_project_id  := OLD.client_project_id;
  NEW.parent_submission_id := OLD.parent_submission_id;
  NEW.submission_date    := OLD.submission_date;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('client_accepted', 'approved', 'revision') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_submissions_update_trg ON public.submissions;
CREATE TRIGGER guard_submissions_update_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submissions_update();