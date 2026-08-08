
-- 1) designer_details: prevent self-escalation of scoring/salary/payment fields
CREATE OR REPLACE FUNCTION public.guard_designer_details_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    NEW.salary_payment_status := 'unpaid';
    NEW.paid_professions := NULL;
  ELSE
    NEW.total_points := OLD.total_points;
    NEW.monthly_points := OLD.monthly_points;
    NEW.salary_estimated := OLD.salary_estimated;
    NEW.talent_score := OLD.talent_score;
    NEW.salary_payment_status := OLD.salary_payment_status;
    NEW.paid_professions := OLD.paid_professions;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_designer_details_sensitive_trg ON public.designer_details;
CREATE TRIGGER guard_designer_details_sensitive_trg
BEFORE INSERT OR UPDATE ON public.designer_details
FOR EACH ROW EXECUTE FUNCTION public.guard_designer_details_sensitive();

-- 2) payments: client-initiated inserts must be pending
DROP POLICY IF EXISTS "Users can create their own payment records" ON public.payments;
CREATE POLICY "Users can create their own pending payment records"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 3) profiles: block self-granting verification / fee-paid
CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  is_admin := has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role);
  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.registration_fee_paid := false;
    NEW.email_verified := false;
  ELSE
    NEW.registration_fee_paid := OLD.registration_fee_paid;
    NEW.email_verified := OLD.email_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_sensitive_trg ON public.profiles;
CREATE TRIGGER guard_profiles_sensitive_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_sensitive();
