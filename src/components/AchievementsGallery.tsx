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
  earned?: boolean;
  earned_at?: string;
}

export default function AchievementsGallery() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<ScrumBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [badgesEarned, setBadgesEarned] = useState(0);
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
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;

    try {
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

      const formattedBadges = allBadges?.map(badge => ({
        ...badge,
        earned: badge.user_badges?.length > 0,
        earned_at: badge.user_badges?.[0]?.earned_at
      })) || [];

      const earnedBadges = formattedBadges.filter(b => b.earned);
      const points = earnedBadges.reduce((acc, b) => acc + b.points, 0);

      setBadges(formattedBadges);
      setTotalPoints(points);
      setBadgesEarned(earnedBadges.length);
    } catch (error) {
      console.warn('Error fetching badges (non-critical):', error);
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
                      "p-4 rounded-xl border text-center transition-all",
                      badge.earned
                        ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                        : "bg-gray-50 opacity-60"
                    )}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="font-semibold text-sm text-gray-800">{badge.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {badge.description}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {getCategoryIcon(badge.category)}
                      <span className="text-xs font-medium text-gray-700">{badge.points} pts</span>
                    </div>
                    {badge.earned && (
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        Earned
                      </p>
                    )}
                  </div>
                ))}
              {badges.filter(b => tab === 'all' || (tab === 'earned' ? b.earned : b.category === tab)).length === 0 && (
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
