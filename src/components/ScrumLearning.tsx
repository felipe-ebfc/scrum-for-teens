import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Zap, 
  Users, 
  Lightbulb, 
  CheckCircle2, 
  Circle, 
  TrendingUp,
  Eye,
  RefreshCw,
  Rocket,
  Award,
  Calendar,
  MessageCircle,
  Flag,
  Compass,
  Shield,
  Puzzle,
  Heart,
  Globe,
  Trophy,
  ClipboardCheck,
  GraduationCap,
  Sunrise
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

interface Takeaway {
  id: string;
  chapter_title: string;
  takeaway: string;
  chapter_number: number;
  practiced?: boolean;
  success_rate?: number;
  practice_count?: number;
}

interface Chapter {
  number: number;
  title: string;
  takeaways: Takeaway[];
  icon: React.ReactNode;
  color: string;
  completionRate?: number;
}

const ScrumLearning: React.FC = () => {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [practiceDialog, setPracticeDialog] = useState<{open: boolean; takeaway?: Takeaway}>({ open: false });
  const [practiceResult, setPracticeResult] = useState<'success' | 'partial' | 'failed' | ''>('');
  const [practiceNotes, setPracticeNotes] = useState('');
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  // Unique icons for each chapter - colorful and meaningful
  const chapterIcons: { [key: number]: { icon: React.ReactNode; color: string } } = {
    1: { icon: <Target size={20} />, color: 'bg-blue-500' },           // Getting Started / Goals
    2: { icon: <Zap size={20} />, color: 'bg-purple-500' },            // Energy / Sprints
    3: { icon: <Users size={20} />, color: 'bg-green-500' },           // Team / Collaboration
    4: { icon: <BookOpen size={20} />, color: 'bg-orange-500' },       // Learning / Backlog
    5: { icon: <Lightbulb size={20} />, color: 'bg-pink-500' },        // Ideas / Planning
    6: { icon: <Calendar size={20} />, color: 'bg-indigo-500' },       // Time Management / Scheduling
    7: { icon: <Sparkles size={20} />, color: 'bg-yellow-500' },       // Daily Standups / Magic
    8: { icon: <Eye size={20} />, color: 'bg-cyan-500' },              // Sprint Review / Visibility
    9: { icon: <RefreshCw size={20} />, color: 'bg-rose-500' },        // Retrospective / Improvement
    10: { icon: <TrendingUp size={20} />, color: 'bg-emerald-500' },   // Growth / Progress
    11: { icon: <Rocket size={20} />, color: 'bg-violet-500' },        // Launch / Delivery
    12: { icon: <Award size={20} />, color: 'bg-amber-500' },          // Achievement / Mastery
    13: { icon: <MessageCircle size={20} />, color: 'bg-teal-500' },   // Communication
    14: { icon: <Flag size={20} />, color: 'bg-red-500' },             // Milestones / Goals
    15: { icon: <Compass size={20} />, color: 'bg-sky-500' },          // Direction / Navigation
    16: { icon: <Shield size={20} />, color: 'bg-slate-500' },         // Quality / Protection
    17: { icon: <Puzzle size={20} />, color: 'bg-fuchsia-500' },       // Problem Solving
    18: { icon: <Heart size={20} />, color: 'bg-pink-600' },           // Passion / Care
    19: { icon: <Globe size={20} />, color: 'bg-blue-600' },           // Social Studies
    20: { icon: <Trophy size={20} />, color: 'bg-yellow-600' },        // Extracurricular Activities
    21: { icon: <ClipboardCheck size={20} />, color: 'bg-green-600' }, // Test Preparation
    22: { icon: <GraduationCap size={20} />, color: 'bg-purple-600' }, // College Applications
    23: { icon: <Sunrise size={20} />, color: 'bg-orange-600' },       // Reflection
  };




  useEffect(() => {
    mountedRef.current = true;

    if (user) {
      // Delay this fetch - it's lower priority
      const fetchTimeout = setTimeout(() => {
        fetchTakeaways();
      }, 400);

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

  const fetchTakeaways = async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;

    try {
      console.log('Fetching takeaways for user:', user?.id);
      
      // Fetch takeaways - this is the main content, so it's critical
      const { data: takeawaysData, error: takeawaysError } = await queuedSupabaseQuery(
        () => supabase
          .from('scrum_chapter_takeaways')
          .select('*')
          .order('chapter_number', { ascending: true })
          .order('id', { ascending: true }),
        { maxRetries: 3, critical: false }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      if (takeawaysError) {
        console.warn('Error fetching takeaways:', takeawaysError);
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }
      
      console.log('Fetched takeaways:', takeawaysData?.length || 0);

      // Fetch user's progress if logged in - non-critical
      let userProgress: any[] = [];
      if (user) {
        const { data: progressData, error: progressError } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_progress')
            .select('*')
            .eq('user_id', user.id),
          { maxRetries: 2, critical: false }
        );

        if (!mountedRef.current) {
          fetchInProgressRef.current = false;
          return;
        }
        
        if (progressError) {
          console.warn('Error fetching progress (non-critical):', progressError);
        } else {
          userProgress = progressData || [];
          console.log('Fetched user progress:', userProgress.length, 'records');
        }
      }

      // Group takeaways by chapter with progress info
      const groupedData = takeawaysData?.reduce((acc: { [key: number]: Chapter }, item: any) => {
        const progress = userProgress.find(p => String(p.takeaway_id) === String(item.id));
        
        if (!acc[item.chapter_number]) {
          const iconData = chapterIcons[item.chapter_number] || { icon: <BookOpen size={20} />, color: 'bg-gray-500' };
          acc[item.chapter_number] = {
            number: item.chapter_number,
            title: item.chapter_title,
            takeaways: [],
            icon: iconData.icon,
            color: iconData.color,
            completionRate: 0
          };
        }
        
        const takeaway: Takeaway = {
          ...item,
          practiced: progress?.practiced_count > 0,
          practice_count: progress?.practiced_count || 0,
          success_rate: progress?.practiced_count > 0 
            ? Math.round((progress.success_count / progress.practiced_count) * 100)
            : 0
        };
        
        acc[item.chapter_number].takeaways.push(takeaway);
        return acc;
      }, {});

      // Calculate completion rates
      Object.values(groupedData || {}).forEach((chapter: Chapter) => {
        const practiced = chapter.takeaways.filter(t => t.practiced).length;
        chapter.completionRate = Math.round((practiced / chapter.takeaways.length) * 100);
      });

      const chaptersArray = Object.values(groupedData || {}) as Chapter[];
      console.log('Processed chapters:', chaptersArray.length);
      setChapters(chaptersArray);
      
      // Set default expanded chapter: first incomplete chapter (not 100% complete)
      // Completed chapters (100%) default to collapsed
      const firstIncompleteChapter = chaptersArray.find(
        (chapter: Chapter) => chapter.completionRate !== 100
      );
      setExpandedChapter(firstIncompleteChapter ? firstIncompleteChapter.number : null);
      

      if (chaptersArray.length === 0) {
        toast({
          title: "No Data Found",
          description: "Please run the database setup scripts to populate the Scrum learning content.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.warn('Error in fetchTakeaways (non-critical):', error);
      // Don't show error toast for network issues
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  };

  const handlePractice = async (takeaway: Takeaway) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to track your practice progress",
        variant: "destructive"
      });
      return;
    }
    
    // Load existing practice data if available
    if (takeaway.practiced) {
      try {
        const { data: existing } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('takeaway_id', takeaway.id)
            .single(),
          { maxRetries: 2, critical: false }
        );
        
        if (existing) {
          setPracticeNotes(existing.notes || '');
          // Set last practice result based on recent success rate
          const recentSuccessRate = existing.practiced_count > 0 
            ? (existing.success_count / existing.practiced_count) * 100 
            : 0;
          
          if (recentSuccessRate >= 80) {
            setPracticeResult('success');
          } else if (recentSuccessRate >= 40) {
            setPracticeResult('partial');
          } else {
            setPracticeResult('failed');
          }
        }
      } catch (error) {
        console.warn('Error loading existing practice data:', error);
      }
    } else {
      setPracticeResult('');
      setPracticeNotes('');
    }
    
    setPracticeDialog({ open: true, takeaway });
  };

  const submitPractice = async () => {
    if (!practiceDialog.takeaway || !practiceResult || !user) return;

    try {
      console.log('Submitting practice for takeaway:', practiceDialog.takeaway.id);
      const successValue = practiceResult === 'success' ? 1 : practiceResult === 'partial' ? 0.5 : 0;
      
      // Check if progress exists
      const { data: existing, error: existingError } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('takeaway_id', practiceDialog.takeaway!.id)
          .single(),
        { maxRetries: 2, critical: false }
      );

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing progress:', existingError);
        throw existingError;
      }

      if (existing) {
        console.log('Updating existing progress:', existing.id);
        // Update existing progress
        const { error: updateError } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_progress')
            .update({
              practiced_count: existing.practiced_count + 1,
              success_count: existing.success_count + successValue,
              last_practiced_at: new Date().toISOString(),
              notes: practiceNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id),
          { maxRetries: 2, critical: true }
        );
        
        if (updateError) {
          console.error('Error updating progress:', updateError);
          throw updateError;
        }
        console.log('Successfully updated progress');
      } else {
        console.log('Creating new progress record');
        // Create new progress
        const { error: insertError } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_progress')
            .insert({
              user_id: user.id,
              chapter_number: practiceDialog.takeaway!.chapter_number,
              takeaway_id: practiceDialog.takeaway!.id,
              practiced_count: 1,
              success_count: successValue,
              last_practiced_at: new Date().toISOString(),
              notes: practiceNotes
            }),
          { maxRetries: 2, critical: true }
        );
        
        if (insertError) {
          console.error('Error inserting progress:', insertError);
          throw insertError;
        }
        console.log('Successfully created new progress record');
      }

      // Update streak
      await updateStreak();
      
      toast({
        title: "Practice Recorded!",
        description: "Keep up the great work! Your progress has been saved.",
      });

      setPracticeDialog({ open: false });
      setPracticeResult('');
      setPracticeNotes('');
      
      // Refresh data to show changes immediately
      console.log('Refreshing takeaways data...');
      fetchTakeaways();
    } catch (error: any) {
      console.error('Error recording practice:', error);
      toast({
        title: "Error",
        description: `Failed to record practice: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const updateStreak = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: streak, error: streakError } = await queuedSupabaseQuery(
        () => supabase
          .from('user_scrum_streaks')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        { maxRetries: 2, critical: false }
      );

      if (streakError && streakError.code !== 'PGRST116') {
        throw streakError;
      }

      if (streak) {
        const lastPractice = new Date(streak.last_practice_date);
        const daysDiff = Math.floor((new Date().getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));
        
        let newStreak = streak.current_streak;
        if (daysDiff === 1) {
          newStreak = streak.current_streak + 1;
        } else if (daysDiff > 1) {
          newStreak = 1;
        }

        const { error: updateError } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_streaks')
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, streak.longest_streak),
              last_practice_date: today,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id),
          { maxRetries: 2, critical: false }
        );
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await queuedSupabaseQuery(
          () => supabase
            .from('user_scrum_streaks')
            .insert({
              user_id: user.id,
              current_streak: 1,
              longest_streak: 1,
              last_practice_date: today
            }),
          { maxRetries: 2, critical: false }
        );
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.warn('Error updating streak (non-critical):', error);
    }
  };

  const toggleChapter = (chapterNumber: number) => {
    setExpandedChapter(expandedChapter === chapterNumber ? null : chapterNumber);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
            <BookOpen className="text-white" size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Scrum Learning Hub</h1>
        <p className="text-lg text-gray-600">Master Scrum concepts from the book - Your guide to crushing goals!</p>
      </div>
      
      <div className="space-y-4">
        {chapters.map((chapter) => (
          <Card 
            key={chapter.number}
            className="overflow-hidden transition-all duration-300 hover:shadow-lg border-2"
          >
            <div
              onClick={() => toggleChapter(chapter.number)}
              className="cursor-pointer p-6 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${chapter.color} text-white rounded-lg shadow-md`}>
                    {chapter.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Chapter {chapter.number}
                    </h2>
                    <p className="text-gray-600 font-medium">{chapter.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {chapter.completionRate !== undefined && chapter.completionRate > 0 && (
                    <Badge variant={chapter.completionRate === 100 ? "default" : "secondary"}>
                      {chapter.completionRate}% complete
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500 font-medium">
                    {chapter.takeaways.length} takeaways
                  </span>
                  {expandedChapter === chapter.number ? 
                    <ChevronUp className="text-gray-400" size={24} /> : 
                    <ChevronDown className="text-gray-400" size={24} />
                  }
                </div>
              </div>
            </div>

            {expandedChapter === chapter.number && (
              <CardContent className="p-6 bg-gradient-to-b from-white to-gray-50">
                <div className="space-y-4">
                  {chapter.takeaways.map((takeaway, index) => (
                    <div 
                      key={takeaway.id}
                      className={`group relative flex gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                        takeaway.practiced 
                          ? 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-md' 
                          : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
                      }`}
                      onClick={() => handlePractice(takeaway)}
                    >
                       <div className="flex-shrink-0">
                         <div
                           className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                             takeaway.practiced 
                               ? 'bg-green-500 shadow-lg' 
                               : 'border-2 border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50'
                           }`}
                         >
                           {takeaway.practiced ? (
                             <CheckCircle2 className="w-5 h-5 text-white" />
                           ) : (
                             <Circle className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
                           )}
                         </div>
                       </div>
                       <div className="flex-1">
                         <p className={`leading-relaxed ${
                           takeaway.practiced ? 'text-gray-800 font-medium' : 'text-gray-700'
                         }`}>
                           {takeaway.takeaway}
                         </p>
                         {takeaway.practiced && (
                           <div className="mt-2 flex items-center gap-3 text-xs">
                             <Badge variant="outline" className="text-xs bg-white border-green-300">
                               Practiced {takeaway.practice_count}x
                             </Badge>
                             {takeaway.success_rate !== undefined && (
                               <Badge 
                                 variant={takeaway.success_rate >= 80 ? "default" : "secondary"}
                                 className="text-xs"
                               >
                                 {takeaway.success_rate}% success
                               </Badge>
                             )}
                           </div>
                         )}
                       </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePractice(takeaway);
                        }}
                        size="sm"
                        variant={takeaway.practiced ? "default" : "outline"}
                        className={`transition-all ${
                          takeaway.practiced 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {takeaway.practiced ? 'Update Practice' : 'Mark as Practiced'}
                      </Button>
                    </div>
                  ))}

                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
        <div className="flex items-start gap-3">
          <Sparkles className="text-purple-500 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-gray-800 mb-2">Pro Tip!</h3>
            <p className="text-gray-600">
              Review these takeaways regularly to reinforce your Scrum knowledge. 
              Apply these concepts to your daily tasks and watch your productivity soar!
            </p>
          </div>
        </div>
      </div>

      {/* Practice Dialog */}
      <Dialog open={practiceDialog.open} onOpenChange={(open) => setPracticeDialog({ open, takeaway: practiceDialog.takeaway })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {practiceDialog.takeaway?.practiced ? 'Update Your Practice' : 'Record Your Practice'}
            </DialogTitle>
            <DialogDescription>
              {practiceDialog.takeaway?.practiced 
                ? 'Update your notes and track another practice session'
                : 'How did applying this Scrum concept go?'
              }
            </DialogDescription>
          </DialogHeader>
          
          {practiceDialog.takeaway && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{practiceDialog.takeaway.takeaway}</p>
              </div>
              
              <div className="space-y-3">
                <Label>How successful was your practice?</Label>
                <RadioGroup value={practiceResult} onValueChange={(value: any) => setPracticeResult(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="success" id="success" />
                    <Label htmlFor="success" className="cursor-pointer">
                      Successfully applied - worked great!
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" />
                    <Label htmlFor="partial" className="cursor-pointer">
                      Partially successful - needs more practice
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="failed" id="failed" />
                    <Label htmlFor="failed" className="cursor-pointer">
                      Struggled - need to review this concept
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="What did you learn? Any challenges or insights?"
                  value={practiceNotes}
                  onChange={(e) => setPracticeNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPracticeDialog({ open: false })}>
                  Cancel
                </Button>
                <Button onClick={submitPractice} disabled={!practiceResult}>
                  Save Practice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScrumLearning;
