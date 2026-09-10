CREATE OR REPLACE FUNCTION public.ensure_client_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _match boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(COALESCE(email, '')) INTO _email FROM auth.users WHERE id = _uid;
  IF _email IS NULL OR _email = '' THEN
    RETURN false;
  END IF;

  -- Never touch admin accounts
  IF has_role(_uid, 'superadmin'::app_role) OR has_role(_uid, 'masteradmin'::app_role) THEN
    RETURN false;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.clients c WHERE lower(COALESCE(c.email,'')) = _email)
      OR EXISTS (SELECT 1 FROM public.client_orders o WHERE lower(COALESCE(o.client_email,'')) = _email)
      OR EXISTS (SELECT 1 FROM public.client_projects p WHERE lower(COALESCE(p.client_email,'')) = _email)
    INTO _match;

  IF NOT _match THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'designer';
  DELETE FROM public.designer_details WHERE user_id = _uid;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_client_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_client_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_client_role() TO authenticated;