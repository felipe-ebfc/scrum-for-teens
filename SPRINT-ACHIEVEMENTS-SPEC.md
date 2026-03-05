# Sprint: Achievement System Overhaul
**Assigned to:** Ed (Engineering Lead)
**Requested by:** Felipe & Noah Engineer-Manriquez
**Date:** 2026-03-04
**Branch:** `feat/achievement-overhaul`
**Deploy:** Vercel preview link → Noah final review → merge to main

---

## Context

Noah (co-author, age ~15) tested the achievements tab and said:
> "Some achievements aren't super obvious to me. Like 'Scrum Practitioner: Practice 20 different scrum concepts' — I don't know what that means or how it's measured."

He also didn't know the Scrum Learning Hub counted toward achievements — the connection is invisible.

All 5 changes below are **approved by Felipe**.

---

## Current Architecture

- **`AchievementsGallery.tsx`** — standalone achievements tab
- **`ScrumProgress.tsx`** — progress page with badges section
- **`ScrumLearning.tsx`** — the Scrum Learning Hub (chapter takeaways)
- **`achievements-setup.sql`** — Supabase `scrum_badges` table + 14 seed badges
- **`useBadgeChecker`** hook — award logic (already exists)
- **Supabase tables:** `scrum_badges`, `user_badges`, `user_scrum_progress`, `user_scrum_streaks`

---

## Change 1: Progress Bars on Every Unearned Badge

**Problem:** Locked badges show no progress. Noah has practiced 5 takeaways but "Practice Pro (25)" looks identical to "Scrum Master Jr (50)" — both just greyed out.

**Solution:** Show `X / Y` progress + a progress bar on every unearned badge.

### Data to fetch per requirement_type:

| requirement_type | How to get current value |
|---|---|
| `practice_count` | `user_scrum_progress` → count rows where `practiced_count > 0` |
| `streak_days` | `user_scrum_streaks.longest_streak` (already fetched) |
| `chapters_completed` | `user_scrum_progress` → group by `chapter_number`, count chapters where ALL takeaways practiced |
| `retros_completed` | `user_scrum_progress` table OR localStorage `retrospectives` key |

### UI change in `AchievementsGallery.tsx` and `ScrumProgress.tsx`:

```tsx
// On unearned badges, below the description:
{!badge.earned && (
  <div className="mt-2">
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>{currentProgress} / {badge.requirement_value}</span>
      <span>{Math.round((currentProgress / badge.requirement_value) * 100)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className="bg-purple-500 h-1.5 rounded-full transition-all"
        style={{ width: `${Math.min((currentProgress / badge.requirement_value) * 100, 100)}%` }}
      />
    </div>
  </div>
)}
```

Pass `currentProgress` by looking up the user's stats against each badge's `requirement_type`.

---

## Change 2: "How to Earn" — Clear Action in Every Description

**Problem:** "Practice 25 takeaways" doesn't tell you WHERE or HOW.

**Solution:** Add a `how_to_earn` column to `scrum_badges` table, update all 14 badges.

### SQL migration:

```sql
ALTER TABLE scrum_badges ADD COLUMN IF NOT EXISTS how_to_earn TEXT;

UPDATE scrum_badges SET how_to_earn = 'Go to Scrum Learning Hub → tap any concept → mark it as Practiced' 
  WHERE requirement_type = 'practice_count';

UPDATE scrum_badges SET how_to_earn = 'Open the app every day and practice at least one concept in the Scrum Learning Hub'
  WHERE requirement_type = 'streak_days';

UPDATE scrum_badges SET how_to_earn = 'In Scrum Learning Hub, practice every concept in a chapter'
  WHERE requirement_type = 'chapters_completed';

UPDATE scrum_badges SET how_to_earn = 'Complete a sprint, then tap the Retrospective button at the end'
  WHERE requirement_type = 'retros_completed';
```

### UI change: Show `how_to_earn` as a subtle hint below the description on unearned badges:

```tsx
{!badge.earned && badge.how_to_earn && (
  <p className="text-xs text-purple-500 mt-1 italic">
    💡 {badge.how_to_earn}
  </p>
)}
```

---

## Change 3: Learning Hub → Achievement Connection

**Problem:** Noah had no idea the Learning Hub counted toward badges.

**Solution:** In `ScrumLearning.tsx`, show a small trophy badge next to each chapter that contributes to mastery achievements.

### Where to add in `ScrumLearning.tsx`:

In the chapter header row, after the chapter title, add:

```tsx
{/* Show if chapter contributes to mastery achievements */}
<span className="text-xs text-yellow-600 flex items-center gap-1 ml-2">
  <Trophy className="w-3 h-3" /> Counts toward achievements
</span>
```

Also add a banner at the top of `ScrumLearning.tsx`:

```tsx
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
  <Trophy className="w-4 h-4 text-yellow-600 shrink-0" />
  <p className="text-sm text-yellow-800">
    Practicing concepts here earns you <strong>Achievement badges</strong> and points! 🏆
  </p>
</div>
```

---

## Change 4: Teen-Friendly Badge Names + Descriptions

Current badges are good overall but two need updates:

| Current Name | Current Description | New Name | New Description |
|---|---|---|---|
| `Scrum Master Jr` | Practice 50 takeaways | `Scrum Master Jr` ✅ | Practice 50 concepts in the Learning Hub |
| `Scrum Scholar` | Complete all 23 chapters | `Scrum Legend` | Master every chapter in Scrum for Teens — YOU wrote it, now live it! |
| `Chapter Champion` | Complete all takeaways in 1 chapter | `Chapter Champion` ✅ | Finish every concept in one chapter |

Also add teen energy to the earned state:

```tsx
{badge.earned && (
  <p className="text-xs text-green-600 mt-2 font-bold">
    ✅ You earned this! 🔥
  </p>
)}
```

---

## Change 5: Surprise / Easter Egg Achievements

Add 3 new badges that unlock naturally through normal app use. These feel discoverable.

### SQL to add new badges:

```sql
INSERT INTO scrum_badges (name, description, icon, category, requirement_type, requirement_value, points, how_to_earn)
VALUES
  ('Early Bird',    'Start a sprint before 8 AM',           '🌅', 'milestone', 'early_sprint',      1,  15, 'Create a sprint before 8 AM — early bird gets the Scrum!'),
  ('Comeback Kid',  'Practice after a 3+ day break',        '💪', 'milestone', 'comeback',          1,  20, 'Come back to the Learning Hub after taking a few days off'),
  ('Perfect Sprint','Complete a sprint with 100% velocity', '⚡', 'milestone', 'perfect_sprint',    1,  30, 'Finish a sprint where every task gets done — no leftovers!')
ON CONFLICT DO NOTHING;
```

**Note:** `early_sprint`, `comeback`, and `perfect_sprint` are new `requirement_type` values. Ed needs to add detection logic in `useBadgeChecker` hook for each:

- `early_sprint`: when creating a sprint, check `new Date().getHours() < 8`
- `comeback`: in ScrumLearning, check last practice date > 3 days ago
- `perfect_sprint`: when closing a sprint, check if all tasks are Done

---

## Acceptance Criteria

- [ ] All 14 existing badges show progress bars + `X/Y` count when unearned
- [ ] Every badge shows a `how_to_earn` hint when unearned
- [ ] Scrum Learning Hub has trophy banner + per-chapter achievement callout
- [ ] `Scrum Legend` replaces `Scrum Scholar` in name only (no data migration needed — just UPDATE)
- [ ] 3 new Easter egg badges in DB and triggering correctly
- [ ] `earned` state shows `✅ You earned this! 🔥`
- [ ] All DB queries return correct data (no broken joins)
- [ ] Vercel preview link deployed and working end-to-end
- [ ] No console errors on achievements tab
- [ ] Noah can clearly understand how to earn every badge without explanation

## Files to Touch

1. `src/components/AchievementsGallery.tsx` — progress bars, how_to_earn hints, earned state copy
2. `src/components/ScrumProgress.tsx` — same changes as AchievementsGallery
3. `src/components/ScrumLearning.tsx` — trophy banner + per-chapter callout
4. `src/hooks/useBadgeChecker.ts` — add easter egg detection logic
5. `achievements-setup.sql` — update with migration SQL (for reference)
6. New file: `supabase-migration-achievements-v2.sql` — run in Supabase before deploy

## Branch & Deploy

```bash
git checkout -b feat/achievement-overhaul
# ... make changes ...
git push origin feat/achievement-overhaul
# Vercel auto-deploys preview → send link to Felipe/Noah
```

**Do NOT merge to main.** Publish the preview URL only. Felipe and Noah do final review before merge.
