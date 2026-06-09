
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
