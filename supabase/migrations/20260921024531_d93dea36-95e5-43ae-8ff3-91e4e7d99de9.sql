CREATE POLICY "Admins can read applicant files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'applicant-files'
  AND (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'))
);