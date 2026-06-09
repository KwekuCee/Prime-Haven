
CREATE POLICY "Anyone can read ads_enabled flag"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key = 'ads_enabled');

GRANT SELECT ON public.system_settings TO anon;
