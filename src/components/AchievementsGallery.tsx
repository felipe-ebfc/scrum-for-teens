import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Flame, Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

interface ScrumBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  how_to_earn?: string;
  earned?: boolean;
  earned_at?: string;
}

interface UserProgressStats {
  practiceCount: number;
  longestStreak: number;
  chaptersCompleted: number;
  retrosCompleted: number;
  averageSuccessRate: number;
}

// localStorage key for retrospectives
const RETRO_STORAGE_KEY = 'scrum-teens-retrospectives';

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

/** Map a badge's requirement_type to the user's current numeric value */
function getProgressValue(
  requirementType: string,
  stats: UserProgressStats
): number {
  switch (requirementType) {
    case 'practice_count':     return stats.practiceCount;
    case 'streak_days':        return stats.longestStreak;
    case 'chapters_completed': return stats.chaptersCompleted;
    case 'retros_completed':   return stats.retrosCompleted;
    case 'success_rate':       return stats.averageSuccessRate;
    // Event-based easter eggs: 0 or 1 (awarded when triggered)
    case 'early_sprint':
    case 'comeback':
    case 'perfect_sprint':
      return 0;
    default:
      return 0;
  }
}

export default function AchievementsGallery() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ScrumBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
  const [userStats, setUserStats] = useState<UserProgressStats>({
    practiceCount: 0,
    longestStreak: 0,
    chaptersCompleted: 0,
    retrosCompleted: 0,
    averageSuccessRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (user) {
      const fetchTimeout = setTimeout(() => {
        fetchBadges();
      }, 300);

      return () => {
        mountedRef.current = false;
        clearTimeout(fetchTimeout);
      };
    } else {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  const fetchBadges = async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      // Fetch badges + earned status
      const { data: allBadges } = await queuedSupabaseQuery(
        () => supabase
          .from('scrum_badges')
          .select('*, user_badges!left(earned_at)')
          .order('points', { ascending: true }),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Fetch user progress for progress bars
      const { data: progressRows } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_progress')
          .select('takeaway_id, practiced_count, success_count, chapter_number')
          .eq('user_id', user!.id),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      const { data: streakRow } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_streaks')
          .select('longest_streak')
          .eq('user_id', user!.id)
          .single(),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Calculate practiceCount
      const practicedIds = new Set(
        (progressRows ?? [])
          .filter((r: any) => r.practiced_count > 0)
          .map((r: any) => String(r.takeaway_id))
      );

      // Calculate chaptersCompleted
      let chaptersCompleted = 0;
      const { data: allTakeaways } = await queuedSupabaseQuery(
        () => supabase
          .from('scrum_chapter_takeaways')
          .select('id, chapter_number'),
        { maxRetries: 2, critical: false }
      );
      if (allTakeaways && allTakeaways.length > 0) {
        const chapterMap = new Map<number, string[]>();
        for (const t of allTakeaways as any[]) {
          if (!chapterMap.has(t.chapter_number)) chapterMap.set(t.chapter_number, []);
          chapterMap.get(t.chapter_number)!.push(String(t.id));
        }
        for (const [, ids] of chapterMap) {
          if (ids.length > 0 && ids.every((id) => practicedIds.has(id))) {
            chaptersCompleted++;
          }
        }
      }

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Compute average success rate
      const practicedRows = (progressRows ?? []).filter((r: any) => r.practiced_count > 0);
      const avgSuccessRate = practicedRows.length > 0
        ? Math.round(
            practicedRows.reduce((acc: number, r: any) => {
              return acc + ((r.success_count ?? 0) / r.practiced_count) * 100;
            }, 0) / practicedRows.length
          )
        : 0;

      const stats: UserProgressStats = {
        practiceCount: practicedIds.size,
        longestStreak: (streakRow as any)?.longest_streak ?? 0,
        chaptersCompleted,
        retrosCompleted: getRetroCount(),
        averageSuccessRate: avgSuccessRate,
      };
      setUserStats(stats);

      // Format badges
      const formattedBadges: ScrumBadge[] = allBadges?.map(badge => ({
        ...badge,
        earned: badge.user_badges?.length > 0,
        earned_at: badge.user_badges?.[0]?.earned_at,
      })) || [];

      const earnedBadges = formattedBadges.filter(b => b.earned);
      const points = earnedBadges.reduce((acc, b) => acc + b.points, 0);

      setBadges(formattedBadges);
      setTotalPoints(points);
      setBadgesEarned(earnedBadges.length);
    } catch (error) {
      console.warn('Error fetching badges (non-critical):', error);
    } finally {
      if (mountedRef.current) setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'practice':    return <Target className="w-4 h-4" />;
      case 'consistency': return <Flame className="w-4 h-4" />;
      case 'mastery':     return <Star className="w-4 h-4" />;
      case 'milestone':   return <Award className="w-4 h-4" />;
      default:            return <Trophy className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">All Achievements</h3>
          <Trophy className="text-yellow-500" size={28} />
        </div>
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  const tabs = ['all', 'earned', 'practice', 'mastery', 'consistency', 'milestone'];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">All Achievements</h3>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalPoints} points • {badgesEarned} badges
          </Badge>
          <Trophy className="text-yellow-500" size={28} />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="earned">Earned</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges
                .filter(b =>
                  tab === 'all'
                    ? true
                    : tab === 'earned'
                    ? b.earned
                    : b.category === tab
                )
                .map(badge => {
                  const currentProgress = getProgressValue(badge.requirement_type, userStats);
                  const pct = Math.min(
                    Math.round((currentProgress / badge.requirement_value) * 100),
                    100
                  );
                  const isEventBased = ['early_sprint', 'comeback', 'perfect_sprint'].includes(
                    badge.requirement_type
                  );
                  const isPercentage = badge.requirement_type?.includes('success_rate');

                  return (
                    <div
                      key={badge.id}
                      className={cn(
                        "p-4 rounded-xl border text-center transition-all",
                        badge.earned
                          ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                          : "bg-gray-50 opacity-70"
                      )}
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <h4 className="font-semibold text-sm text-gray-800">{badge.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{badge.description}</p>

                      <div className="flex items-center justify-center gap-2 mt-2">
                        {getCategoryIcon(badge.category)}
                        <span className="text-xs font-medium text-gray-700">{badge.points} pts</span>
                      </div>

                      {/* Earned state */}
                      {badge.earned && (
                        <p className="text-xs text-green-600 mt-2 font-bold">
                          ✅ You earned this! 🔥
                        </p>
                      )}

                      {/* Unearned: how_to_earn hint */}
                      {!badge.earned && badge.how_to_earn && (
                        <p className="text-xs text-purple-500 mt-1 italic text-left">
                          💡 {badge.how_to_earn}
                        </p>
                      )}

                      {/* Unearned: progress bar (skip event-based easter eggs) */}
                      {!badge.earned && !isEventBased && (
                        <div className="mt-2 text-left">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>
                              {currentProgress}{isPercentage ? '%' : ''} / {badge.requirement_value}{isPercentage ? '%' : ''}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Event-based: show mystery hint */}
                      {!badge.earned && isEventBased && (
                        <p className="text-xs text-gray-400 mt-2 italic">
                          🔒 Keep playing to unlock!
                        </p>
                      )}
                    </div>
                  );
                })}
              {badges.filter(b =>
                tab === 'all'
                  ? true
                  : tab === 'earned'
                  ? b.earned
                  : b.category === tab
              ).length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No achievements in this category yet.
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
