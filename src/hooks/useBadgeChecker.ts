/**
 * useBadgeChecker
 *
 * Provides a `checkBadges(triggeredEvent?)` function that:
 *  1. Fetches all scrum_badges + the user's already-earned user_badges
 *  2. Calculates the user's current stats from Supabase + localStorage
 *  3. Awards (inserts into user_badges) any newly-qualified badges
 *  4. Shows a sonner toast for each newly-earned badge
 *
 * Call checkBadges() after:
 *  - A practice is recorded            (ScrumLearning)
 *  - A retrospective is saved          (SprintRetrospective)
 *  - App mounts with a logged-in user  (AppLayout — catch-up check)
 *
 * Call checkBadges('early_sprint') when a sprint is created before 8 AM.
 * Call checkBadges('perfect_sprint') when a sprint is closed at 100% velocity.
 * 'comeback' is auto-detected from streak data when practicing.
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
  averageSuccessRate: number; // avg (success_count/practiced_count*100) across practiced concepts
  triggeredEvents: Set<string>; // event-based easter egg badges
}

async function fetchUserStats(
  userId: string,
  triggeredEvent?: string
): Promise<UserStats> {
  const triggeredEvents = new Set<string>();
  if (triggeredEvent) triggeredEvents.add(triggeredEvent);

  // ── practice count ──────────────────────────────────────────────────────────
  const { data: progressRows } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('user_scrum_progress')
        .select('takeaway_id, practiced_count, success_count')
        .eq('user_id', userId),
    { maxRetries: 2, critical: false }
  );

  const practicedRows = (progressRows ?? []).filter((r: any) => r.practiced_count > 0);
  const practicedIds = new Set(practicedRows.map((r: any) => String(r.takeaway_id)));
  const practiceCount = practicedIds.size;

  const averageSuccessRate = practicedRows.length > 0
    ? Math.round(
        practicedRows.reduce((acc: number, r: any) => {
          return acc + ((r.success_count ?? 0) / r.practiced_count) * 100;
        }, 0) / practicedRows.length
      )
    : 0;

  // ── streak + comeback detection ─────────────────────────────────────────────
  const { data: streakRow } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('user_scrum_streaks')
        .select('longest_streak, last_practice_date')
        .eq('user_id', userId)
        .single(),
    { maxRetries: 2, critical: false }
  );
  const longestStreak: number = (streakRow as any)?.longest_streak ?? 0;

  // Auto-detect comeback: last practice was 3+ days ago
  if ((streakRow as any)?.last_practice_date) {
    const lastDate = new Date((streakRow as any).last_practice_date);
    const daysDiff = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff >= 3) {
      triggeredEvents.add('comeback');
    }
  }

  // ── chapters completed ──────────────────────────────────────────────────────
  let chaptersCompleted = 0;
  const { data: allTakeaways } = await queuedSupabaseQuery(
    () =>
      supabase
        .from('scrum_chapter_takeaways')
        .select('id, chapter_number'),
    { maxRetries: 2, critical: false }
  );

  if (allTakeaways && allTakeaways.length > 0) {
    const chapterMap = new Map<number, string[]>();
    for (const t of allTakeaways as any[]) {
      const key = t.chapter_number;
      if (!chapterMap.has(key)) chapterMap.set(key, []);
      chapterMap.get(key)!.push(String(t.id));
    }
    for (const [, ids] of chapterMap) {
      if (ids.length > 0 && ids.every((id) => practicedIds.has(id))) {
        chaptersCompleted++;
      }
    }
  }

  // ── retros (localStorage) ───────────────────────────────────────────────────
  const retrosCompleted = getRetroCount();

  return { practiceCount, longestStreak, chaptersCompleted, retrosCompleted, averageSuccessRate, triggeredEvents };
}

function meetsRequirement(
  requirementType: string,
  requirementValue: number,
  stats: UserStats
): boolean {
  switch (requirementType) {
    case 'practice_count':    return stats.practiceCount     >= requirementValue;
    case 'streak_days':       return stats.longestStreak     >= requirementValue;
    case 'chapters_completed': return stats.chaptersCompleted >= requirementValue;
    case 'retros_completed':  return stats.retrosCompleted   >= requirementValue;
    case 'success_rate':      return stats.averageSuccessRate >= requirementValue;
    // Easter egg / event-based badges
    case 'early_sprint':      return stats.triggeredEvents.has('early_sprint');
    case 'comeback':          return stats.triggeredEvents.has('comeback');
    case 'perfect_sprint':    return stats.triggeredEvents.has('perfect_sprint');
    default:                  return false;
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useBadgeChecker() {
  const { user } = useAuth();
  const checkInProgressRef = useRef(false);

  /**
   * @param triggeredEvent  Optional event type for easter egg badges:
   *   'early_sprint'   — call when a sprint is created before 8 AM
   *   'perfect_sprint' — call when a sprint closes at 100% velocity
   *   'comeback'       — auto-detected; no need to pass explicitly
   */
  const checkBadges = useCallback(async (triggeredEvent?: string) => {
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

      // 4. Fetch current user stats (comeback auto-detected inside)
      const stats = await fetchUserStats(user.id, triggeredEvent);

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
        .select();

      if (insertError) {
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
      console.warn('Badge check failed (non-critical):', err);
    } finally {
      checkInProgressRef.current = false;
    }
  }, [user]);

  return { checkBadges };
}
