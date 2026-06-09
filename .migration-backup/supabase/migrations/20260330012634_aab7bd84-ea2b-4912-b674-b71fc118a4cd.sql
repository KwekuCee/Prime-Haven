
-- Add active_designers_count and active_designer_ids to job_contracts for tracking designer slots
ALTER TABLE public.job_contracts ADD COLUMN IF NOT EXISTS active_designers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.job_contracts ADD COLUMN IF NOT EXISTS active_designer_ids uuid[] NOT NULL DEFAULT '{}';

-- Add UPDATE policy for monthly_records so the edge function can upsert
CREATE POLICY "Service role can update monthly records" ON public.monthly_records FOR UPDATE USING (true) WITH CHECK (true);
