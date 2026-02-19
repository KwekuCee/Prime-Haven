
-- Create job_contracts table
CREATE TABLE public.job_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  budget TEXT,
  requirements TEXT,
  client_name TEXT,
  reference_files TEXT[],
  special_instructions TEXT,
  discord_channel_id TEXT,
  discord_message_id TEXT,
  posted_by UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_contracts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage job contracts
CREATE POLICY "Admins can view all job contracts"
ON public.job_contracts FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can create job contracts"
ON public.job_contracts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update job contracts"
ON public.job_contracts FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete job contracts"
ON public.job_contracts FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_job_contracts_updated_at
BEFORE UPDATE ON public.job_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
