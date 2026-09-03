CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()), ''))
$$;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

GRANT SELECT ON public.client_orders TO authenticated;
GRANT SELECT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.client_orders TO service_role;

DROP POLICY IF EXISTS "Clients view their own orders" ON public.client_orders;
CREATE POLICY "Clients view their own orders"
ON public.client_orders
FOR SELECT
TO authenticated
USING (
  lower(coalesce(client_email, '')) = public.current_user_email()
  AND public.current_user_email() <> ''
);

DROP POLICY IF EXISTS "Clients view their own client record" ON public.clients;
CREATE POLICY "Clients view their own client record"
ON public.clients
FOR SELECT
TO authenticated
USING (
  lower(coalesce(email, '')) = public.current_user_email()
  AND public.current_user_email() <> ''
);

DROP POLICY IF EXISTS "Clients update their own client record" ON public.clients;
CREATE POLICY "Clients update their own client record"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  lower(coalesce(email, '')) = public.current_user_email()
  AND public.current_user_email() <> ''
)
WITH CHECK (
  lower(coalesce(email, '')) = public.current_user_email()
  AND public.current_user_email() <> ''
);

CREATE OR REPLACE FUNCTION public.guard_clients_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.email := OLD.email;
  NEW.is_primary := OLD.is_primary;
  NEW.created_at := OLD.created_at;
  NEW.id := OLD.id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_clients_self_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS guard_clients_self_update_trg ON public.clients;
CREATE TRIGGER guard_clients_self_update_trg
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.guard_clients_self_update();