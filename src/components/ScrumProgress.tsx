import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Flame, Star, TrendingUp, Award } from 'lucide-react';
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

interface ProgressStats {
  totalPracticed: number;
  averageSuccessRate: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  badgesEarned: number;
}

interface UserProgressStats {
  practiceCount: number;
  longestStreak: number;
  chaptersCompleted: number;
  retrosCompleted: number;
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

function getProgressValue(
  requirementType: string,
  stats: UserProgressStats
): number {
  switch (requirementType) {
    case 'practice_count':     return stats.practiceCount;
    case 'streak_days':        return stats.longestStreak;
    case 'chapters_completed': return stats.chaptersCompleted;
    case 'retros_completed':   return stats.retrosCompleted;
    case 'early_sprint':
    case 'comeback':
    case 'perfect_sprint':
      return 0;
    default:
      return 0;
  }
}

export default function ScrumProgress() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ScrumBadge[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalPracticed: 0,
    averageSuccessRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    badgesEarned: 0,
  });
  const [userProgressStats, setUserProgressStats] = useState<UserProgressStats>({
    practiceCount: 0,
    longestStreak: 0,
    chaptersCompleted: 0,
    retrosCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (user) {
      const fetchTimeout = setTimeout(() => {
        fetchProgressData();
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

  const fetchProgressData = async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;

    try {
      // Fetch user's progress stats
      const { data: progress } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_progress')
          .select('takeaway_id, practiced_count, success_count, chapter_number')
          .eq('user_id', user?.id),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Fetch streaks
      const { data: streaks } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_streaks')
          .select('*')
          .eq('user_id', user?.id)
          .single(),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Fetch all badges with earned status
      const { data: allBadges } = await queuedSupabaseQuery(
        () => supabase
          .from('scrum_badges')
          .select('*, user_badges!left(earned_at)')
          .order('points', { ascending: true }),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) { fetchInProgressRef.current = false; return; }

      // Calculate chaptersCompleted for progress bars
      const practicedIds = new Set(
        (progress ?? [])
          .filter((r: any) => r.practiced_count > 0)
          .map((r: any) => String(r.takeaway_id))
      );

      let chaptersCompleted = 0;
      const { data: allTakeaways } = await queuedSupabaseQuery(
        () => supabase.from('scrum_chapter_takeaways').select('id, chapter_number'),
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

      const pStats: UserProgressStats = {
        practiceCount: practicedIds.size,
        longestStreak: streaks?.longest_streak ?? 0,
        chaptersCompleted,
        retrosCompleted: getRetroCount(),
      };
      setUserProgressStats(pStats);

      // Calculate dashboard stats
      if (progress && progress.length > 0) {
        const totalPracticed = progress.filter((p: any) => p.practiced_count > 0).length;
        const avgSuccess = progress.reduce((acc: number, p: any) => {
          const rate = p.practiced_count > 0 ? (p.success_count / p.practiced_count) * 100 : 0;
          return acc + rate;
        }, 0) / (totalPracticed || 1);

        const earnedBadges = allBadges?.filter((b: any) => b.user_badges?.length > 0) || [];
        const totalPoints = earnedBadges.reduce((acc: number, b: any) => acc + b.points, 0);

        setStats({
          totalPracticed,
          averageSuccessRate: Math.round(avgSuccess),
          currentStreak: streaks?.current_streak || 0,
          longestStreak: streaks?.longest_streak || 0,
          totalPoints,
          badgesEarned: earnedBadges.length,
        });
      }

      // Format badges
      const formattedBadges: ScrumBadge[] = allBadges?.map((badge: any) => ({
        ...badge,
        earned: badge.user_badges?.length > 0,
        earned_at: badge.user_badges?.[0]?.earned_at,
      })) || [];

      setBadges(formattedBadges);
    } catch (error) {
      console.warn('Error fetching progress (non-critical):', error);
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
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const tabs = ['all', 'earned', 'practice', 'mastery', 'consistency', 'milestone'];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concepts Practiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPracticed}</div>
            <Progress value={(stats.totalPracticed / 30) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageSuccessRate}%</div>
            <Progress value={stats.averageSuccessRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {stats.currentStreak} <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {stats.longestStreak} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Achievements</span>
            <Badge variant="secondary">
              {stats.totalPoints} points • {stats.badgesEarned} badges
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
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
                      const currentProgress = getProgressValue(badge.requirement_type, userProgressStats);
                      const pct = Math.min(
                        Math.round((currentProgress / badge.requirement_value) * 100),
                        100
                      );
                      const isEventBased = ['early_sprint', 'comeback', 'perfect_sprint'].includes(
                        badge.requirement_type
                      );

                      return (
                        <div
                          key={badge.id}
                          className={cn(
                            "p-4 rounded-lg border text-center transition-all",
                            badge.earned
                              ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                              : "bg-gray-50 opacity-70"
                          )}
                        >
                          <div className="text-3xl mb-2">{badge.icon}</div>
                          <h4 className="font-semibold text-sm">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {badge.description}
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            {getCategoryIcon(badge.category)}
                            <span className="text-xs font-medium">{badge.points} pts</span>
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

                          {/* Unearned: progress bar */}
                          {!badge.earned && !isEventBased && (
                            <div className="mt-2 text-left">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{currentProgress} / {badge.requirement_value}</span>
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

                          {/* Event-based: mystery hint */}
                          {!badge.earned && isEventBased && (
                            <p className="text-xs text-gray-400 mt-2 italic">
                              🔒 Keep playing to unlock!
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
