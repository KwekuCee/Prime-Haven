-- Create role enum for the application
CREATE TYPE public.app_role AS ENUM ('designer', 'superadmin', 'masteradmin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'designer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Policies for user_roles table
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only masteradmin can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'))
WITH CHECK (public.has_role(auth.uid(), 'masteradmin'));

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    dob DATE,
    registration_fee_paid BOOLEAN DEFAULT false,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    discord_invite_sent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Allow insert for authenticated users"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create designer_details table
CREATE TABLE public.designer_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    professional_title TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_level TEXT,
    available_hours INTEGER,
    portfolio_url TEXT,
    total_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    payment_method TEXT,
    payment_details JSONB,
    salary_estimated DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.designer_details ENABLE ROW LEVEL SECURITY;

-- Designer details policies
CREATE POLICY "Designers can view their own details"
ON public.designer_details FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all designer details"
ON public.designer_details FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can update their own details"
ON public.designer_details FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any designer details"
ON public.designer_details FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Allow insert for authenticated designers"
ON public.designer_details FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    client_ref TEXT,
    service_type TEXT NOT NULL,
    files_urls TEXT[] DEFAULT '{}',
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision', 'rejected')),
    reviewer_id UUID REFERENCES auth.users(id),
    points_awarded INTEGER DEFAULT 0,
    client_preference BOOLEAN DEFAULT false,
    revisions_count INTEGER DEFAULT 0,
    final_approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Submissions policies
CREATE POLICY "Designers can view their own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (auth.uid() = designer_id);

CREATE POLICY "Admins can view all submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can create their own submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Designers can update their own pending submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (auth.uid() = designer_id AND status = 'pending')
WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Admins can update any submission"
ON public.submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Designers can delete their own pending submissions"
ON public.submissions FOR DELETE
TO authenticated
USING (auth.uid() = designer_id AND status = 'pending');

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'salary')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id TEXT,
    payment_gateway TEXT,
    payment_details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_by_admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can create their own payment records"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update payments"
ON public.payments FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- Create system_logs table
CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- System logs policies (only masteradmin can view)
CREATE POLICY "Only masteradmin can view system logs"
ON public.system_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'));

CREATE POLICY "Admins can create system logs"
ON public.system_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
    );
    
    -- Assign default designer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'designer');
    
    -- Create designer details
    INSERT INTO public.designer_details (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designer_details_updated_at
    BEFORE UPDATE ON public.designer_details
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Email Verification Tokens table
CREATE TABLE public.email_verification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own tokens (for checking status)
CREATE POLICY "Users can view their own tokens"
ON public.email_verification_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to create their own tokens
CREATE POLICY "Users can create their own tokens"
ON public.email_verification_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow deletion of own tokens
CREATE POLICY "Users can delete their own tokens"
ON public.email_verification_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Add email_verified column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster token lookups
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user ON public.email_verification_tokens(user_id);
-- Create storage bucket for submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf']
);

-- RLS Policies for submissions bucket
-- Designers can upload to their own folder
CREATE POLICY "Designers can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Designers can view their own files
CREATE POLICY "Designers can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Designers can delete their own files
CREATE POLICY "Designers can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role) 
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);
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
-- Create portfolio_items table for company works display
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view portfolio items (they're public on the website)
CREATE POLICY "Portfolio items are viewable by everyone"
ON public.portfolio_items
FOR SELECT
USING (true);

-- Only admins can insert portfolio items
CREATE POLICY "Admins can insert portfolio items"
ON public.portfolio_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);

-- Only admins can update portfolio items
CREATE POLICY "Admins can update portfolio items"
ON public.portfolio_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);

-- Only admins can delete portfolio items
CREATE POLICY "Admins can delete portfolio items"
ON public.portfolio_items
FOR DELETE
USING (
  has_role(auth.uid(), 'masteradmin') OR has_role(auth.uid(), 'superadmin')
);
-- Drop the existing constraint and add new one with updated status values
ALTER TABLE public.submissions DROP CONSTRAINT submissions_status_check;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'ph_approved'::text, 'client_accepted'::text, 'approved'::text, 'revision'::text, 'rejected'::text]));
-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own profile picture
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own profile picture
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Profile pictures are publicly viewable
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Add profile_photo_url column to designer_details if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'designer_details' AND column_name = 'profile_photo_url') THEN
        ALTER TABLE public.designer_details ADD COLUMN profile_photo_url TEXT;
    END IF;
END $$;
-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to email assets
CREATE POLICY "Email assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');
-- Drop the overly permissive public SELECT policy on system_settings
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

-- Create a new policy that only allows authenticated admins to view system settings
CREATE POLICY "Only admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
-- Allow admins to delete profiles (cascades to designer_details and other related data)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete designer_details
CREATE POLICY "Admins can delete designer details"
ON public.designer_details
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete user_roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete submissions (for cleanup when deleting designers)
CREATE POLICY "Admins can delete any submission"
ON public.submissions
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete payments
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
ALTER TABLE public.submissions ADD COLUMN rejection_reason text;

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

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
-- Create a public bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- Anyone can view portfolio images
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-images');

-- Admins can upload portfolio images
CREATE POLICY "Admins can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can update portfolio images
CREATE POLICY "Admins can update portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can delete portfolio images
CREATE POLICY "Admins can delete portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);
ALTER TABLE public.portfolio_items ADD COLUMN project_url text;

-- Create user_settings table to persist preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark',
  currency TEXT DEFAULT 'ghs',
  profile_visibility TEXT DEFAULT 'public',
  show_earnings BOOLEAN DEFAULT false,
  allow_messages BOOLEAN DEFAULT true,
  data_sharing BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  project_updates BOOLEAN DEFAULT true,
  payment_alerts BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all settings
CREATE POLICY "Admins can view all user settings"
ON public.user_settings FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create messages table for designer-to-designer messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can mark received messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Users can delete their own sent messages
CREATE POLICY "Users can delete their sent messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Index for fast conversation lookups
CREATE INDEX idx_messages_sender ON public.messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id, created_at DESC);
-- Add talent score columns to designer_details
ALTER TABLE public.designer_details
  ADD COLUMN IF NOT EXISTS talent_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS talent_score_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS talent_score_updated_at timestamp with time zone;

-- talent_score: 0-100 composite score
-- talent_score_breakdown: { quality, acceptance_rate, consistency, revision_efficiency, reliability }
-- talent_score_updated_at: when score was last recalculated
-- Add design_link column to submissions for App Design Figma/Framer/XD links
ALTER TABLE public.submissions ADD COLUMN design_link text;

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
-- Create testimonials table for client reviews
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  company_role TEXT,
  service_used TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can view visible testimonials
CREATE POLICY "Testimonials are viewable by everyone"
ON public.testimonials
FOR SELECT
USING (is_visible = true);

-- Admins can view all testimonials
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials
FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can insert testimonials
CREATE POLICY "Admins can insert testimonials"
ON public.testimonials
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can update testimonials
CREATE POLICY "Admins can update testimonials"
ON public.testimonials
FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can delete testimonials
CREATE POLICY "Admins can delete testimonials"
ON public.testimonials
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
BEFORE UPDATE ON public.testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a few starter testimonials
INSERT INTO public.testimonials (client_name, company_role, service_used, rating, review_text, display_order) VALUES
('Ama Boateng', 'CEO at TechStart Ghana', 'Web Development', 5, 'Prime Haven completely transformed our online presence. The team delivered a stunning website that exceeded our expectations. Their attention to detail and professionalism is unmatched.', 1),
('Kofi Mensah', 'Marketing Director, AfriBrand Co.', 'Graphic Design', 5, 'Working with Prime Haven was an absolute pleasure. They captured our brand identity perfectly and delivered high-quality designs within record time. Highly recommended!', 2),
('Sandra Owusu', 'Founder, StyleHaus', 'UI/UX Design', 5, 'The UI/UX team at Prime Haven redesigned our app and the results were phenomenal. User engagement shot up by 60% in the first month. They truly understand design.', 3);
-- Add salary payment status to designer_details
ALTER TABLE public.designer_details
ADD COLUMN salary_payment_status text DEFAULT 'unpaid',
ADD COLUMN salary_paid_at timestamp with time zone DEFAULT NULL,
ADD COLUMN salary_paid_by uuid DEFAULT NULL;

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'news',
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create newsletter_subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Blog posts: everyone can read published posts
CREATE POLICY "Published blog posts are viewable by everyone"
ON public.blog_posts FOR SELECT
USING (is_published = true);

-- Blog posts: admins can view all (including drafts)
CREATE POLICY "Admins can view all blog posts"
ON public.blog_posts FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Blog posts: admins can insert
CREATE POLICY "Admins can create blog posts"
ON public.blog_posts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Blog posts: admins can update
CREATE POLICY "Admins can update blog posts"
ON public.blog_posts FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Blog posts: admins can delete
CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Newsletter: anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (true);

-- Newsletter: admins can view subscribers
CREATE POLICY "Admins can view newsletter subscribers"
ON public.newsletter_subscribers FOR SELECT
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Newsletter: admins can manage subscribers
CREATE POLICY "Admins can update newsletter subscribers"
ON public.newsletter_subscribers FOR UPDATE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete newsletter subscribers"
ON public.newsletter_subscribers FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Auto-update updated_at for blog_posts
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for blog images (cover images and inline content images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Admins can upload blog images
CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' 
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can delete blog images
CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images' 
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Client projects table for tracking
CREATE TABLE public.client_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_whatsapp TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'web-development',
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  tracking_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex') UNIQUE,
  budget TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project milestones
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project deliverables (files shared with client)
CREATE TABLE public.project_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project feedback from clients (via shared link)
CREATE TABLE public.project_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

-- Admin access for client_projects
CREATE POLICY "Admins can manage client projects" ON public.client_projects FOR ALL
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Public read via tracking token (handled by edge function, so no public SELECT policy needed)

-- Admin access for milestones
CREATE POLICY "Admins can manage milestones" ON public.project_milestones FOR ALL
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admin access for deliverables
CREATE POLICY "Admins can manage deliverables" ON public.project_deliverables FOR ALL
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admin can view feedback
CREATE POLICY "Admins can manage feedback" ON public.project_feedback FOR ALL
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Anyone can insert feedback (via shared tracking link, validated by edge function)
CREATE POLICY "Anyone can submit feedback" ON public.project_feedback FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for job contract reference files
INSERT INTO storage.buckets (id, name, public) VALUES ('job-reference-files', 'job-reference-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload job reference files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-reference-files' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'masteradmin'))
));

-- Allow admins to delete files
CREATE POLICY "Admins can delete job reference files"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-reference-files' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'masteradmin'))
));

-- Allow public read access for reference files
CREATE POLICY "Anyone can view job reference files"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-reference-files');

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role_title text NOT NULL,
  bio text NOT NULL,
  photo_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Everyone can view visible team members
CREATE POLICY "Team members are viewable by everyone"
  ON public.team_members FOR SELECT
  USING (is_visible = true);

-- Admins can view all
CREATE POLICY "Admins can view all team members"
  ON public.team_members FOR SELECT
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Admins can manage
CREATE POLICY "Admins can insert team members"
  ON public.team_members FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update team members"
  ON public.team_members FOR UPDATE
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete team members"
  ON public.team_members FOR DELETE
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
ALTER TABLE public.team_members ADD COLUMN position_level integer NOT NULL DEFAULT 99;

COMMENT ON COLUMN public.team_members.position_level IS 'Hierarchy level: 1=C-Suite, 2=VP, 3=Director, 4=Manager, 5=Lead, 99=Other';
-- Create a public bucket for team member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Team photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-photos');

-- Allow admins to upload
CREATE POLICY "Admins can upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-photos'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Allow admins to delete
CREATE POLICY "Admins can delete team photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-photos'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);
-- Allow all authenticated users to read designer_details for leaderboard
CREATE POLICY "Authenticated users can view all designer details for leaderboard"
ON public.designer_details
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to read all profiles for leaderboard names
CREATE POLICY "Authenticated users can view all profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Designers can view active job contracts"
ON public.job_contracts
FOR SELECT
TO authenticated
USING (status = 'active' OR status = 'in_progress');
ALTER TABLE public.submissions DROP CONSTRAINT submissions_status_check;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'ph_approved'::text, 'client_accepted'::text, 'approved'::text, 'revision'::text, 'rejected'::text, 'client_rejected'::text]));

ALTER TABLE public.submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE public.submissions ADD CONSTRAINT submissions_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'ph_approved'::text, 'client_accepted'::text, 'approved'::text, 'revision'::text, 'rejected'::text, 'client_rejected'::text, 'correction_requested'::text]));
CREATE POLICY "Anyone can submit a testimonial"
ON public.testimonials
FOR INSERT
TO anon
WITH CHECK (true);
CREATE POLICY "Authenticated users can insert system logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);

-- Service pricing table with tiers
CREATE TABLE public.service_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  service_label TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic',
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  discord_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_type, tier)
);

-- Client orders table
CREATE TABLE public.client_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_whatsapp TEXT,
  service_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  discord_posted BOOLEAN DEFAULT false,
  discord_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;

-- Service pricing: public read, admin write
CREATE POLICY "Anyone can view active pricing" ON public.service_pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all pricing" ON public.service_pricing FOR SELECT TO authenticated USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins can insert pricing" ON public.service_pricing FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins can update pricing" ON public.service_pricing FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins can delete pricing" ON public.service_pricing FOR DELETE TO authenticated USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Client orders: anon can insert, admins can manage
CREATE POLICY "Anyone can create orders" ON public.client_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can create orders" ON public.client_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view all orders" ON public.client_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Admins can update orders" ON public.client_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Seed default pricing
INSERT INTO public.service_pricing (service_type, service_label, tier, price, description, features, discord_category) VALUES
  ('logo-design', 'Logo Design', 'basic', 200, 'Simple logo with 2 concepts', ARRAY['2 Logo Concepts', '1 Revision', 'PNG & JPG Files'], 'graphic-design'),
  ('logo-design', 'Logo Design', 'standard', 500, 'Professional logo with full package', ARRAY['4 Logo Concepts', '3 Revisions', 'All File Formats', 'Brand Color Palette'], 'graphic-design'),
  ('logo-design', 'Logo Design', 'premium', 1000, 'Premium branding with guidelines', ARRAY['Unlimited Concepts', 'Unlimited Revisions', 'All Formats', 'Brand Guidelines', 'Social Media Kit'], 'graphic-design'),
  ('brand-identity', 'Brand Identity', 'basic', 500, 'Basic brand package', ARRAY['Logo Design', 'Color Palette', 'Typography Selection'], 'graphic-design'),
  ('brand-identity', 'Brand Identity', 'standard', 1200, 'Complete brand identity', ARRAY['Logo Design', 'Brand Guidelines', 'Business Card', 'Letterhead', 'Social Media Templates'], 'graphic-design'),
  ('brand-identity', 'Brand Identity', 'premium', 2500, 'Full brand strategy & design', ARRAY['Everything in Standard', 'Brand Strategy', 'Marketing Collateral', 'Packaging Design', 'Brand Manual'], 'graphic-design'),
  ('app-design', 'App / UI/UX Design', 'basic', 800, 'Basic app screens design', ARRAY['Up to 5 Screens', '1 Revision', 'Figma Source Files'], 'app-design'),
  ('app-design', 'App / UI/UX Design', 'standard', 2000, 'Full app design with prototyping', ARRAY['Up to 15 Screens', '3 Revisions', 'Interactive Prototype', 'Design System'], 'app-design'),
  ('app-design', 'App / UI/UX Design', 'premium', 4000, 'Complete product design', ARRAY['Unlimited Screens', 'Unlimited Revisions', 'User Research', 'Prototype', 'Design System', 'Handoff Support'], 'app-design'),
  ('web-design', 'Web Design', 'basic', 500, 'Simple website design', ARRAY['Up to 3 Pages', '1 Revision', 'Responsive Design'], 'web-dev'),
  ('web-design', 'Web Design', 'standard', 1500, 'Professional website', ARRAY['Up to 8 Pages', '3 Revisions', 'Responsive Design', 'SEO Basics'], 'web-dev'),
  ('web-design', 'Web Design', 'premium', 3000, 'Premium website with all features', ARRAY['Unlimited Pages', 'Unlimited Revisions', 'Custom Animations', 'SEO Optimization', 'CMS Integration'], 'web-dev'),
  ('web-development', 'Web Development', 'basic', 1000, 'Basic website development', ARRAY['Up to 3 Pages', 'Responsive', 'Contact Form'], 'web-dev'),
  ('web-development', 'Web Development', 'standard', 3000, 'Full website development', ARRAY['Up to 10 Pages', 'CMS', 'SEO', 'Analytics Integration'], 'web-dev'),
  ('web-development', 'Web Development', 'premium', 6000, 'Enterprise web application', ARRAY['Custom Web App', 'Database', 'API Integration', 'Admin Dashboard', 'Ongoing Support'], 'web-dev'),
  ('print-design', 'Print Design', 'basic', 100, 'Single print item', ARRAY['1 Design', '1 Revision', 'Print-Ready File'], 'graphic-design'),
  ('print-design', 'Print Design', 'standard', 300, 'Multi-item print package', ARRAY['3 Designs', '2 Revisions', 'Print-Ready Files'], 'graphic-design'),
  ('print-design', 'Print Design', 'premium', 600, 'Complete print collateral', ARRAY['Unlimited Designs', 'Unlimited Revisions', 'All Formats', 'Print Consultation'], 'graphic-design'),
  ('flyer-design', 'Flyer / Poster Design', 'basic', 80, 'Single flyer design', ARRAY['1 Design', '1 Revision', 'Digital & Print Files'], 'graphic-design'),
  ('flyer-design', 'Flyer / Poster Design', 'standard', 200, 'Professional flyer package', ARRAY['2 Designs', '2 Revisions', 'Social Media Sizes'], 'graphic-design'),
  ('flyer-design', 'Flyer / Poster Design', 'premium', 400, 'Premium poster campaign', ARRAY['4 Designs', 'Unlimited Revisions', 'All Sizes', 'Animation Option'], 'graphic-design'),
  ('social-media', 'Social Media Design', 'basic', 150, 'Basic social media graphics', ARRAY['5 Posts', '1 Revision', '2 Platforms'], 'graphic-design'),
  ('social-media', 'Social Media Design', 'standard', 400, 'Monthly social media package', ARRAY['15 Posts', '3 Revisions', 'All Platforms', 'Story Templates'], 'graphic-design'),
  ('social-media', 'Social Media Design', 'premium', 800, 'Premium social media management', ARRAY['30 Posts', 'Unlimited Revisions', 'All Platforms', 'Content Strategy', 'Animations'], 'graphic-design');

CREATE TABLE public.consultation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  service_interest text,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a consultation booking"
  ON public.consultation_bookings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all consultation bookings"
  ON public.consultation_bookings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update consultation bookings"
  ON public.consultation_bookings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can delete consultation bookings"
  ON public.consultation_bookings
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  whatsapp text,
  company text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clients" ON public.clients
  FOR ALL TO public
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
ALTER TABLE public.blog_posts 
ADD COLUMN is_sponsored boolean NOT NULL DEFAULT false,
ADD COLUMN sponsor_name text DEFAULT NULL,
ADD COLUMN affiliate_links jsonb DEFAULT '[]'::jsonb;

-- Add active_designers_count and active_designer_ids to job_contracts for tracking designer slots
ALTER TABLE public.job_contracts ADD COLUMN IF NOT EXISTS active_designers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.job_contracts ADD COLUMN IF NOT EXISTS active_designer_ids uuid[] NOT NULL DEFAULT '{}';

-- Add UPDATE policy for monthly_records so the edge function can upsert
CREATE POLICY "Service role can update monthly records" ON public.monthly_records FOR UPDATE USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;

-- 1. Create secure leaderboard view for profiles (non-sensitive fields only)
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT id, full_name, username
FROM public.profiles;

-- 2. Create secure leaderboard view for designer_details (non-sensitive fields only)
CREATE OR REPLACE VIEW public.leaderboard_designer_details AS
SELECT user_id, professional_title, skills, total_points, monthly_points, talent_score, profile_photo_url, experience_level
FROM public.designer_details;

-- 3. Drop overly broad leaderboard SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboa" ON public.designer_details;

-- 4. Fix monthly_records UPDATE policy â€” restrict to admins only
DROP POLICY IF EXISTS "Service role can update monthly records" ON public.monthly_records;
CREATE POLICY "Only admins can update monthly records"
ON public.monthly_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 5. Tighten testimonials anon INSERT â€” require authenticated
DROP POLICY IF EXISTS "Anyone can submit a testimonial" ON public.testimonials;
CREATE POLICY "Authenticated users can submit a testimonial"
ON public.testimonials
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Tighten consultation_bookings INSERT â€” keep public but add length limits via trigger
-- (keeping public since visitors need to book without auth)

-- 7. Tighten client_orders anon INSERT â€” require authenticated only
DROP POLICY IF EXISTS "Anyone can create orders" ON public.client_orders;

-- 8. Remove system_settings from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.system_settings;

-- 9. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_designer_id ON public.submissions(designer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_job_contracts_status ON public.job_contracts(status);
CREATE INDEX IF NOT EXISTS idx_job_contracts_category ON public.job_contracts(category);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action_type ON public.system_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp);

-- Fix views to use SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard_profiles;
CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = on)
AS SELECT id, full_name, username FROM public.profiles;

DROP VIEW IF EXISTS public.leaderboard_designer_details;
CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = on)
AS SELECT user_id, professional_title, skills, total_points, monthly_points, talent_score, profile_photo_url, experience_level FROM public.designer_details;

CREATE TABLE public.visitor_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash text NOT NULL,
  country text,
  country_code text,
  city text,
  region text,
  latitude numeric,
  longitude numeric,
  page_path text NOT NULL DEFAULT '/',
  user_agent text,
  is_registered_user boolean DEFAULT false,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_analytics_created_at ON public.visitor_analytics(created_at DESC);
CREATE INDEX idx_visitor_analytics_country ON public.visitor_analytics(country_code);
CREATE INDEX idx_visitor_analytics_ip_hash ON public.visitor_analytics(ip_hash);

ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view visitor analytics"
ON public.visitor_analytics
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'masteradmin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Edge functions can insert visitor data"
ON public.visitor_analytics
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Authenticated can insert visitor data"
ON public.visitor_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);
-- Add designer_id to portfolio_items to link work to specific designers
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES auth.users(id);

-- Add reputation and profile fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS behance_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Enable public reading of profiles for the reputation system
CREATE POLICY "Public can view designer profiles" ON public.profiles FOR SELECT USING (true);

-- Enable designers to update their own profile fields
CREATE POLICY "Designers can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Portfolio policies: designers can manage their own work
CREATE POLICY "Designers can insert their own portfolio items" ON public.portfolio_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = designer_id);
CREATE POLICY "Designers can update their own portfolio items" ON public.portfolio_items FOR UPDATE TO authenticated USING (auth.uid() = designer_id);
CREATE POLICY "Designers can delete their own portfolio items" ON public.portfolio_items FOR DELETE TO authenticated USING (auth.uid() = designer_id);
-- Re-enable anon INSERT on client_orders
-- The StartProject page is public and allows unauthenticated clients to submit orders.
-- The "Anyone can create orders" policy was previously dropped in migration 20260402003703.
-- We need it back so that free (0 GHS promo) orders can be inserted directly from the frontend.

CREATE POLICY "Public can create orders"
ON public.client_orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Also allow anon INSERT on client_projects (for project tracking from StartProject page)
CREATE POLICY "Public can create client projects"
ON public.client_projects
FOR INSERT
TO anon
WITH CHECK (true);
-- Create a database function to post order notifications to Discord
-- This uses pg_net to make HTTP requests directly from the database,
-- bypassing the need for edge function deployment.
-- The Discord bot token must be stored in system_settings with key 'discord_bot_token'.

-- First, ensure the discord_bot_token is in system_settings
-- (The user must manually set the token value in the Supabase Dashboard â†’ Table Editor â†’ system_settings)
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'discord_bot_token',
  '"REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN"',
  'Discord bot token for posting order notifications',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Also store the channel mapping
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'discord_order_channels',
  '{"graphic-design": "1470244531680186478", "app-design": "1470244675951529984", "web-dev": "1470244738073497704"}',
  'Discord channel IDs for order notifications by category',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Create the RPC function for posting to Discord
CREATE OR REPLACE FUNCTION public.notify_discord_order(
  p_service_label text,
  p_service_type text,
  p_tier text,
  p_client_name text,
  p_client_email text,
  p_amount numeric,
  p_discord_category text,
  p_gateway text DEFAULT 'promo',
  p_client_whatsapp text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_token text;
  v_channels jsonb;
  v_channel_id text;
  v_embed jsonb;
  v_payload jsonb;
  v_display_amount text;
BEGIN
  -- Get bot token from system_settings
  SELECT (value #>> '{}') INTO v_bot_token
  FROM public.system_settings
  WHERE key = 'discord_bot_token';

  -- Get channel mapping
  SELECT value INTO v_channels
  FROM public.system_settings
  WHERE key = 'discord_order_channels';

  IF v_bot_token IS NULL OR v_bot_token = '' OR v_bot_token = 'REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN' THEN
    RAISE NOTICE 'Discord bot token not configured, skipping notification';
    RETURN;
  END IF;

  -- Look up channel ID
  v_channel_id := v_channels ->> p_discord_category;

  IF v_channel_id IS NULL THEN
    RAISE NOTICE 'No Discord channel for category: %', p_discord_category;
    RETURN;
  END IF;

  -- Format amount
  v_display_amount := 'GHâ‚µ' || p_amount::text;

  -- Build Discord embed
  v_embed := jsonb_build_object(
    'title', 'ðŸ†• New Client Order: ' || COALESCE(p_service_label, p_service_type),
    'description', 'Order placed via ' || p_gateway,
    'color', 2278109,
    'fields', jsonb_build_array(
      jsonb_build_object('name', 'ðŸ‘¤ Client', 'value', p_client_name, 'inline', true),
      jsonb_build_object('name', 'ðŸ“§ Email', 'value', p_client_email, 'inline', true),
      jsonb_build_object('name', 'ðŸ“¦ Package', 'value', initcap(p_tier), 'inline', true),
      jsonb_build_object('name', 'ðŸ’° Amount', 'value', v_display_amount, 'inline', true)
    ),
    'footer', jsonb_build_object('text', 'Prime Haven â€¢ Client Order (via ' || p_gateway || ')'),
    'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  -- Add WhatsApp field if provided
  IF p_client_whatsapp IS NOT NULL AND p_client_whatsapp != '' THEN
    v_embed := jsonb_set(
      v_embed,
      '{fields}',
      (v_embed -> 'fields') || jsonb_build_array(
        jsonb_build_object('name', 'ðŸ“± WhatsApp', 'value', p_client_whatsapp, 'inline', true)
      )
    );
  END IF;

  v_payload := jsonb_build_object('embeds', jsonb_build_array(v_embed));

  -- Post to Discord using pg_net
  PERFORM net.http_post(
    url := 'https://discord.com/api/v10/channels/' || v_channel_id || '/messages',
    headers := jsonb_build_object(
      'Authorization', 'Bot ' || v_bot_token,
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.notify_discord_order TO anon;
GRANT EXECUTE ON FUNCTION public.notify_discord_order TO authenticated;
-- Profession-Based Job Distribution System Migration

-- 1. Add professions to designer_details
-- We use a TEXT array to allow designers to have multiple professions (e.g., UI/UX AND Web Dev)
ALTER TABLE public.designer_details 
ADD COLUMN IF NOT EXISTS professions TEXT[] DEFAULT '{}';

-- 2. Add required_professions and job limits to client_projects
ALTER TABLE public.client_projects 
ADD COLUMN IF NOT EXISTS required_professions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_assignees INTEGER DEFAULT 1;

-- 3. Create project_assignments table
CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, designer_id) -- A designer can claim a project only once
);

-- 4. Enable RLS on assignments
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for assignments
DROP POLICY IF EXISTS "Designers can view their own assignments" ON public.project_assignments;
CREATE POLICY "Designers can view their own assignments"
ON public.project_assignments FOR SELECT
TO authenticated
USING (auth.uid() = designer_id);

DROP POLICY IF EXISTS "Admins can manage all assignments" ON public.project_assignments;
CREATE POLICY "Admins can manage all assignments"
ON public.project_assignments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 6. Claim Job Function
-- This function handles the logic of claiming a job ensuring limits are respected.
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_assignees INTEGER;
  v_current_claims INTEGER;
  v_designer_professions TEXT[];
  v_required_professions TEXT[];
BEGIN
  -- 1. Get project details
  SELECT max_assignees, required_professions INTO v_max_assignees, v_required_professions
  FROM public.client_projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- 2. Check if designer's profession matches
  SELECT professions INTO v_designer_professions
  FROM public.designer_details
  WHERE user_id = auth.uid();

  IF NOT (v_designer_professions && v_required_professions) THEN
    RAISE EXCEPTION 'Your profession does not match the requirements for this job';
  END IF;

  -- 3. Check current claims
  SELECT COUNT(*) INTO v_current_claims
  FROM public.project_assignments
  WHERE project_id = p_project_id;

  IF v_current_claims >= v_max_assignees THEN
    RAISE EXCEPTION 'This job has already been claimed by the maximum number of designers';
  END IF;

  -- 4. Insert assignment
  INSERT INTO public.project_assignments (project_id, designer_id)
  VALUES (p_project_id, auth.uid());

  -- 5. Update project status if needed (e.g., if fully claimed)
  IF v_current_claims + 1 >= v_max_assignees THEN
    UPDATE public.client_projects
    SET status = 'in_progress'
    WHERE id = p_project_id;
  END IF;
END;
$$;

-- 7. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_project(UUID) TO authenticated;

-- 8. Map existing professional_title to professions array (Initial Sync)
-- This is a one-time sync based on common titles found in the system.
UPDATE public.designer_details
SET professions = 
  CASE 
    WHEN professional_title ILIKE '%graphic%' THEN ARRAY['Graphic Designer']
    WHEN professional_title ILIKE '%ui/ux%' OR professional_title ILIKE '%product designer%' THEN ARRAY['UI/UX Designer']
    WHEN professional_title ILIKE '%web dev%' OR professional_title ILIKE '%frontend%' OR professional_title ILIKE '%backend%' THEN ARRAY['Web Developer']
    ELSE ARRAY[]::TEXT[]
  END
WHERE professions = '{}';
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

-- 1. Extend client_projects
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS accepted_designer_id uuid,
  ADD COLUMN IF NOT EXISTS tip_total numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_client_projects_accepted_designer
  ON public.client_projects(accepted_designer_id);

-- 2. project_tips table
CREATE TABLE IF NOT EXISTS public.project_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  designer_id uuid,
  client_email text,
  client_name text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a tip"
  ON public.project_tips FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view tip by id"
  ON public.project_tips FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage all tips"
  ON public.project_tips FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_project_tips_updated
  BEFORE UPDATE ON public.project_tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. designer_details: extra profession flag
ALTER TABLE public.designer_details
  ADD COLUMN IF NOT EXISTS extra_profession_paid boolean NOT NULL DEFAULT false;

-- 4. Trigger: auto-stamp accepted_designer_id when a submission becomes approved
CREATE OR REPLACE FUNCTION public.stamp_accepted_designer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.client_ref IS NOT NULL THEN

    BEGIN
      v_project_id := NEW.client_ref::uuid;
    EXCEPTION WHEN others THEN
      RETURN NEW;
    END;

    UPDATE public.client_projects
       SET accepted_designer_id = NEW.designer_id,
           updated_at = now()
     WHERE id = v_project_id
       AND accepted_designer_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_accepted_designer ON public.submissions;
CREATE TRIGGER trg_stamp_accepted_designer
  AFTER INSERT OR UPDATE OF status ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_accepted_designer();

CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('client','designer','admin')),
  sender_name text,
  sender_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_chat_messages_project ON public.project_chat_messages(project_id, created_at);

ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Designers can view messages on projects where they are the accepted designer
CREATE POLICY "Designer can view their project chat"
  ON public.project_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.accepted_designer_id = auth.uid()
  ));

-- Designers can post as themselves
CREATE POLICY "Designer can post on their project chat"
  ON public.project_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'designer'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.id = project_chat_messages.project_id
        AND cp.accepted_designer_id = auth.uid()
    )
  );

-- Admins manage everything
CREATE POLICY "Admins manage project chat"
  ON public.project_chat_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));

-- ============ profiles: drop broad authenticated SELECT ============
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;

-- ============ designer_details: drop broad authenticated SELECT ============
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboard" ON public.designer_details;

-- ============ Recreate leaderboard views as SECURITY DEFINER (bypass RLS, expose only safe columns) ============
DROP VIEW IF EXISTS public.leaderboard_profiles CASCADE;
CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = off)
AS SELECT id, full_name, username FROM public.profiles;

DROP VIEW IF EXISTS public.leaderboard_designer_details CASCADE;
CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = off)
AS SELECT user_id, professional_title, skills, total_points, monthly_points,
          talent_score, profile_photo_url, experience_level, professions
   FROM public.designer_details;

GRANT SELECT ON public.leaderboard_profiles TO authenticated, anon;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated, anon;

-- ============ project_tips: restrict reads to admins only ============
DROP POLICY IF EXISTS "Anyone can view tip by id" ON public.project_tips;
CREATE POLICY "Admins view all tips" ON public.project_tips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ client_orders: drop broad designer view of unassigned orders ============
DROP POLICY IF EXISTS "Designers can view unassigned paid orders" ON public.client_orders;
DROP POLICY IF EXISTS "Designers can claim orders" ON public.client_orders;

-- ============ project_messages: drop overly broad SELECT/INSERT ============
DROP POLICY IF EXISTS "Users view project messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users send project messages" ON public.project_messages;

-- ============ client_projects: restrict designer view to those with designer role ============
DROP POLICY IF EXISTS "Designers can view pending projects" ON public.client_projects;
CREATE POLICY "Designers can view pending client projects"
ON public.client_projects FOR SELECT TO authenticated
USING (
  status = 'pending'
  AND public.has_role(auth.uid(), 'designer')
);

-- ============ user_badges: enable RLS ============
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges earned"
  ON public.user_badges FOR SELECT
  USING (true);
CREATE POLICY "Admins manage user badges"
  ON public.user_badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ badges: enable RLS ============
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);
CREATE POLICY "Admins manage badge defs"
  ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ system_logs: drop permissive insert policies, restrict to admins ============
DROP POLICY IF EXISTS "Authenticated users can insert system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Clients can insert system logs" ON public.system_logs;
CREATE POLICY "Only admins can insert system logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin'));

-- ============ Function hardening: search_path + revoke anon execute ============
ALTER FUNCTION public.claim_project(uuid) SET search_path = public;
ALTER FUNCTION public.allocate_client_acceptance_points(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_affiliate_commission(text, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM anon;
-- Allow superadmin to view system_logs (in addition to masteradmin)
DROP POLICY IF EXISTS "Only masteradmin can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Restrict user_badges INSERT/UPDATE/DELETE to admins only
CREATE POLICY "Only admins can insert user badges"
ON public.user_badges FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can update user badges"
ON public.user_badges FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can delete user badges"
ON public.user_badges FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Drop overly-broad SELECT policies that expose PII / financial data
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboa" ON public.designer_details;

-- Ensure leaderboard views remain accessible (they're SECURITY DEFINER and expose only safe columns)
GRANT SELECT ON public.leaderboard_profiles TO authenticated, anon;
GRANT SELECT ON public.leaderboard_designer_details TO authenticated, anon;

-- Restrict project_assignments SELECT
DROP POLICY IF EXISTS "Authenticated users can view all project assignments" ON public.project_assignments;

CREATE POLICY "Designers can view their own assignments"
ON public.project_assignments FOR SELECT
TO authenticated
USING (designer_id = auth.uid() OR has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 1. Recreate leaderboard views as SECURITY INVOKER (respect caller's RLS)
DROP VIEW IF EXISTS public.leaderboard_profiles;
DROP VIEW IF EXISTS public.leaderboard_designer_details;

CREATE VIEW public.leaderboard_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, username FROM public.profiles;

CREATE VIEW public.leaderboard_designer_details
WITH (security_invoker = true) AS
SELECT
  user_id,
  professional_title,
  skills,
  total_points,
  monthly_points,
  talent_score,
  profile_photo_url,
  experience_level,
  professions
FROM public.designer_details;

-- Allow anon + authenticated to read leaderboards (no PII fields here)
GRANT SELECT ON public.leaderboard_profiles TO anon, authenticated;
GRANT SELECT ON public.leaderboard_designer_details TO anon, authenticated;

-- 2. Lock down SECURITY DEFINER functions

-- Trigger functions: should never be called via API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_accepted_designer() FROM PUBLIC, anon, authenticated;

-- Internal helpers used by RLS / security_definer chain only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;

-- Admin / service-only functions should NOT be callable from clients
REVOKE ALL ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;

-- claim_project is a designer-initiated action; keep for authenticated, deny anon
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;

-- 1. job_contracts: require designer role
DROP POLICY IF EXISTS "Designers can view active job contracts" ON public.job_contracts;
CREATE POLICY "Designers can view active job contracts"
ON public.job_contracts FOR SELECT
TO authenticated
USING (
  (status = 'active' OR status = 'in_progress')
  AND public.has_role(auth.uid(), 'designer'::app_role)
);

-- 2. client_projects: drop designer SELECT, add marketplace view (non-PII only)
DROP POLICY IF EXISTS "Designers can view pending client projects" ON public.client_projects;

CREATE OR REPLACE VIEW public.marketplace_projects
WITH (security_invoker = false) AS
SELECT
  id,
  title,
  category,
  description,
  budget,
  deadline,
  required_professions,
  max_assignees,
  status,
  created_at
FROM public.client_projects
WHERE status = 'pending';

REVOKE ALL ON public.marketplace_projects FROM PUBLIC, anon;
GRANT SELECT ON public.marketplace_projects TO authenticated;

-- 3. user_badges: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view badges earned" ON public.user_badges;
CREATE POLICY "Authenticated can view badges earned"
ON public.user_badges FOR SELECT
TO authenticated
USING (true);

-- 4. user_roles: restrict DELETE to masteradmin only (was: superadmin OR masteradmin)
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Only masteradmin can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'masteradmin'::app_role));

-- 5. SECURITY DEFINER hardening â€” revoke from end-user roles where not needed
REVOKE EXECUTE ON FUNCTION public.allocate_client_acceptance_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discord_order(text, text, text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_accepted_designer() FROM PUBLIC, anon, authenticated;
-- claim_project: only authenticated designers need it
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;
-- has_role / get_user_role are required inside RLS expressions; keep public execute

DROP VIEW IF EXISTS public.marketplace_projects;

CREATE OR REPLACE FUNCTION public.get_pending_client_projects()
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  description text,
  budget text,
  deadline timestamptz,
  required_professions text[],
  max_assignees integer,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, category, description, budget, deadline,
         required_professions, max_assignees, status, created_at
  FROM public.client_projects
  WHERE status = 'pending'
    AND (
      public.has_role(auth.uid(), 'designer'::app_role)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::app_role)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_pending_client_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_client_projects() TO authenticated;

CREATE TABLE public.promo_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  cta_label text,
  cta_url text,
  collect_email boolean NOT NULL DEFAULT false,
  background_color text,
  accent_color text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_popups_only_one_active
  ON public.promo_popups (is_active)
  WHERE is_active = true;

ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promo"
  ON public.promo_popups FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage promo popups"
  ON public.promo_popups FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_promo_popups_updated_at
  BEFORE UPDATE ON public.promo_popups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.promo_email_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id uuid REFERENCES public.promo_popups(id) ON DELETE SET NULL,
  email text NOT NULL,
  ip text,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_email_signups_unique_per_popup
  ON public.promo_email_signups (popup_id, lower(email));

ALTER TABLE public.promo_email_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit email signups"
  ON public.promo_email_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view email signups"
  ON public.promo_email_signups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins delete email signups"
  ON public.promo_email_signups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'masteradmin'::app_role) OR public.has_role(auth.uid(), 'superadmin'::app_role));
ALTER TABLE public.promo_popups
  ADD COLUMN expiry_date timestamptz;

-- Optional deadline for promo popups so admins can see time remaining in the promo manager.
ALTER TABLE public.promo_popups ADD COLUMN IF NOT EXISTS expiry_date timestamptz;
DROP POLICY IF EXISTS "Authenticated can view badges earned" ON public.user_badges;

CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
-- 1) Platform connections
CREATE TABLE IF NOT EXISTS public.smm_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  account_id text,
  account_name text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  followers_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_platform_connections TO authenticated;
GRANT ALL ON public.smm_platform_connections TO service_role;

ALTER TABLE public.smm_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMM users manage their own connections"
  ON public.smm_platform_connections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all connections"
  ON public.smm_platform_connections FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_smm_platform_connections_updated_at
  BEFORE UPDATE ON public.smm_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_smm_platform_connections_user ON public.smm_platform_connections(user_id);

-- 2) Extend smm_campaign_posts
ALTER TABLE public.smm_campaign_posts
  ADD COLUMN IF NOT EXISTS platform_post_id text,
  ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach integer NOT NULL DEFAULT 0;

-- 3) Storage bucket: smm-media (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('smm-media', 'smm-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "SMM users read own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users upload own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users update own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all smm media" ON storage.objects;

CREATE POLICY "SMM users read own media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users upload own media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users update own media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all smm media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'smm-media' AND (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));

-- 4) Enable realtime on the SMM tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_campaign_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_campaigns;

-- Payout methods
CREATE TABLE public.user_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('mtn','vodafone','airteltigo')),
  phone_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payout_methods TO authenticated;
GRANT ALL ON public.user_payout_methods TO service_role;

ALTER TABLE public.user_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payout methods"
  ON public.user_payout_methods FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all payout methods"
  ON public.user_payout_methods FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE TRIGGER trg_payout_methods_updated
  BEFORE UPDATE ON public.user_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payout_methods_user ON public.user_payout_methods(user_id);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payout_method_id uuid NOT NULL REFERENCES public.user_payout_methods(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount >= 100),
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed')),
  korapay_reference text,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own withdrawals"
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all withdrawals"
  ON public.withdrawals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));

CREATE TRIGGER trg_withdrawals_updated
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.designer_details REPLICA IDENTITY FULL;
ALTER TABLE public.user_payout_methods REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.designer_details; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_payout_methods; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER PUBLICATION supabase_realtime DROP TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_payout_methods;
ALTER PUBLICATION supabase_realtime DROP TABLE public.designer_details;

CREATE POLICY "Anyone can read ads_enabled flag"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key = 'ads_enabled');

GRANT SELECT ON public.system_settings TO anon;

-- 1. Allow authenticated clients to insert their own client_projects
DROP POLICY IF EXISTS "Authenticated clients can post jobs" ON public.client_projects;
CREATE POLICY "Authenticated clients can post jobs"
ON public.client_projects FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- 2. Authenticated clients/designers can view their own/assigned client_projects
DROP POLICY IF EXISTS "Owners and assignees can view client_projects" ON public.client_projects;
CREATE POLICY "Owners and assignees can view client_projects"
ON public.client_projects FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR accepted_designer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = client_projects.id AND pa.designer_id = auth.uid()
  )
);

-- 3. Project-owner client can read/post project chat
DROP POLICY IF EXISTS "Client owner can view project chat" ON public.project_chat_messages;
CREATE POLICY "Client owner can view project chat"
ON public.project_chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Client owner can post project chat" ON public.project_chat_messages;
CREATE POLICY "Client owner can post project chat"
ON public.project_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'client'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.created_by = auth.uid()
  )
);

-- 4. Allow designers to insert their own job_contract_claims (used via RPC)
DROP POLICY IF EXISTS "Designers can self-claim contracts" ON public.job_contract_claims;
CREATE POLICY "Designers can self-claim contracts"
ON public.job_contract_claims FOR INSERT
TO authenticated
WITH CHECK (designer_id = auth.uid());

-- 5. Strengthen claim_project with active-work lock
CREATE OR REPLACE FUNCTION public.claim_project(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max_assignees INTEGER;
  v_current_claims INTEGER;
  v_designer_professions TEXT[];
  v_required_professions TEXT[];
  v_active_count INTEGER;
BEGIN
  -- Block if designer already has an unfinished client project
  SELECT COUNT(*) INTO v_active_count
  FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid()
    AND pa.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You have an active project awaiting Prime Haven approval. Submit it and wait for ph-approval before claiming another.';
  END IF;

  -- Block if designer has an active job contract claim
  SELECT COUNT(*) INTO v_active_count
  FROM public.job_contract_claims jcc
  WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You have an active job contract. Complete it before claiming another job.';
  END IF;

  SELECT max_assignees, required_professions INTO v_max_assignees, v_required_professions
  FROM public.client_projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;

  SELECT professions INTO v_designer_professions
  FROM public.designer_details WHERE user_id = auth.uid();

  IF array_length(v_required_professions, 1) > 0 THEN
    IF NOT (v_designer_professions && v_required_professions) THEN
      RAISE EXCEPTION 'Your profession does not match the requirements for this job';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_current_claims
  FROM public.project_assignments
  WHERE project_id = p_project_id AND status = 'active';

  IF v_current_claims >= COALESCE(v_max_assignees, 1) THEN
    RAISE EXCEPTION 'This job has already been claimed by the maximum number of designers';
  END IF;

  INSERT INTO public.project_assignments (project_id, designer_id, status)
  VALUES (p_project_id, auth.uid(), 'active');

  IF v_current_claims + 1 >= COALESCE(v_max_assignees, 1) THEN
    UPDATE public.client_projects SET status = 'in_progress' WHERE id = p_project_id;
  END IF;
END;
$$;

-- 6. New RPC: claim_job_contract enforces category cap + active lock
CREATE OR REPLACE FUNCTION public.claim_job_contract(p_contract_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_category text;
  v_cap int;
  v_current int;
  v_active int;
BEGIN
  SELECT COUNT(*) INTO v_active FROM public.project_assignments pa
  WHERE pa.designer_id = auth.uid() AND pa.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.client_project_id = pa.project_id
        AND s.designer_id = auth.uid()
        AND s.ph_approved = true
    );
  IF v_active > 0 THEN
    RAISE EXCEPTION 'Finish your current project and wait for Prime Haven approval before claiming another.';
  END IF;

  SELECT COUNT(*) INTO v_active FROM public.job_contract_claims jcc
  WHERE jcc.designer_id = auth.uid() AND jcc.status = 'active';
  IF v_active > 0 THEN
    RAISE EXCEPTION 'You already have an active job contract. Complete it before claiming another.';
  END IF;

  SELECT category INTO v_category FROM public.job_contracts WHERE id = p_contract_id;
  IF v_category IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;

  v_cap := CASE
    WHEN v_category IN (
      'graphic-design','Graphic Design',
      'logo-design','brand-identity','print-design','flyer-design','social-media'
    ) THEN 2
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_current FROM public.job_contract_claims
  WHERE contract_id = p_contract_id AND status = 'active';

  IF v_current >= v_cap THEN
    RAISE EXCEPTION 'This contract has reached the maximum number of designers.';
  END IF;

  INSERT INTO public.job_contract_claims (contract_id, designer_id, status)
  VALUES (p_contract_id, auth.uid(), 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_job_contract(uuid) TO authenticated;

-- 7. Auto-release designer when Prime Haven approves their submission
CREATE OR REPLACE FUNCTION public.release_designer_on_ph_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ph_approved = true AND (OLD.ph_approved IS DISTINCT FROM true) THEN
    IF NEW.client_project_id IS NOT NULL THEN
      UPDATE public.project_assignments
      SET status = 'completed'
      WHERE project_id = NEW.client_project_id
        AND designer_id = NEW.designer_id
        AND status = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_designer_on_ph_approval ON public.submissions;
CREATE TRIGGER trg_release_designer_on_ph_approval
AFTER UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.release_designer_on_ph_approval();

-- ============ client_orders: tighten anon insert ============
DROP POLICY IF EXISTS "Public can create orders" ON public.client_orders;

CREATE POLICY "Public can create orders"
ON public.client_orders
FOR INSERT
TO anon
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(payment_status, 'pending') = 'pending'
  AND COALESCE(price, 0) >= 0
  AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
);

CREATE POLICY "Authenticated users can create orders"
ON public.client_orders
FOR INSERT
TO authenticated
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
);

-- ============ client_projects: tighten anon insert ============
DROP POLICY IF EXISTS "Public can create client projects" ON public.client_projects;

CREATE POLICY "Public can create client projects"
ON public.client_projects
FOR INSERT
TO anon
WITH CHECK (
  created_by IS NULL
  AND client_email IS NOT NULL
  AND client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND title IS NOT NULL
  AND char_length(title) BETWEEN 1 AND 300
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(status, 'pending') = 'pending'
);

-- ============ project_milestones: client + designer SELECT ============
CREATE POLICY "Clients view milestones for their projects"
ON public.project_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_milestones.project_id AND cp.created_by = auth.uid()
  )
);

CREATE POLICY "Designers view milestones for their assigned projects"
ON public.project_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_milestones.project_id AND cp.accepted_designer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = project_milestones.project_id AND pa.designer_id = auth.uid()
  )
);

-- ============ project_deliverables: client + designer SELECT ============
CREATE POLICY "Clients view deliverables for their projects"
ON public.project_deliverables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_deliverables.project_id AND cp.created_by = auth.uid()
  )
);

CREATE POLICY "Designers view deliverables for their assigned projects"
ON public.project_deliverables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_deliverables.project_id AND cp.accepted_designer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = project_deliverables.project_id AND pa.designer_id = auth.uid()
  )
);
