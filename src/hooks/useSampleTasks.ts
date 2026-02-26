import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types/Task';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

// Helper function to check if we're online
const isOnline = () => typeof navigator !== 'undefined' ? navigator.onLine : true;

export const useSampleTasks = () => {
  const [sampleTasks, setSampleTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false); // Start as false - sample tasks are optional
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sample tasks from database
  const fetchSampleTasks = async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Check online status
    if (!isOnline()) {
      console.warn('Device is offline, skipping sample tasks fetch');
      setLoading(false);
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    // Safety timeout - sample tasks should never block the app
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Sample tasks loading timeout - continuing without them');
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    }, 10000);

    try {
      // Use queued request with retry - this is non-critical so we use critical: false
      const { data, error: fetchError } = await queuedSupabaseQuery(
        () => supabase
          .from('tasks')
          .select('*')
          .eq('is_sample', true)
          .eq('sample_sprint_name', "Noah's Sample Sprint")
          .order('due_date', { ascending: true }),
        { maxRetries: 2, critical: false, timeout: 8000 }
      );

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      if (fetchError) {
        console.warn('Error fetching sample tasks (non-critical):', fetchError);
        // Don't set error state for non-critical requests
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      const convertedTasks: Task[] = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status as Task['status'],
        priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
        estimatedHours: task.estimated_hours || 0,
        actualHours: task.actual_hours || 0,
        dueDate: task.due_date || undefined,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at),
        color: task.color || '#3B82F6',
        emoji: task.emoji || '📋',
        duration: task.duration || 30,
        startTime: task.start_time || '',
        subject: task.subject || task.category || '',
        day: task.day || 0,
        completed: task.completed || false,
        archived: task.archived || false,
        tags: task.tags || [],
      }));

      setSampleTasks(convertedTasks);
      setError(null);
    } catch (err) {
      console.warn('Error fetching sample tasks (non-critical):', err);
      // Don't set error state for non-critical requests - just log it
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
  };

  useEffect(() => {
    mountedRef.current = true;

    // Delay sample tasks fetch significantly - it's the lowest priority
    const fetchTimeout = setTimeout(() => {
      fetchSampleTasks();
    }, 1000); // Increased delay to 1 second

    return () => {
      mountedRef.current = false;
      clearTimeout(fetchTimeout);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    sampleTasks,
    loading,
    error,
    refetch: fetchSampleTasks,
  };
};

