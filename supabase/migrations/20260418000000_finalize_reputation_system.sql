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
