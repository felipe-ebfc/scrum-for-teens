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

export default function ScrumProgress() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ScrumBadge[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalPracticed: 0,
    averageSuccessRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0,
    badgesEarned: 0
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (user) {
      // Delay this fetch - it's lower priority
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
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;

    try {
      // Fetch user's progress stats - non-critical
      const { data: progress } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_progress')
          .select('*')
          .eq('user_id', user?.id),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      // Fetch user's streaks - non-critical
      const { data: streaks } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_streaks')
          .select('*')
          .eq('user_id', user?.id)
          .single(),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      // Fetch all badges with earned status - non-critical
      const { data: allBadges } = await queuedSupabaseQuery(
        () => supabase
          .from('scrum_badges')
          .select(`
            *,
            user_badges!left(earned_at)
          `)
          .order('points', { ascending: true }),
        { maxRetries: 2, critical: false }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      // Calculate stats
      if (progress && progress.length > 0) {
        const totalPracticed = progress.filter(p => p.practiced_count > 0).length;
        const avgSuccess = progress.reduce((acc, p) => {
          const rate = p.practiced_count > 0 ? (p.success_count / p.practiced_count) * 100 : 0;
          return acc + rate;
        }, 0) / (totalPracticed || 1);

        const earnedBadges = allBadges?.filter(b => b.user_badges?.length > 0) || [];
        const totalPoints = earnedBadges.reduce((acc, b) => acc + b.points, 0);

        setStats({
          totalPracticed,
          averageSuccessRate: Math.round(avgSuccess),
          currentStreak: streaks?.current_streak || 0,
          longestStreak: streaks?.longest_streak || 0,
          totalPoints,
          badgesEarned: earnedBadges.length
        });
      }

      // Format badges
      const formattedBadges = allBadges?.map(badge => ({
        ...badge,
        earned: badge.user_badges?.length > 0,
        earned_at: badge.user_badges?.[0]?.earned_at
      })) || [];

      setBadges(formattedBadges);
    } catch (error) {
      console.warn('Error fetching progress (non-critical):', error);
      // Don't show error to user - this is non-critical data
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'practice': return <Target className="w-4 h-4" />;
      case 'consistency': return <Flame className="w-4 h-4" />;
      case 'mastery': return <Star className="w-4 h-4" />;
      case 'milestone': return <Award className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

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
            </TabsList>

            {['all', 'earned', 'practice', 'mastery', 'consistency'].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {badges
                    .filter(b => tab === 'all' || (tab === 'earned' ? b.earned : b.category === tab))
                    .map(badge => (
                      <div
                        key={badge.id}
                        className={cn(
                          "p-4 rounded-lg border text-center transition-all",
                          badge.earned
                            ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                            : "bg-gray-50 opacity-60"
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
                        {badge.earned && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Earned
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
