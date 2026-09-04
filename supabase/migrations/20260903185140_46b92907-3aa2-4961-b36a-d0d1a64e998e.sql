CREATE TABLE IF NOT EXISTS public.seo_index_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  site_url text NOT NULL,
  sitemap_url text,
  deployment_signature text,
  total_urls integer NOT NULL DEFAULT 0,
  indexed_count integer NOT NULL DEFAULT 0,
  issue_count integer NOT NULL DEFAULT 0,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger text NOT NULL DEFAULT 'automatic',
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS seo_index_reports_created_at_idx ON public.seo_index_reports (created_at DESC);

GRANT SELECT ON public.seo_index_reports TO authenticated;
GRANT ALL ON public.seo_index_reports TO service_role;

ALTER TABLE public.seo_index_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view indexing reports" ON public.seo_index_reports;
CREATE POLICY "Admins can view indexing reports"
ON public.seo_index_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin'::app_role)
  OR public.has_role(auth.uid(), 'masteradmin'::app_role)
);
