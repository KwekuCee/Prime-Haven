CREATE OR REPLACE FUNCTION public.protect_designer_details_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'masteradmin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'superadmin'::public.app_role) THEN
    IF NEW.total_points IS DISTINCT FROM OLD.total_points
       OR NEW.monthly_points IS DISTINCT FROM OLD.monthly_points
       OR NEW.talent_score IS DISTINCT FROM OLD.talent_score
       OR NEW.talent_score_breakdown IS DISTINCT FROM OLD.talent_score_breakdown
       OR NEW.talent_score_updated_at IS DISTINCT FROM OLD.talent_score_updated_at
       OR NEW.salary_estimated IS DISTINCT FROM OLD.salary_estimated
       OR NEW.salary_payment_status IS DISTINCT FROM OLD.salary_payment_status
       OR NEW.salary_paid_at IS DISTINCT FROM OLD.salary_paid_at
       OR NEW.salary_paid_by IS DISTINCT FROM OLD.salary_paid_by THEN
      RAISE EXCEPTION 'Sensitive designer metrics and payout fields can only be updated by an administrator';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_designer_details_sensitive_fields ON public.designer_details;
CREATE TRIGGER protect_designer_details_sensitive_fields
BEFORE UPDATE ON public.designer_details
FOR EACH ROW EXECUTE FUNCTION public.protect_designer_details_sensitive_fields();

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'masteradmin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'superadmin'::public.app_role) THEN
    IF NEW.registration_fee_paid IS DISTINCT FROM OLD.registration_fee_paid
       OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.discord_invite_sent IS DISTINCT FROM OLD.discord_invite_sent THEN
      RAISE EXCEPTION 'Account verification and activation fields can only be updated by an administrator or trusted backend process';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

CREATE OR REPLACE FUNCTION public.protect_submission_workflow_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.designer_id
     AND NOT public.has_role(auth.uid(), 'masteradmin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'superadmin'::public.app_role) THEN
    IF NEW.designer_id IS DISTINCT FROM OLD.designer_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
       OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
       OR NEW.ph_approved IS DISTINCT FROM OLD.ph_approved
       OR NEW.ph_approved_at IS DISTINCT FROM OLD.ph_approved_at
       OR NEW.ph_approved_by IS DISTINCT FROM OLD.ph_approved_by
       OR NEW.client_accepted IS DISTINCT FROM OLD.client_accepted
       OR NEW.client_accepted_at IS DISTINCT FROM OLD.client_accepted_at
       OR NEW.client_accepted_by IS DISTINCT FROM OLD.client_accepted_by
       OR NEW.final_approval_date IS DISTINCT FROM OLD.final_approval_date THEN
      RAISE EXCEPTION 'Submission approval, ownership, and points fields cannot be changed by the submitting professional';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_submission_workflow_fields ON public.submissions;
CREATE TRIGGER protect_submission_workflow_fields
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_submission_workflow_fields();