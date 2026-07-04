
-- 1. client-order-attachments: remove public SELECT, tighten INSERT to orders/* path
DROP POLICY IF EXISTS "client_order_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "client_order_attachments_insert" ON storage.objects;

CREATE POLICY "client_order_attachments_admin_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-order-attachments'
    AND (
      public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    )
  );

-- Uploads are performed by the (possibly anonymous) client submitting an order.
-- Restrict to a specific path prefix so files must live under orders/<ref>/...
CREATE POLICY "client_order_attachments_scoped_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'client-order-attachments'
    AND (storage.foldername(name))[1] = 'orders'
  );

-- 2. job-reference-files: drop public SELECT; require authenticated (bucket is now private)
DROP POLICY IF EXISTS "Anyone can view job reference files" ON storage.objects;

CREATE POLICY "Authenticated users can view job reference files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-reference-files');

-- 3. realtime.messages: replace substring LIKE with exact topic equality
DROP POLICY IF EXISTS "Users can read own topic messages" ON realtime.messages;
DROP POLICY IF EXISTS "Users can send own topic messages" ON realtime.messages;

CREATE POLICY "Users can read own topic messages"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      realtime.topic() = ('user-' || (auth.uid())::text)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    )
  );

CREATE POLICY "Users can send own topic messages"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      realtime.topic() = ('user-' || (auth.uid())::text)
      OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::public.app_role)
    )
  );
