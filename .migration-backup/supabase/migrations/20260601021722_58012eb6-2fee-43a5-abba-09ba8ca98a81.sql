-- 1) Platform connections
CREATE TABLE IF NOT EXISTS public.smm_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  account_id text,
  account_name text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  followers_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.smm_platform_connections TO authenticated;
GRANT ALL ON public.smm_platform_connections TO service_role;

ALTER TABLE public.smm_platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMM users manage their own connections"
  ON public.smm_platform_connections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all connections"
  ON public.smm_platform_connections FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_smm_platform_connections_updated_at
  BEFORE UPDATE ON public.smm_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_smm_platform_connections_user ON public.smm_platform_connections(user_id);

-- 2) Extend smm_campaign_posts
ALTER TABLE public.smm_campaign_posts
  ADD COLUMN IF NOT EXISTS platform_post_id text,
  ADD COLUMN IF NOT EXISTS likes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach integer NOT NULL DEFAULT 0;

-- 3) Storage bucket: smm-media (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('smm-media', 'smm-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "SMM users read own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users upload own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users update own media" ON storage.objects;
DROP POLICY IF EXISTS "SMM users delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all smm media" ON storage.objects;

CREATE POLICY "SMM users read own media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users upload own media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users update own media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "SMM users delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'smm-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all smm media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'smm-media' AND (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));

-- 4) Enable realtime on the SMM tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_campaign_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_campaigns;