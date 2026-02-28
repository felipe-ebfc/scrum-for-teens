/**
 * useBadgeChecker
 *
 * Provides a `checkBadges()` function that:
 *  1. Fetches all scrum_badges + the user's already-earned user_badges
 *  2. Calculates the user's current stats from Supabase + localStorage
 *  3. Awards (inserts into user_badges) any newly-qualified badges
 *  4. Shows a sonner toast for each newly-earned badge
 *
 * Call checkBadges() after:
 *  - A practice is recorded  (ScrumLearning)
 *  - A retrospective is saved (SprintRetrospective)
 *  - App mounts with a logged-in user (AppLayout — catch-up check)
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

// localStorage key used by useRetrospectives
const RETRO_STORAGE_KEY = 'scrum-teens-retrospectives';

// ── helpers ──────────────────────────────────────────────────────────────────

function getRetroCount(): number {
  try {
    const raw = localStorage.getItem(RETRO_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

interface UserStats {
  practiceCount: number;     // distinct takeaways practiced at least once
  longestStreak: number;     // from user_scrum_streaks.longest_streak
  chaptersCompleted: number; // chapters where every takeaway has been practiced
  retrosCompleted: number;   // from localStorage
}

async function fetchUserStats(userId: string): Promise<UserStats> {
  // ── practice count ──────────────────────────────────────────────────────────
  const { data: progressRows } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('user_scrum_progress')
        .select('takeaway_id, practiced_count')
        .eq('user_id', userId),
    { maxRetries: 2, critical: false }
  );

  const practicedIds = new Set(
    (progressRows ?? [])
      .filter((r: any) => r.practiced_count > 0)
      .map((r: any) => String(r.takeaway_id))
  );
  const practiceCount = practicedIds.size;

  // ── streak ──────────────────────────────────────────────────────────────────
  const { data: streakRow } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('user_scrum_streaks')
        .select('longest_streak')
        .eq('user_id', userId)
        .single(),
    { maxRetries: 2, critical: false }
  );
  const longestStreak: number = (streakRow as any)?.longest_streak ?? 0;

  // ── chapters completed ──────────────────────────────────────────────────────
  // We need the full takeaway list to know which chapters are "complete"
  let chaptersCompleted = 0;
  const { data: allTakeaways } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('scrum_chapter_takeaways')
        .select('id, chapter_number'),
    { maxRetries: 2, critical: false }
  );

  if (allTakeaways && allTakeaways.length > 0) {
    // Group takeaway IDs by chapter
    const chapterMap = new Map<number, string[]>();
    for (const t of allTakeaways as any[]) {
      const key = t.chapter_number;
      if (!chapterMap.has(key)) chapterMap.set(key, []);
      chapterMap.get(key)!.push(String(t.id));
    }

    // A chapter is complete when EVERY takeaway in it has been practiced
    for (const [, ids] of chapterMap) {
      if (ids.length > 0 && ids.every((id) => practicedIds.has(id))) {
        chaptersCompleted++;
      }
    }
  }

  // ── retros (localStorage) ───────────────────────────────────────────────────
  const retrosCompleted = getRetroCount();

  return { practiceCount, longestStreak, chaptersCompleted, retrosCompleted };
}

function meetsRequirement(
  requirementType: string,
  requirementValue: number,
  stats: UserStats
): boolean {
  switch (requirementType) {
    case 'practice_count':    return stats.practiceCount    >= requirementValue;
    case 'streak_days':       return stats.longestStreak    >= requirementValue;
    case 'chapters_completed': return stats.chaptersCompleted >= requirementValue;
    case 'retros_completed':  return stats.retrosCompleted  >= requirementValue;
    default:                  return false;
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useBadgeChecker() {
  const { user } = useAuth();
  // Guard against concurrent checks (e.g. rapid practice submissions)
  const checkInProgressRef = useRef(false);

  const checkBadges = useCallback(async () => {
    if (!user?.id) return;
    if (checkInProgressRef.current) return;

    checkInProgressRef.current = true;

    try {
      // 1. Fetch full badge catalogue
      const { data: allBadges } = await queuedSupabaseQuery(
        () => supabase.from('scrum_badges').select('*'),
        { maxRetries: 2, critical: false }
      );
      if (!allBadges || allBadges.length === 0) return;

      // 2. Fetch already-earned badge IDs for this user
      const { data: earnedRows } = await queuedSupabaseQuery(
        () =>
          supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', user.id),
        { maxRetries: 2, critical: false }
      );
      const earnedIds = new Set(
        (earnedRows ?? []).map((r: any) => String(r.badge_id))
      );

      // 3. Identify unearned badges
      const unearnedBadges = (allBadges as any[]).filter(
        (b) => !earnedIds.has(String(b.id))
      );
      if (unearnedBadges.length === 0) return;

      // 4. Fetch current user stats
      const stats = await fetchUserStats(user.id);

      // 5. Award any newly qualified badges
      const newlyEarned: any[] = [];
      for (const badge of unearnedBadges) {
        if (meetsRequirement(badge.requirement_type, badge.requirement_value, stats)) {
          newlyEarned.push(badge);
        }
      }

      if (newlyEarned.length === 0) return;

      // Insert all at once (UNIQUE constraint handles duplicates gracefully)
      const inserts = newlyEarned.map((b) => ({
        user_id: user.id,
        badge_id: b.id,
        earned_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('user_badges')
        .insert(inserts)
        .select(); // triggers RLS check

      if (insertError) {
        // If it's just a duplicate-key conflict, that's fine — skip silently
        if (!insertError.message?.includes('duplicate') &&
            !insertError.code?.includes('23505')) {
          console.warn('Badge insert error:', insertError.message);
        }
        return;
      }

      // 6. Notify user for each newly earned badge
      for (const badge of newlyEarned) {
        toast.success(
          `${badge.icon} Badge Unlocked: ${badge.name}`,
          {
            description: `${badge.description} · +${badge.points} pts`,
            duration: 5000,
          }
        );
      }
    } catch (err) {
      // Badge checking is non-critical — never surface errors to the user
      console.warn('Badge check failed (non-critical):', err);
    } finally {
      checkInProgressRef.current = false;
    }
  }, [user]);

  return { checkBadges };
}
