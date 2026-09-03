DROP INDEX IF EXISTS public.clients_email_unique_idx;
CREATE UNIQUE INDEX clients_email_unique_idx ON public.clients (email);