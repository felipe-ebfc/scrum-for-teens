-- Fix achievement badge issues reported by Noah
-- 1. Clarify Three-peat: make it explicit this requires CONSECUTIVE days
-- 2. Change Consistent Learner from duplicate streak_days to practice_days_total (5 total days)

-- Three-peat: update description and how_to_earn to make "consecutive" crystal clear
UPDATE scrum_badges
SET
  description   = '3 consecutive days of practice',
  how_to_earn   = 'Open the app and practice on 3 consecutive days.'
WHERE name = 'Three-peat';

-- Consistent Learner: differentiate from Three-peat by tracking total practice days instead
UPDATE scrum_badges
SET
  requirement_type  = 'practice_days_total',
  requirement_value = 5,
  description       = 'Practice on 5 different days'
WHERE name = 'Consistent Learner';
