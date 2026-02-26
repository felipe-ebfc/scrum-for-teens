import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

interface ChapterProgress {
  chapterNumber: number;
  chapterTitle: string;
  totalTakeaways: number;
  practicedTakeaways: number;
  isCompleted: boolean; // true when all takeaways in the chapter have been practiced
}

interface LearningProgressData {
  totalChapters: number;
  completedChapters: number;
  chapters: ChapterProgress[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get learning progress data from the same source of truth as Scrum Learning Hub.
 *
 * Definition of "Completed Chapter":
 * A chapter is considered completed when ALL of its takeaways have been practiced at least once
 * (i.e., practiced_count > 0 for every takeaway in that chapter).
 *
 * This matches the ScrumLearning component's logic where completionRate === 100 means complete.
 */
export function useLearningProgress(): LearningProgressData {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  const fetchProgress = async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) return;

    fetchInProgressRef.current = true;
    setError(null);
    setLoading(true);

    try {
      // Fetch all takeaways from the canonical source (scrum_chapter_takeaways table)
      const { data: takeawaysData, error: takeawaysError } = await queuedSupabaseQuery(
        () =>
          supabase
            .from('scrum_chapter_takeaways')
            .select('id, chapter_number, chapter_title')
            .order('chapter_number', { ascending: true }),
        { maxRetries: 3, critical: false }
      );

      if (!mountedRef.current) return;

      if (takeawaysError) {
        console.warn('Error fetching takeaways for progress:', takeawaysError);
        setError('Failed to load chapter data');
        setLoading(false);
        return;
      }

      // Fetch user's progress if logged in
      let userProgress: any[] = [];
      if (user?.id) {
        const { data: progressData, error: progressError } = await queuedSupabaseQuery(
          () =>
            supabase
              .from('user_scrum_progress')
              .select('takeaway_id, practiced_count')
              .eq('user_id', user.id),
          { maxRetries: 2, critical: false }
        );

        if (!mountedRef.current) return;

        if (progressError) {
          console.warn('Error fetching user progress (non-critical):', progressError);
        } else {
          userProgress = progressData || [];
        }
      }

      // Create a set of practiced takeaway IDs for quick lookup
      const practicedTakeawayIds = new Set(
        userProgress
          .filter((p) => p.practiced_count > 0)
          .map((p) => String(p.takeaway_id))
      );

      // Group takeaways by chapter and calculate progress
      const chapterMap = new Map<number, ChapterProgress>();

      (takeawaysData || []).forEach((takeaway: any) => {
        const chapterNum = takeaway.chapter_number;

        if (!chapterMap.has(chapterNum)) {
          chapterMap.set(chapterNum, {
            chapterNumber: chapterNum,
            chapterTitle: takeaway.chapter_title,
            totalTakeaways: 0,
            practicedTakeaways: 0,
            isCompleted: false,
          });
        }

        const chapter = chapterMap.get(chapterNum)!;
        chapter.totalTakeaways++;

        if (practicedTakeawayIds.has(String(takeaway.id))) {
          chapter.practicedTakeaways++;
        }
      });

      // A chapter is completed when ALL takeaways have been practiced
      const chaptersArray = Array.from(chapterMap.values())
        .map((chapter) => ({
          ...chapter,
          isCompleted:
            chapter.totalTakeaways > 0 && chapter.practicedTakeaways === chapter.totalTakeaways,
        }))
        .sort((a, b) => a.chapterNumber - b.chapterNumber);

      if (mountedRef.current) {
        setChapters(chaptersArray);
        setLoading(false);
      }
    } catch (err) {
      console.warn('Error in fetchProgress:', err);
      if (mountedRef.current) {
        setError('Failed to load learning progress');
        setLoading(false);
      }
    } finally {
      fetchInProgressRef.current = false;
    }
  };

  // ✅ Single effect (with your “tiny improvement” delay)
  useEffect(() => {
    mountedRef.current = true;

    const t = setTimeout(() => {
      fetchProgress();
    }, 200);

    return () => {
      mountedRef.current = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter((c) => c.isCompleted).length;

  return {
    totalChapters,
    completedChapters,
    chapters,
    loading,
    error,
    refetch: fetchProgress,
  };
}
