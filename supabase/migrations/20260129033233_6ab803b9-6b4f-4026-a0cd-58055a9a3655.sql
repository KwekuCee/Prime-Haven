-- Add username column to profiles for admin login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create system_settings table for revenue and other configurable values
CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings
CREATE POLICY "Anyone can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can update system settings"
ON public.system_settings FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can insert system settings"
ON public.system_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Add ph_approved and client_accepted columns to submissions for two-level approval
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ph_approved boolean DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS client_accepted boolean DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ph_approved_at timestamp with time zone;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS client_accepted_at timestamp with time zone;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ph_approved_by uuid;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS client_accepted_by uuid;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('monthly_revenue', '{"amount": 0, "currency": "GHS", "month": null, "year": null}'::jsonb, 'Monthly revenue for salary calculations'),
    ('ph_approval_points', '{"value": 15}'::jsonb, 'Points awarded for Prime Haven approval'),
    ('client_acceptance_points', '{"value": 40}'::jsonb, 'Points awarded for client acceptance'),
    ('revenue_share_percentage', '{"value": 50}'::jsonb, 'Percentage of revenue shared with designers')
ON CONFLICT (key) DO NOTHING;

-- Update the admin user username
UPDATE public.profiles SET username = 'ceo' WHERE email = 'ceo@PH';