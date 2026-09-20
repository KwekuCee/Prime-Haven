DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;

CREATE POLICY "Users can mark received messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

CREATE OR REPLACE FUNCTION public.guard_messages_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.receiver_id THEN
    NEW.id := OLD.id;
    NEW.sender_id := OLD.sender_id;
    NEW.receiver_id := OLD.receiver_id;
    NEW.content := OLD.content;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this message';
END;
$$;

DROP TRIGGER IF EXISTS guard_messages_update_trg ON public.messages;
CREATE TRIGGER guard_messages_update_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_messages_update();