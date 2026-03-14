
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
