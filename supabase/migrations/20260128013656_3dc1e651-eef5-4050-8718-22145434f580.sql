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