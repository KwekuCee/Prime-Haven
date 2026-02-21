-- Add salary payment status to designer_details
ALTER TABLE public.designer_details
ADD COLUMN salary_payment_status text DEFAULT 'unpaid',
ADD COLUMN salary_paid_at timestamp with time zone DEFAULT NULL,
ADD COLUMN salary_paid_by uuid DEFAULT NULL;