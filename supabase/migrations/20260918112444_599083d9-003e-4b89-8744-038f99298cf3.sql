CREATE OR REPLACE FUNCTION public.guard_messages_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and internal/definer contexts are unrestricted.
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR has_role(auth.uid(), 'superadmin'::app_role)
     OR has_role(auth.uid(), 'masteradmin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- A recipient may only flip the read flag; everything else stays as stored.
  NEW.id := OLD.id;
  NEW.sender_id := OLD.sender_id;
  NEW.receiver_id := OLD.receiver_id;
  NEW.content := OLD.content;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_messages_update_trg ON public.messages;
CREATE TRIGGER guard_messages_update_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_messages_update();