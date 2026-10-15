-- Migration: Add Mobile Money & Korapay tracking to client_debts
-- Supports direct Korapay MoMo USSD push prompts and automated webhook settlements

ALTER TABLE public.client_debts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS network_provider text DEFAULT 'mtn',
  ADD COLUMN IF NOT EXISTS korapay_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Ensure default status is 'pending'
ALTER TABLE public.client_debts ALTER COLUMN status SET DEFAULT 'pending';

-- Fast indexes for webhook reconciliation and client relationships
CREATE INDEX IF NOT EXISTS idx_client_debts_korapay_ref ON public.client_debts(korapay_reference) WHERE korapay_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_debts_client_id ON public.client_debts(client_id) WHERE client_id IS NOT NULL;
