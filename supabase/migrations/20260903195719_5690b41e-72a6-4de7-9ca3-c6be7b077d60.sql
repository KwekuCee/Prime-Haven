DELETE FROM public.clients c
USING public.clients d
WHERE c.email IS NOT NULL
  AND lower(c.email) = lower(d.email)
  AND c.created_at > d.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unique_idx ON public.clients (email) WHERE email IS NOT NULL;