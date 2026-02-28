# Achievements System — Setup Guide

## Quick Start (One-Time Database Setup)

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/apfjnmptxwzjqgymwckd/sql)
2. Copy and paste the contents of **`achievements-setup.sql`** (in the repo root)
3. Click **Run**

That's it. The tables, RLS policies, and badge seeds are all in that one file.

---

## What Gets Created

### Tables

| Table | Purpose |
|-------|---------|
| `scrum_badges` | Master catalogue of all 14 badges (name, icon, category, requirement) |
| `user_badges` | Which badges each user has earned, with timestamps |

### Row-Level Security

- **`scrum_badges`** — any authenticated user can read all badges (the catalogue is public)
- **`user_badges`** — users can only read and insert their own rows

---

## Badge Catalogue

### 🎯 Practice Badges
Earned based on the total number of **distinct takeaways practiced at least once** (rows in `user_scrum_progress` where `practiced_count > 0`).

| Badge | Icon | Requirement | Points |
|-------|------|-------------|--------|
| First Steps | 🌱 | Practice 1 takeaway | 5 |
| Getting Warmed Up | 🔥 | Practice 10 takeaways | 15 |
| Practice Pro | 💪 | Practice 25 takeaways | 30 |
| Scrum Master Jr | 🏆 | Practice 50 takeaways | 50 |

### 🔥 Consistency Badges
Earned based on **longest streak ever** (from `user_scrum_streaks.longest_streak`). Because streaks can break, we use longest ever, so earned badges are never lost.

| Badge | Icon | Requirement | Points |
|-------|------|-------------|--------|
| Three-peat | ⭐ | 3-day streak | 10 |
| On Fire | 🔥 | 7-day streak | 25 |
| Unstoppable | 💎 | 14-day streak | 50 |
| Legendary | 👑 | 30-day streak | 100 |

### 📚 Mastery Badges
Earned based on **chapters fully completed** — every takeaway in the chapter practiced at least once.

| Badge | Icon | Requirement | Points |
|-------|------|-------------|--------|
| Chapter Champion | 📖 | 1 complete chapter | 20 |
| Bookworm | 📚 | 5 complete chapters | 40 |
| Scrum Scholar | 🎓 | All 23 chapters | 75 |

### 🎖️ Milestone Badges
Earned based on **retrospectives saved in localStorage** (the retro feature uses local storage).

| Badge | Icon | Requirement | Points |
|-------|------|-------------|--------|
| First Retro | 🎯 | 1 retrospective | 10 |
| Retro Regular | 🔄 | 5 retrospectives | 25 |
| Retro Master | 💡 | 10 retrospectives | 50 |

---

## How the Awarding Logic Works

The core logic lives in **`src/hooks/useBadgeChecker.ts`**.

### `useBadgeChecker()` hook
Returns a single `checkBadges()` function. Call it after any action that might unlock a badge.

### What `checkBadges()` does

1. **Fetches all badges** from `scrum_badges`
2. **Fetches already-earned badges** for the current user from `user_badges`
3. **Calculates live stats:**
   - `practice_count` — counts distinct takeaways with `practiced_count > 0`
   - `streak_days` — reads `longest_streak` from `user_scrum_streaks`
   - `chapters_completed` — cross-references `scrum_chapter_takeaways` + `user_scrum_progress` to count fully-complete chapters
   - `retros_completed` — counts entries in localStorage key `scrum-teens-retrospectives`
4. **Awards any newly qualified badges** — bulk-inserts into `user_badges` (Supabase UNIQUE constraint prevents duplicates)
5. **Shows a sonner toast** for each newly earned badge

### Where it's called

| Trigger | File | When |
|---------|------|------|
| Practice recorded | `ScrumLearning.tsx` | After `submitPractice()` succeeds |
| Retro saved | `SprintRetrospective.tsx` | After `createRetro()` saves to localStorage |
| App load (catch-up) | `AppLayout.tsx` | 1.5s after user is confirmed logged in |

### Non-critical design
All badge operations are wrapped in try/catch. If Supabase is slow or unreachable, badge checking fails silently — it never blocks the user or surfaces an error.

---

## Viewing Achievements

Users can view their full badge gallery in the **Achievements** tab in the app. The `AchievementsGallery` component queries `scrum_badges` with a left-join on `user_badges` to show earned vs. locked badges, total points, and filter by category.

---

## Troubleshooting

**Badges not appearing?**
- Make sure the SQL was run in Supabase — the tables must exist
- Check the browser console for any Supabase errors
- Confirm the user is logged in (RLS requires authentication)

**Wrong badge counts?**
- Practice count comes from `user_scrum_progress` — only rows with `practiced_count > 0` count
- Retro count comes from `localStorage` — badges check the device the user is currently on
- Streak uses `longest_streak`, not `current_streak` — breaking a streak doesn't remove consistency badges
