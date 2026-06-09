-- Create a public bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- Anyone can view portfolio images
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-images');

-- Admins can upload portfolio images
CREATE POLICY "Admins can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can update portfolio images
CREATE POLICY "Admins can update portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can delete portfolio images
CREATE POLICY "Admins can delete portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio-images'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);
