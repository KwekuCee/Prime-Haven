
-- Create storage bucket for job contract reference files
INSERT INTO storage.buckets (id, name, public) VALUES ('job-reference-files', 'job-reference-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files
CREATE POLICY "Admins can upload job reference files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-reference-files' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'masteradmin'))
));

-- Allow admins to delete files
CREATE POLICY "Admins can delete job reference files"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-reference-files' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('superadmin', 'masteradmin'))
));

-- Allow public read access for reference files
CREATE POLICY "Anyone can view job reference files"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-reference-files');
