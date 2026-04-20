-- Client Debts Table to store amounts owing us
CREATE TABLE public.client_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  project_name TEXT,
  amount_owed NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_debts ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Admins can view all debts" 
  ON public.client_debts FOR SELECT 
  TO authenticated 
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can manage client debts" 
  ON public.client_debts FOR ALL 
  TO authenticated 
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Default manual revenue and profit margin to system settings
INSERT INTO public.system_settings (key, value)
VALUES 
  ('manual_revenue_added', '0'),
  ('platform_profit_margin', '30')
ON CONFLICT (key) DO NOTHING;
