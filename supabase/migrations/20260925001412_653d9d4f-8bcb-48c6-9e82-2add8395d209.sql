-- Access rules for the private 'screening-assets' bucket (onboarding video and other screening media).
-- The bucket stays private: only Prime Haven admins can manage its files, and applicants
-- receive a short-lived signed link from the token-gated portal function.

CREATE POLICY "Admins can upload screening assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'screening-assets'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);

CREATE POLICY "Admins can read screening assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'screening-assets'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);

CREATE POLICY "Admins can update screening assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'screening-assets'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'screening-assets'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);

CREATE POLICY "Admins can delete screening assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'screening-assets'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);