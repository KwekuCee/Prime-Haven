GRANT INSERT ON public.clients TO authenticated;

DROP POLICY IF EXISTS "Clients create their own client record" ON public.clients;
CREATE POLICY "Clients create their own client record"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  lower(coalesce(email, '')) = public.current_user_email()
  AND public.current_user_email() <> ''
  AND coalesce(is_primary, false) = false
  AND char_length(name) BETWEEN 1 AND 200
);