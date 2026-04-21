-- ============================================
-- PRIME HAVEN - AFFILIATE SYSTEM SCHEMA V2
-- ============================================

CREATE TABLE IF NOT EXISTS public.marketing_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    asset_url TEXT NOT NULL,
    asset_type TEXT DEFAULT 'image' CHECK (asset_type IN ('image', 'document', 'copy')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view marketing assets" 
    ON public.marketing_assets FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage marketing assets" 
    ON public.marketing_assets FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('superadmin', 'masteradmin')
        )
    );
