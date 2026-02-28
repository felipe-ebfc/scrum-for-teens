-- =============================================================================
-- achievements-setup.sql
-- Scrum for Teens — Achievements System (one-time Supabase setup)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/apfjnmptxwzjqgymwckd/sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

-- scrum_badges: master list of all possible badges
CREATE TABLE IF NOT EXISTS scrum_badges (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  icon             TEXT        NOT NULL,         -- emoji
  category         TEXT        NOT NULL CHECK (category IN ('practice', 'consistency', 'mastery', 'milestone')),
  requirement_type TEXT        NOT NULL,         -- e.g. 'practice_count', 'streak_days', 'chapters_completed', 'retros_completed'
  requirement_value INTEGER    NOT NULL,
  points           INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- user_badges: which badges each user has earned
CREATE TABLE IF NOT EXISTS user_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_id   UUID        NOT NULL REFERENCES scrum_badges ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

ALTER TABLE scrum_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges  ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the badge catalogue
DROP POLICY IF EXISTS "scrum_badges_select" ON scrum_badges;
CREATE POLICY "scrum_badges_select"
  ON scrum_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can read their own earned badges
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
CREATE POLICY "user_badges_select"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert (award) their own badges
DROP POLICY IF EXISTS "user_badges_insert" ON user_badges;
CREATE POLICY "user_badges_insert"
  ON user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. SEED — BADGES
-- -----------------------------------------------------------------------------

INSERT INTO scrum_badges (name, description, icon, category, requirement_type, requirement_value, points)
VALUES
  -- ── Practice badges (based on user_scrum_progress.practiced_count totals) ──
  ('First Steps',       'Practice your first takeaway',            '🌱', 'practice',    'practice_count',    1,  5),
  ('Getting Warmed Up', 'Practice 10 takeaways',                   '🔥', 'practice',    'practice_count',   10, 15),
  ('Practice Pro',      'Practice 25 takeaways',                   '💪', 'practice',    'practice_count',   25, 30),
  ('Scrum Master Jr',   'Practice 50 takeaways',                   '🏆', 'practice',    'practice_count',   50, 50),

  -- ── Consistency badges (based on user_scrum_streaks.longest_streak) ──
  ('Three-peat',   '3-day practice streak',   '⭐', 'consistency', 'streak_days',  3, 10),
  ('On Fire',      '7-day practice streak',   '🔥', 'consistency', 'streak_days',  7, 25),
  ('Unstoppable',  '14-day practice streak',  '💎', 'consistency', 'streak_days', 14, 50),
  ('Legendary',    '30-day practice streak',  '👑', 'consistency', 'streak_days', 30, 100),

  -- ── Mastery badges (based on chapters where all takeaways are practiced) ──
  ('Chapter Champion', 'Complete all takeaways in 1 chapter',   '📖', 'mastery', 'chapters_completed',  1, 20),
  ('Bookworm',         'Complete takeaways in 5 chapters',       '📚', 'mastery', 'chapters_completed',  5, 40),
  ('Scrum Scholar',    'Complete all 23 chapters',               '🎓', 'mastery', 'chapters_completed', 23, 75),

  -- ── Milestone badges (based on retrospective count from localStorage) ──
  ('First Retro',    'Complete your first retrospective',  '🎯', 'milestone', 'retros_completed',  1, 10),
  ('Retro Regular',  'Complete 5 retrospectives',          '🔄', 'milestone', 'retros_completed',  5, 25),
  ('Retro Master',   'Complete 10 retrospectives',         '💡', 'milestone', 'retros_completed', 10, 50)

ON CONFLICT DO NOTHING;
