-- Add talent score columns to designer_details
ALTER TABLE public.designer_details
  ADD COLUMN IF NOT EXISTS talent_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS talent_score_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS talent_score_updated_at timestamp with time zone;

-- talent_score: 0-100 composite score
-- talent_score_breakdown: { quality, acceptance_rate, consistency, revision_efficiency, reliability }
-- talent_score_updated_at: when score was last recalculated