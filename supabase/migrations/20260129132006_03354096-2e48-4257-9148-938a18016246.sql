-- Drop the existing constraint and add new one with updated status values
ALTER TABLE public.submissions DROP CONSTRAINT submissions_status_check;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'ph_approved'::text, 'client_accepted'::text, 'approved'::text, 'revision'::text, 'rejected'::text]));