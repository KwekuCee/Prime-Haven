
-- Payout methods
CREATE TABLE public.user_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('mtn','vodafone','airteltigo')),
  phone_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payout_methods TO authenticated;
GRANT ALL ON public.user_payout_methods TO service_role;

ALTER TABLE public.user_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payout methods"
  ON public.user_payout_methods FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all payout methods"
  ON public.user_payout_methods FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE TRIGGER trg_payout_methods_updated
  BEFORE UPDATE ON public.user_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payout_methods_user ON public.user_payout_methods(user_id);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payout_method_id uuid NOT NULL REFERENCES public.user_payout_methods(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount >= 100),
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed')),
  korapay_reference text,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own withdrawals"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all withdrawals"
  ON public.withdrawals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE TRIGGER trg_withdrawals_updated
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
