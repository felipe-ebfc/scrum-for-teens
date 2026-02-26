import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/types/Goal';
import { useAuth } from '@/contexts/AuthContext';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

// Helper function to check if we're online
const isOnline = () => typeof navigator !== 'undefined' ? navigator.onLine : true;

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Check online status
    if (!isOnline()) {
      setError('You appear to be offline. Goals will sync when you reconnect.');
      setLoading(false);
      return;
    }

    fetchInProgressRef.current = true;
    
    // Only show loading spinner on initial fetch, not on subsequent fetches
    // This prevents the loading flash when switching tabs
    if (!initialFetchDoneRef.current) {
      setLoading(true);
    }

    // Safety timeout - goals should never block the app indefinitely
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Goals loading timeout - forcing loading to false');
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    }, 15000);
    
    try {
      // Fetch goals only (no milestones for MVP UI)
      const { data: goalsData, error: goalsError } = await queuedSupabaseQuery(
        () => supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        { maxRetries: 3, critical: false, timeout: 12000 }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
        if (!initialFetchDoneRef.current) {
          setError('Unable to load goals. Please try again.');
        }
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      // Transform data to match Goal interface (simplified for MVP)
      const transformedGoals: Goal[] = goalsData?.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description || '',
        category: goal.category || 'learning',
        type: goal.type || 'sprint',
        specific: goal.specific || '',
        measurable: goal.measurable || '',
        achievable: goal.achievable || '',
        relevant: goal.relevant || '',
        timeBound: goal.time_bound || '',
        targetValue: goal.target_value || 1,
        currentValue: goal.current_value || 0,
        unit: goal.unit || 'goal',
        startDate: new Date(goal.start_date || goal.created_at),
        // Keep targetDate as null if not set in database (truly optional)
        targetDate: goal.target_date ? new Date(goal.target_date) : null,
        completedDate: goal.completed_date ? new Date(goal.completed_date) : undefined,
        status: goal.status || 'active',
        priority: goal.priority || 'medium',
        reward: goal.reward || undefined,
        milestones: [], // Not fetching milestones for MVP UI
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
        userId: goal.user_id,
      })) || [];


      setGoals(transformedGoals);
      setError(null);
      initialFetchDoneRef.current = true;
    } catch (err) {
      console.error('Error in fetchGoals:', err);
      if (mountedRef.current && !initialFetchDoneRef.current) {
        setError('Unable to load goals. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [user]);


  const createGoal = async (goalData: any) => {
    if (!user) throw new Error('User not authenticated');

    if (!isOnline()) {
      throw new Error('You appear to be offline. Please check your connection.');
    }

    try {
      const { data: goal, error: goalError } = await queuedSupabaseQuery(
        () => supabase
          .from('goals')
          .insert({
            title: goalData.title,
            description: goalData.description || '',
            category: goalData.category || 'learning',
            type: goalData.type || 'sprint',
            specific: goalData.specific || '',
            measurable: goalData.measurable || '',
            achievable: goalData.achievable || '',
            relevant: goalData.relevant || '',
            time_bound: goalData.timeBound || '',
            target_value: goalData.targetValue || 1,
            current_value: goalData.currentValue || 0,
            unit: goalData.unit || 'goal',
            start_date: new Date().toISOString(),
            // Target date is truly optional - save as null if not provided
            target_date: goalData.targetDate instanceof Date 
              ? goalData.targetDate.toISOString() 
              : (goalData.targetDate ? new Date(goalData.targetDate).toISOString() : null),
            status: goalData.status || 'active',
            priority: goalData.priority || 'medium',
            reward: goalData.reward || null,
            user_id: user.id,
          })
          .select()
          .single(),
        { maxRetries: 2, critical: true }
      );

      if (goalError) throw goalError;

      await fetchGoals();
      return goal;
    } catch (err) {
      console.error('Error creating goal:', err);
      throw err instanceof Error ? err : new Error('Failed to create goal');
    }
  };


  const updateGoal = async (id: string, updates: any) => {
    if (!user) throw new Error('User not authenticated');

    if (!isOnline()) {
      throw new Error('You appear to be offline. Please check your connection.');
    }

    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) {
        updateData.status = updates.status;
        // If marking as completed, set completed_date and current_value
        if (updates.status === 'completed') {
          updateData.completed_date = new Date().toISOString();
          updateData.current_value = updates.targetValue || 1;
        } else {
          updateData.completed_date = null;
          updateData.current_value = 0;
        }
      }
      // Handle targetDate - allow null to clear the date
      if ('targetDate' in updates) {
        if (updates.targetDate === null) {
          updateData.target_date = null;
        } else if (updates.targetDate instanceof Date) {
          updateData.target_date = updates.targetDate.toISOString();
        } else if (updates.targetDate) {
          updateData.target_date = new Date(updates.targetDate).toISOString();
        }
      }

      // Keep other fields if provided (for backwards compatibility)
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const { error } = await queuedSupabaseQuery(
        () => supabase
          .from('goals')
          .update(updateData)
          .eq('id', id),
        { maxRetries: 2, critical: true }
      );

      if (error) throw error;

      await fetchGoals();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update goal');
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    if (!isOnline()) {
      throw new Error('You appear to be offline. Please check your connection.');
    }

    try {
      const { error } = await queuedSupabaseQuery(
        () => supabase
          .from('goals')
          .delete()
          .eq('id', id),
        { maxRetries: 2, critical: true }
      );

      if (error) throw error;

      await fetchGoals();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete goal');
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (user) {
      const fetchTimeout = setTimeout(() => {
        fetchGoals();
      }, 200);

      return () => {
        mountedRef.current = false;
        clearTimeout(fetchTimeout);
      };
    } else {
      setGoals([]);
      setLoading(false);
    }

    const handleOnline = () => {
      console.log('🎯 Goals: Device came online');
      setError(null);
    };

    const handleOffline = () => {
      console.log('🎯 Goals: Device went offline');
      setError('You are offline. Changes will sync when you reconnect.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, fetchGoals]);


  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals,
    clearError,
  };
};
