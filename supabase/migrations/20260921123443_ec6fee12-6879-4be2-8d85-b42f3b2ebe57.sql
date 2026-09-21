CREATE TABLE IF NOT EXISTS public.project_tip_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  designer_id uuid NOT NULL,
  client_name text,
  client_email text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  message text,
  status text NOT NULL DEFAULT 'pending',
  gateway text NOT NULL DEFAULT 'korapay',
  verified_tip_id uuid REFERENCES public.project_tips(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_tip_intents_reference_format CHECK (reference ~ '^PH-TIP-[0-9]{10,20}-[A-Za-z0-9_-]{8,40}$'),
  CONSTRAINT project_tip_intents_amount_check CHECK (amount >= 5 AND amount <= 100000),
  CONSTRAINT project_tip_intents_currency_check CHECK (currency IN ('GHS')),
  CONSTRAINT project_tip_intents_status_check CHECK (status IN ('pending','completed','expired','failed')),
  CONSTRAINT project_tip_intents_client_email_check CHECK (client_email IS NULL OR (length(client_email) <= 255 AND client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')),
  CONSTRAINT project_tip_intents_client_name_check CHECK (client_name IS NULL OR length(btrim(client_name)) BETWEEN 1 AND 100),
  CONSTRAINT project_tip_intents_message_check CHECK (message IS NULL OR length(message) <= 500)
);

GRANT SELECT ON public.project_tip_intents TO authenticated;
GRANT ALL ON public.project_tip_intents TO service_role;

ALTER TABLE public.project_tip_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all tip intents" ON public.project_tip_intents;
CREATE POLICY "Admins view all tip intents"
  ON public.project_tip_intents
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP TRIGGER IF EXISTS update_project_tip_intents_updated_at ON public.project_tip_intents;
CREATE TRIGGER update_project_tip_intents_updated_at
  BEFORE UPDATE ON public.project_tip_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_tip_intents_project_id ON public.project_tip_intents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tip_intents_designer_id ON public.project_tip_intents(designer_id);
CREATE INDEX IF NOT EXISTS idx_project_tip_intents_status_expires ON public.project_tip_intents(status, expires_at);

DROP POLICY IF EXISTS "Anyone can create a tip" ON public.project_tips;
DROP POLICY IF EXISTS "Anyone can create a pending tip" ON public.project_tips;
DROP POLICY IF EXISTS "Anyone can create a validated pending tip" ON public.project_tips;

DROP POLICY IF EXISTS "Admins manage all tips" ON public.project_tips;
CREATE POLICY "Admins manage all tips"
  ON public.project_tips
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins view all tips" ON public.project_tips;
CREATE POLICY "Admins view all tips"
  ON public.project_tips
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));