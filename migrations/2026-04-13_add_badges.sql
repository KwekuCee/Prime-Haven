-- Migration: Add badges and user_badges tables

-- Badges: master list of badge definitions (editable by admin)
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  icon_name text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User badges: records when a user unlocked a badge
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT NOW(),
  source text, -- e.g. 'submission_approved', 'points_threshold'
  meta jsonb DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

-- Example seed entries (insert only if not present)
INSERT INTO badges (key, title, description, icon_name, criteria, sort_order)
SELECT 'first_blood', 'First Blood', 'First approved submission', 'Target', '{"type":"threshold","metric":"approved_count","value":1}', 10
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE key = 'first_blood');

INSERT INTO badges (key, title, description, icon_name, criteria, sort_order)
SELECT 'rising_star', 'Rising Star', 'Reached 100 total points', 'Star', '{"type":"threshold","metric":"total_points","value":100}', 20
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE key = 'rising_star');

INSERT INTO badges (key, title, description, icon_name, criteria, sort_order)
SELECT 'elite_earner', 'Elite Earner', 'Reached 500 total points', 'Crown', '{"type":"threshold","metric":"total_points","value":500}', 30
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE key = 'elite_earner');

INSERT INTO badges (key, title, description, icon_name, criteria, sort_order)
SELECT 'quality_master', 'Quality Master', 'Talent Score over 90', 'Medal', '{"type":"threshold","metric":"talent_score","value":90}', 40
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE key = 'quality_master');

INSERT INTO badges (key, title, description, icon_name, criteria, sort_order)
SELECT 'grind_machine', 'Grind Machine', '10+ approved designs', 'Flame', '{"type":"threshold","metric":"approved_count","value":10}', 50
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE key = 'grind_machine');

-- Example query: award badge if criteria met
-- This is a sample SQL to check and insert a badge for a user (run in server-side code)
-- Replace $1 with user_id and $2 with badge key
--
-- WITH b AS (
--   SELECT id, criteria FROM badges WHERE key = $2
-- ), metrics AS (
--   SELECT
--     (SELECT COUNT(*) FROM submissions WHERE designer_id = $1 AND ph_approved = true) AS approved_count,
--     (SELECT COALESCE(SUM(points_awarded),0) FROM designers WHERE id = $1) AS total_points,
--     (SELECT talent_score FROM designers WHERE id = $1) AS talent_score
-- )
-- INSERT INTO user_badges (user_id, badge_id, source, meta)
-- SELECT $1, b.id, 'auto-check', jsonb_build_object('metrics', (SELECT row_to_json(metrics.*) FROM metrics))
-- FROM b, metrics
-- WHERE (
--   (b.criteria->>'type' = 'threshold' AND (
--       (b.criteria->>'metric' = 'approved_count' AND (metrics).approved_count >= (b.criteria->>'value')::int)
--    OR (b.criteria->>'metric' = 'total_points' AND (metrics).total_points >= (b.criteria->>'value')::int)
--    OR (b.criteria->>'metric' = 'talent_score' AND (metrics).talent_score >= (b.criteria->>'value')::int)
--   ))
-- )
-- ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Note: adapt the metrics subquery to match your schema (designers/submissions tables).
