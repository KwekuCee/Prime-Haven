CREATE OR REPLACE FUNCTION public.guard_designer_details_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'superadmin'::app_role)
     OR has_role(auth.uid(), 'masteradmin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.salary_payment_status := OLD.salary_payment_status;
  NEW.salary_estimated := OLD.salary_estimated;
  NEW.total_points := OLD.total_points;
  NEW.monthly_points := OLD.monthly_points;
  NEW.talent_score := OLD.talent_score;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_designer_details_sensitive_trg ON public.designer_details;
CREATE TRIGGER guard_designer_details_sensitive_trg
BEFORE UPDATE ON public.designer_details
FOR EACH ROW EXECUTE FUNCTION public.guard_designer_details_sensitive();

CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'superadmin'::app_role)
     OR has_role(auth.uid(), 'masteradmin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.registration_fee_paid := OLD.registration_fee_paid;
  NEW.email_verified := OLD.email_verified;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_sensitive_trg ON public.profiles;
CREATE TRIGGER guard_profiles_sensitive_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_sensitive();