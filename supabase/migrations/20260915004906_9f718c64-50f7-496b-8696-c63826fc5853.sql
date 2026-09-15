DROP POLICY IF EXISTS "Clients update their own client record" ON public.clients;

CREATE POLICY "Clients update their own client record"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  (lower(COALESCE(email, ''::text)) = current_user_email())
  AND (current_user_email() <> ''::text)
)
WITH CHECK (
  (lower(COALESCE(email, ''::text)) = current_user_email())
  AND (current_user_email() <> ''::text)
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'masteradmin'::app_role)
    OR COALESCE(is_primary, false) IS NOT DISTINCT FROM (
      SELECT COALESCE(c.is_primary, false) FROM public.clients c WHERE c.id = clients.id
    )
  )
);