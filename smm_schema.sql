-- ============================================
-- PRIME HAVEN - SOCIAL MEDIA MANAGER SCHEMA
-- Generated: 2026-05-28
-- ============================================

-- Table 1: Campaigns — one campaign per social media contract/goal
CREATE TABLE public.smm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.job_contracts(id) ON DELETE SET NULL,
  campaign_name text NOT NULL,
  client_name text,
  platforms text[] NOT NULL DEFAULT '{}', -- e.g. ['instagram', 'facebook', 'tiktok', 'x', 'linkedin']
  goal text, -- 'awareness', 'engagement', 'conversion', 'leads', 'sales'
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'archived'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.smm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMMs can manage their own campaigns"
  ON public.smm_campaigns FOR ALL
  USING (auth.uid() = smm_user_id)
  WITH CHECK (auth.uid() = smm_user_id);

CREATE POLICY "Admins can view all smm campaigns"
  ON public.smm_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_smm_campaigns_updated_at
  BEFORE UPDATE ON public.smm_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Table 2: Campaign Posts — individual post deliverables per campaign
CREATE TABLE public.smm_campaign_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.smm_campaigns(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'instagram', 'facebook', 'tiktok', 'x', 'linkedin'
  post_type text NOT NULL DEFAULT 'post', -- 'post', 'story', 'reel', 'ad', 'thread'
  caption text,
  media_url text,
  scheduled_at timestamptz,
  posted_at timestamptz,
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'cancelled'
  engagement_data jsonb DEFAULT '{}', -- { likes, comments, shares, reach, impressions }
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.smm_campaign_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMMs can manage their own campaign posts"
  ON public.smm_campaign_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.smm_campaigns c
      WHERE c.id = campaign_id AND c.smm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smm_campaigns c
      WHERE c.id = campaign_id AND c.smm_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all smm posts"
  ON public.smm_campaign_posts FOR SELECT
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER update_smm_campaign_posts_updated_at
  BEFORE UPDATE ON public.smm_campaign_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Table 3: Platform Analytics Snapshots — weekly metrics per platform per campaign
CREATE TABLE public.smm_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.smm_campaigns(id) ON DELETE CASCADE,
  platform text NOT NULL,
  week_start date NOT NULL,
  followers_gained integer DEFAULT 0,
  total_reach integer DEFAULT 0,
  total_impressions integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  total_posts integer DEFAULT 0,
  top_post_url text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, platform, week_start)
);
ALTER TABLE public.smm_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SMMs can manage their own analytics"
  ON public.smm_analytics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.smm_campaigns c
      WHERE c.id = campaign_id AND c.smm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smm_campaigns c
      WHERE c.id = campaign_id AND c.smm_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all smm analytics"
  ON public.smm_analytics FOR SELECT
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Indexes for fast lookups
CREATE INDEX idx_smm_campaigns_user ON public.smm_campaigns(smm_user_id);
CREATE INDEX idx_smm_campaigns_contract ON public.smm_campaigns(contract_id);
CREATE INDEX idx_smm_posts_campaign ON public.smm_campaign_posts(campaign_id, status);
CREATE INDEX idx_smm_analytics_campaign ON public.smm_analytics(campaign_id, week_start DESC);
