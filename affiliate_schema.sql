-- ============================================
-- PRIME HAVEN - AFFILIATE SYSTEM SCHEMA
-- ============================================

-- 1. Affiliate Profiles Table
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL UNIQUE,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own affiliate profile" 
    ON public.affiliate_profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate profile" 
    ON public.affiliate_profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 2. Affiliate Referrals (Tracking conversions)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    service_booked TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'paid')),
    commission NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own referrals" 
    ON public.affiliate_referrals FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.affiliate_profiles 
            WHERE affiliate_profiles.id = affiliate_referrals.affiliate_id 
            AND affiliate_profiles.user_id = auth.uid()
        )
    );

-- 3. Affiliate Payout Requests
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their payouts" 
    ON public.affiliate_payouts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.affiliate_profiles 
            WHERE affiliate_profiles.id = affiliate_payouts.affiliate_id 
            AND affiliate_profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Affiliates can request payouts" 
    ON public.affiliate_payouts FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.affiliate_profiles 
            WHERE affiliate_profiles.id = affiliate_payouts.affiliate_id 
            AND affiliate_profiles.user_id = auth.uid()
        )
    );

-- 4. RPC to securely process an affiliate commission (bypasses RLS to insert)
CREATE OR REPLACE FUNCTION process_affiliate_commission(
    p_ref_code TEXT,
    p_client_name TEXT,
    p_service TEXT,
    p_commission NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affiliate_id UUID;
BEGIN
    -- Find the affiliate by their unique referral code
    SELECT id INTO v_affiliate_id 
    FROM public.affiliate_profiles 
    WHERE referral_code = p_ref_code 
    LIMIT 1;

    -- If found, record the successful referral
    IF v_affiliate_id IS NOT NULL THEN
        INSERT INTO public.affiliate_referrals (affiliate_id, client_name, service_booked, commission, status)
        VALUES (v_affiliate_id, p_client_name, p_service, p_commission, 'converted');
    END IF;
END;
$$;
