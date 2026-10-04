REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric, numeric, text) TO service_role;

ALTER TABLE public.client_orders
  ADD COLUMN IF NOT EXISTS client_project_id uuid REFERENCES public.client_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_id_key ON public.payments(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE TABLE public.unmatched_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  gateway text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  amount_ghs numeric NOT NULL,
  order_id uuid,
  client_email text,
  status text NOT NULL DEFAULT 'needs_matching',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.unmatched_payments TO authenticated;
GRANT ALL ON public.unmatched_payments TO service_role;
ALTER TABLE public.unmatched_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view unmatched payments" ON public.unmatched_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'masteradmin'));
CREATE POLICY "Admins resolve unmatched payments" ON public.unmatched_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'masteradmin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'masteradmin'));