-- add_job_contract_visibility.sql
-- Add target_professions to support multi-profession targeting for the marketplace

ALTER TABLE public.job_contracts 
ADD COLUMN IF NOT EXISTS target_professions TEXT[] DEFAULT '{}';

-- Backfill existing contracts based on their category
-- This ensures existing jobs remain visible based on their initial category
UPDATE public.job_contracts
SET target_professions = ARRAY[category]
WHERE (target_professions IS NULL OR target_professions = '{}') AND category IS NOT NULL;

-- Ensure RLS allows designers to see this column (already part of select *)
-- No change needed to RLS if дизайнеров already have SELECT on job_contracts
