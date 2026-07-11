
-- promo_email_signups: remove permissive anon/authenticated INSERT (writes go through submit-promo-email edge function using service_role)
DROP POLICY IF EXISTS "Public can submit email signups" ON public.promo_email_signups;

-- visitor_analytics: remove permissive anon/authenticated INSERT (writes go through track-visitor edge function using service_role)
DROP POLICY IF EXISTS "Edge functions can insert visitor data" ON public.visitor_analytics;
DROP POLICY IF EXISTS "Authenticated can insert visitor data" ON public.visitor_analytics;
