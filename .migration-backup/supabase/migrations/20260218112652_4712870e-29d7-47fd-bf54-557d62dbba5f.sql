
-- 1. Add parent_submission_id to submissions for corrections
ALTER TABLE public.submissions 
ADD COLUMN parent_submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL;

-- 2. Create monthly_records table
CREATE TABLE public.monthly_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month integer NOT NULL,
  year integer NOT NULL,
  record_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.monthly_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view monthly records"
ON public.monthly_records
FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can insert monthly records"
ON public.monthly_records
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can delete monthly records"
ON public.monthly_records
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
