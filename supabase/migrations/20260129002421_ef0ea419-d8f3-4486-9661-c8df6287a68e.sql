-- Create storage bucket for submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf']
);

-- RLS Policies for submissions bucket
-- Designers can upload to their own folder
CREATE POLICY "Designers can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Designers can view their own files
CREATE POLICY "Designers can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Designers can delete their own files
CREATE POLICY "Designers can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'submissions'
  AND (
    public.has_role(auth.uid(), 'superadmin'::app_role) 
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);