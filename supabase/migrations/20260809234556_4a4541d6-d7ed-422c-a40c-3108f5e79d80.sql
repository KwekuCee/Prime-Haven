-- 1) Extend designer_details guard to all scoring/salary columns
CREATE OR REPLACE FUNCTION public.guard_designer_details_sensitive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service_role / server-side
  END IF;
  is_admin := has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_points := 0;
    NEW.monthly_points := 0;
    NEW.salary_estimated := 0;
    NEW.talent_score := NULL;
    NEW.talent_score_breakdown := NULL;
    NEW.talent_score_updated_at := NULL;
    NEW.salary_payment_status := 'unpaid';
    NEW.salary_paid_at := NULL;
    NEW.salary_paid_by := NULL;
    NEW.paid_professions := NULL;
    NEW.extra_profession_paid := false;
  ELSE
    NEW.total_points := OLD.total_points;
    NEW.monthly_points := OLD.monthly_points;
    NEW.salary_estimated := OLD.salary_estimated;
    NEW.talent_score := OLD.talent_score;
    NEW.talent_score_breakdown := OLD.talent_score_breakdown;
    NEW.talent_score_updated_at := OLD.talent_score_updated_at;
    NEW.salary_payment_status := OLD.salary_payment_status;
    NEW.salary_paid_at := OLD.salary_paid_at;
    NEW.salary_paid_by := OLD.salary_paid_by;
    NEW.paid_professions := OLD.paid_professions;
    NEW.extra_profession_paid := OLD.extra_profession_paid;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Column-level guard for submissions workflow fields
CREATE OR REPLACE FUNCTION public.guard_submissions_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  is_designer boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service_role / server-side automation
  END IF;

  is_admin := has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  is_designer := (auth.uid() = OLD.designer_id);

  -- Never client- or designer-writable
  NEW.designer_id := OLD.designer_id;
  NEW.client_project_id := OLD.client_project_id;
  NEW.client_ref := OLD.client_ref;
  NEW.points_awarded := OLD.points_awarded;
  NEW.ph_approved := OLD.ph_approved;
  NEW.ph_approved_at := OLD.ph_approved_at;
  NEW.ph_approved_by := OLD.ph_approved_by;
  NEW.reviewer_id := OLD.reviewer_id;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.final_approval_date := OLD.final_approval_date;
  NEW.client_preference := OLD.client_preference;

  IF is_designer THEN
    -- Designers may only revise their own deliverable content while pending
    NEW.status := OLD.status;
    NEW.client_accepted := OLD.client_accepted;
    NEW.client_accepted_at := OLD.client_accepted_at;
    NEW.client_accepted_by := OLD.client_accepted_by;
    NEW.revisions_count := OLD.revisions_count;
  ELSE
    -- Client review path: accept or request a revision only
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('client_accepted', 'revision', 'client_rejected') THEN
      NEW.status := OLD.status;
    END IF;
    NEW.files_urls := OLD.files_urls;
    NEW.design_link := OLD.design_link;
    NEW.project_name := OLD.project_name;
    NEW.service_type := OLD.service_type;
    IF NEW.client_accepted IS TRUE AND OLD.client_accepted IS DISTINCT FROM TRUE THEN
      NEW.client_accepted_at := now();
      NEW.client_accepted_by := auth.uid();
    ELSE
      NEW.client_accepted := OLD.client_accepted;
      NEW.client_accepted_at := OLD.client_accepted_at;
      NEW.client_accepted_by := OLD.client_accepted_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_submissions_workflow_trg ON public.submissions;
CREATE TRIGGER guard_submissions_workflow_trg
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submissions_workflow();