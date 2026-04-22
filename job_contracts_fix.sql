-- ============================================================
-- JOB CONTRACTS FIX
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Set a proper default so future inserts without status auto-get 'active'
ALTER TABLE public.job_contracts
    ALTER COLUMN status SET DEFAULT 'active';

-- 2. Fix any existing contracts that have NULL or empty status
--    (these are invisible in the marketplace because the query filters
--     for status IN ('active', 'in_progress'))
UPDATE public.job_contracts
SET status = 'active'
WHERE status IS NULL OR status = '';

-- Done! Existing jobs will now appear in the designer marketplace.
