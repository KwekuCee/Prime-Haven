DROP POLICY IF EXISTS "Anyone can view marketing assets" ON public.marketing_assets;
CREATE POLICY "Signed-in users can view marketing assets" ON public.marketing_assets
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 5 AND 254
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND is_active = true
    AND unsubscribed_at IS NULL
  );

-- Public buckets serve files via public URLs without SELECT policies; these only control listing.
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Team photos are publicly accessible" ON storage.objects;

CREATE POLICY "Owners and admins can list profile pictures" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-pictures' AND (owner_id = (select auth.uid())::text
    OR public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "Admins can list public site images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('email-assets','portfolio-images','blog-images','team-photos')
    AND (owner_id = (select auth.uid())::text
      OR public.has_role(auth.uid(), 'masteradmin') OR public.has_role(auth.uid(), 'superadmin')));