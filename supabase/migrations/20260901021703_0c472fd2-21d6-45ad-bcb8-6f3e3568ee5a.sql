CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive()
RETURNS trigger
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
    NEW.discord_invite_sent := false;
  ELSE
    NEW.registration_fee_paid := OLD.registration_fee_paid;
    NEW.email_verified := OLD.email_verified;
    NEW.discord_invite_sent := OLD.discord_invite_sent;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;