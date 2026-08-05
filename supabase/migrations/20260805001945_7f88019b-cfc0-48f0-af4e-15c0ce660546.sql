ALTER TABLE public.job_contracts REPLICA IDENTITY FULL;
ALTER TABLE public.job_contract_claims REPLICA IDENTITY FULL;
ALTER TABLE public.project_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.client_projects REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_contracts','job_contract_claims','project_assignments','client_projects']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;