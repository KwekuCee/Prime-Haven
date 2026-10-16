ALTER TABLE public.client_debts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS network_provider text DEFAULT 'mtn',
  ADD COLUMN IF NOT EXISTS korapay_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_debts TO authenticated;
GRANT ALL ON public.client_debts TO service_role;
NOTIFY pgrst, 'reload schema';
DROP POLICY IF EXISTS "Authenticated users view claims" ON public.job_contract_claims;