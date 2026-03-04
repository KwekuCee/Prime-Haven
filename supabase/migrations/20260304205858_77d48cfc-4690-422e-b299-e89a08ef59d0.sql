-- Create a public bucket for team member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Team photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-photos');

-- Allow admins to upload
CREATE POLICY "Admins can upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-photos'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);

-- Allow admins to delete
CREATE POLICY "Admins can delete team photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-photos'
  AND (
    public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);