-- =============================================================================
-- supabase-migration-achievements-v2.sql
-- Achievement System Overhaul — Sprint 2026-03-04
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/apfjnmptxwzjqgymwckd/sql
-- =============================================================================

-- ── Change 2: Add how_to_earn column ────────────────────────────────────────
ALTER TABLE scrum_badges ADD COLUMN IF NOT EXISTS how_to_earn TEXT;

UPDATE scrum_badges
SET how_to_earn = 'Go to Scrum Learning Hub → tap any concept → mark it as Practiced'
WHERE requirement_type = 'practice_count';

UPDATE scrum_badges
SET how_to_earn = 'Open the app every day and practice at least one concept in the Scrum Learning Hub'
WHERE requirement_type = 'streak_days';

UPDATE scrum_badges
SET how_to_earn = 'In Scrum Learning Hub, practice every concept in a chapter'
WHERE requirement_type = 'chapters_completed';

UPDATE scrum_badges
SET how_to_earn = 'Complete a sprint, then tap the Retrospective button at the end'
WHERE requirement_type = 'retros_completed';

-- ── Change 4: Teen-friendly badge names & descriptions ───────────────────────
UPDATE scrum_badges
SET description = 'Practice 50 concepts in the Learning Hub'
WHERE name = 'Scrum Master Jr';

UPDATE scrum_badges
SET name        = 'Scrum Legend',
    description = 'Master every chapter in Scrum for Teens — YOU wrote it, now live it!'
WHERE name = 'Scrum Scholar';

UPDATE scrum_badges
SET description = 'Finish every concept in one chapter'
WHERE name = 'Chapter Champion';

-- ── Change 5: Easter egg badges ─────────────────────────────────────────────
INSERT INTO scrum_badges (name, description, icon, category, requirement_type, requirement_value, points, how_to_earn)
VALUES
  ('Early Bird',
   'Start a sprint before 8 AM',
   '🌅', 'milestone', 'early_sprint', 1, 15,
   'Create a sprint before 8 AM — early bird gets the Scrum!'),

  ('Comeback Kid',
   'Practice after a 3+ day break',
   '💪', 'milestone', 'comeback', 1, 20,
   'Come back to the Learning Hub after taking a few days off'),

  ('Perfect Sprint',
   'Complete a sprint with 100% velocity',
   '⚡', 'milestone', 'perfect_sprint', 1, 30,
   'Finish a sprint where every task gets done — no leftovers!')

ON CONFLICT DO NOTHING;
