
-- ============ testimonials ============
DROP POLICY IF EXISTS "Authenticated users can submit a testimonial" ON public.testimonials;
ALTER TABLE public.testimonials ALTER COLUMN is_visible SET DEFAULT false;

CREATE POLICY "Authenticated users can submit a testimonial"
ON public.testimonials
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND is_visible = false
);

-- ============ project_feedback ============
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.project_feedback;

CREATE POLICY "Project participants can submit feedback"
ON public.project_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'masteradmin'::app_role)
  OR has_role(auth.uid(), 'superadmin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_feedback.project_id
      AND (
        cp.accepted_designer_id = auth.uid()
        OR cp.client_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
  )
);

-- ============ visitor_analytics ============
DROP POLICY IF EXISTS "Authenticated can insert visitor data" ON public.visitor_analytics;

CREATE POLICY "Authenticated can insert own visitor data"
ON public.visitor_analytics
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

-- ============ storage: job-reference-files ============
DROP POLICY IF EXISTS "Authenticated users can view job reference files" ON storage.objects;

CREATE POLICY "Admins and assigned designers can view job reference files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-reference-files'
  AND (
    has_role(auth.uid(), 'masteradmin'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.job_contract_claims jcc
      WHERE jcc.designer_id = auth.uid()
        AND jcc.status = 'active'
        AND jcc.contract_id::text = split_part(storage.objects.name, '/', 1)
    )
  )
);

-- ============ RPC: process_affiliate_commission ============
-- Only trusted server code (service_role edge functions) may credit commissions.
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) TO service_role;
