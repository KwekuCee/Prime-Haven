
-- Create storage bucket for blog images (cover images and inline content images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Admins can upload blog images
CREATE POLICY "Admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' 
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Admins can delete blog images
CREATE POLICY "Admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images' 
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role) 
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);
