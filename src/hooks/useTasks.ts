import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types/Task';
import { queuedSupabaseQuery } from '@/lib/requestQueue';

// Helper function to check if we're online
const isOnline = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);

// Normalize tags to ensure they're clean string arrays
const normalizeTags = (tags: any): string[] => {
  if (!tags) return [];

  // If it's already an array of strings, filter out empty/invalid tags
  if (Array.isArray(tags)) {
    return tags
      .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag) => tag.trim());
  }

  // If it's a string, try to parse as JSON
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag) => tag.trim());
      }
    } catch (e) {
      return tags.trim() ? [tags.trim()] : [];
    }
  }

  return [];
};

/**
 * useTasks Hook - MVP Single-Sprint Mode (HARDENED)
 *
 * CRITICAL: This hook fetches ALL non-deleted tasks for the logged-in user.
 *
 * MVP Single-Sprint Principles:
 * 1. Tasks are loaded by user_id ONLY - no sprint_id, date range, or sample_sprint_name filtering
 * 2. Tasks with sample_sprint_name = NULL are ALWAYS included (this is the normal case for user tasks)
 * 3. Tasks with sample_sprint_name = 'Current Sprint' are ALSO included (for compatibility)
 * 4. Task visibility is determined solely by the 'status' field (backlog, todo, doing, done)
 * 5. Archived tasks are excluded from display but remain in the database
 * 6. NO sprint selector state affects task visibility - "Current Sprint" is always active
 *
 * ORDERING:
 * - Tasks are ordered by status and sort_order for deterministic display
 * - Manual reordering within columns is supported via sort_order field
 * - Cross-column moves update both status and sort_order
 *
 * IMPORTANT: Realtime subscriptions are DISABLED for MVP to prevent rate limiting.
 * Tasks are refreshed via optimistic updates after mutations.
 *
 * Acceptance Criteria:
 * - If a task exists with status = 'doing', it ALWAYS appears in the Doing column
 * - Refreshing the page NEVER causes tasks to disappear
 * - Newly created tasks appear immediately without requiring refresh
 * - Tasks with sample_sprint_name = NULL still display normally
 * - Manual reordering within columns persists after refresh
 */
export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  // Refs for preventing duplicate operations
  const fetchInProgressRef = useRef(false);
  const mountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchUserIdRef = useRef<string | null>(null);

  /**
   * Convert database task to frontend Task format
   *
   * CRITICAL: Status normalization ensures tasks ALWAYS appear in the correct column.
   * Invalid/missing status defaults to 'todo' to ensure visibility.
   */
  const convertDbTaskToTask = useCallback((task: any): Task => {
    // Normalize status values - ensure they match frontend exactly
    let normalizedStatus: Task['status'] = 'todo';

    const dbStatus = (task.status || '').toLowerCase().trim();

    if (dbStatus === 'backlog') {
      normalizedStatus = 'backlog';
    } else if (dbStatus === 'todo' || dbStatus === 'to do' || dbStatus === 'to-do' || dbStatus === 'to_do') {
      normalizedStatus = 'todo';
    } else if (
      dbStatus === 'doing' ||
      dbStatus === 'in-progress' ||
      dbStatus === 'in progress' ||
      dbStatus === 'in_progress' ||
      dbStatus === 'inprogress'
    ) {
      normalizedStatus = 'doing';
    } else if (dbStatus === 'done' || dbStatus === 'completed' || dbStatus === 'complete' || dbStatus === 'finished') {
      normalizedStatus = 'done';
    } else if (!dbStatus) {
      console.warn(`⚠️ Task ${task.id} has no status, defaulting to 'todo'`);
      normalizedStatus = 'todo';
    } else {
      console.warn(`⚠️ Task ${task.id} has unknown status '${task.status}', defaulting to 'todo'`);
      normalizedStatus = 'todo';
    }

    const isArchived = task.archived === true;

    return {
      id: task.id,
      title: task.title || 'Untitled Task',
      description: task.description || '',
      status: normalizedStatus,
      priority: (['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium') as 'low' | 'medium' | 'high',
      estimatedHours: task.estimated_hours || 0,
      actualHours: task.actual_hours || 0,
      dueDate: task.due_date || undefined,
      createdAt: new Date(task.created_at || Date.now()),
      updatedAt: new Date(task.updated_at || Date.now()),

      // IMPORTANT: allow "no color" and "no emoji" (do not force defaults)
      color: task.color ?? '',
      emoji: task.emoji ?? '',

      duration: task.duration || 30,
      startTime: task.start_time || '',
      subject: task.subject || task.category || '',
      day: task.day || 0,
      completed: task.completed === true,
      archived: isArchived,
      tags: normalizeTags(task.tags),
      sortOrder: task.sort_order ?? null,
    };
  }, []);

  /**
   * Fetch tasks from Supabase - MVP Single-Sprint Mode (HARDENED)
   */
  const fetchTasks = useCallback(async () => {
    if (!user) {
      console.log('📋 fetchTasks: No user, clearing tasks and skipping fetch');
      setTasks([]);
      setLoading(false);
      return;
    }

    if (fetchInProgressRef.current) {
      console.log('📋 fetchTasks: Fetch already in progress, skipping');
      return;
    }

    if (!isOnline()) {
      console.warn('📋 fetchTasks: Device is offline, skipping fetch');
      setError('You appear to be offline. Tasks will sync when you reconnect.');
      setLoading(false);
      return;
    }

    fetchInProgressRef.current = true;
    console.log('📋 fetchTasks: Starting fetch for user:', user.id.substring(0, 8));

    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('📋 fetchTasks: Safety timeout triggered - forcing loading to false');
        setLoading(false);
        fetchInProgressRef.current = false;
      }
    }, 20000);

    try {
      console.log('📋 fetchTasks: Querying Supabase - ALL tasks for user (no sprint filtering)...');

      const { data, error: fetchError } = await queuedSupabaseQuery(
        () =>
          supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .neq('is_deleted', true)
            .or('is_sample.is.null,is_sample.eq.false')
            .order('sort_order', { ascending: true, nullsFirst: false }),
        { maxRetries: 3, critical: true, timeout: 15000 }
      );

      if (!mountedRef.current) {
        console.log('📋 fetchTasks: Component unmounted, aborting');
        fetchInProgressRef.current = false;
        return;
      }

      if (fetchError) {
        console.error('📋 fetchTasks: Error fetching tasks:', fetchError);
        if (!initialFetchDoneRef.current) setError('Unable to load tasks. Please try again.');
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }

      const convertedTasks: Task[] = (data || []).map(convertDbTaskToTask);

      setTasks(convertedTasks);
      setError(null);
      initialFetchDoneRef.current = true;
      lastFetchUserIdRef.current = user.id;
      console.log('📋 fetchTasks: SUCCESS - loaded', convertedTasks.length, 'tasks');
    } catch (err: any) {
      console.error('📋 fetchTasks: Exception during fetch:', err);

      if (!mountedRef.current) {
        fetchInProgressRef.current = false;
        return;
      }

      if (!initialFetchDoneRef.current) {
        setError(!isOnline() ? 'You appear to be offline. Tasks will sync when you reconnect.' : 'Unable to load tasks. Please try again.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
      fetchInProgressRef.current = false;

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [user, convertDbTaskToTask, loading]);

  /**
   * Add a new task with proper authentication verification and clean async flow
   */
  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> => {
    console.log('🆕 addTask: Starting task creation for:', task.title);

    if (!user) {
      console.error('🆕 addTask: No user in context');
      setError('You must be logged in to create tasks.');
      return null;
    }

    if (!isOnline()) {
      console.error('🆕 addTask: Device is offline');
      setError('You appear to be offline. Please check your connection.');
      return null;
    }

    let authenticatedUserId: string;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error('🆕 addTask: Auth verification failed');
        setError('Authentication error. Please try logging in again.');
        return null;
      }
      authenticatedUserId = authData.user.id;
    } catch (authErr: any) {
      console.error('🆕 addTask: Auth check threw error:', authErr);
      setError('Authentication error. Please try logging in again.');
      return null;
    }

    const newSortOrder = Date.now() / 1000;

    // IMPORTANT: allow "no color" and "no emoji" (do not force defaults)
    const taskWithDefaults = {
      ...task,
      status: (task.status || 'todo') as Task['status'],
      priority: (task.priority || 'medium') as Task['priority'],
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      color: task.color ?? '',
      emoji: task.emoji ?? '',
      duration: task.duration || 30,
      completed: task.completed || false,
      archived: task.archived || false,
      tags: normalizeTags(task.tags),
      sortOrder: newSortOrder,
    };

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const optimisticTask: Task = {
      id: tempId,
      title: taskWithDefaults.title,
      description: taskWithDefaults.description || '',
      status: taskWithDefaults.status,
      priority: taskWithDefaults.priority,
      estimatedHours: taskWithDefaults.estimatedHours,
      actualHours: taskWithDefaults.actualHours,
      dueDate: taskWithDefaults.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: taskWithDefaults.color,
      emoji: taskWithDefaults.emoji,
      duration: taskWithDefaults.duration,
      startTime: taskWithDefaults.startTime || '',
      subject: taskWithDefaults.subject || '',
      day: taskWithDefaults.day || 0,
      completed: taskWithDefaults.completed,
      archived: taskWithDefaults.archived,
      tags: taskWithDefaults.tags,
      sortOrder: newSortOrder,
    };

    setTasks((prev) => [...prev, optimisticTask]);

    let plannedStart = null;
    if (taskWithDefaults.startTime && taskWithDefaults.day !== undefined) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + taskWithDefaults.day);
      const [hours, minutes] = taskWithDefaults.startTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
      plannedStart = startDate.toISOString();
    }

    const insertPayload = {
      title: taskWithDefaults.title,
      description: taskWithDefaults.description || '',
      status: taskWithDefaults.status,
      priority: taskWithDefaults.priority,
      estimated_hours: taskWithDefaults.estimatedHours,
      actual_hours: taskWithDefaults.actualHours,
      due_date:
        typeof taskWithDefaults.dueDate === 'string'
          ? taskWithDefaults.dueDate
          : taskWithDefaults.dueDate instanceof Date
            ? taskWithDefaults.dueDate.toISOString().split('T')[0]
            : null,
      user_id: authenticatedUserId,
      color: taskWithDefaults.color,
      emoji: taskWithDefaults.emoji,
      category: taskWithDefaults.subject || '',
      duration: Math.min(taskWithDefaults.duration, 480),
      planned_start: plannedStart,
      start_time: taskWithDefaults.startTime || '',
      subject: taskWithDefaults.subject || '',
      day: taskWithDefaults.day || 0,
      completed: taskWithDefaults.completed,
      archived: false,
      tags: normalizeTags(taskWithDefaults.tags),
      is_deleted: false,
      is_sample: false,
      sort_order: newSortOrder,
    };

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timed out')), 20000);
      });

      const insertPromise = supabase.from('tasks').insert(insertPayload).select().single();

      const { data, error: insertError } = (await Promise.race([insertPromise, timeoutPromise])) as { data: any; error: any };

      if (insertError) {
        console.error('🆕 addTask: Database insert error:', insertError);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        setError(`Failed to save task: ${insertError.message || 'Unknown error'}`);
        return null;
      }

      if (!data) {
        console.error('🆕 addTask: No data returned from insert');
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        setError('Failed to save task: No data returned');
        return null;
      }

      const newTask = convertDbTaskToTask(data);
      setTasks((prev) => prev.map((t) => (t.id === tempId ? newTask : t)));
      setError(null);
      return data;
    } catch (err: any) {
      console.error('🆕 addTask: Error during task insert:', err);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setError(`Failed to save task: ${err.message || 'An unexpected error occurred'}`);
      return null;
    }
  };

  // Update task with proper field mapping
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return false;

    if (!taskId || taskId === 'undefined' || taskId.startsWith('temp_')) {
      console.error('updateTask: Invalid taskId:', taskId);
      return false;
    }

    if (!isOnline()) {
      setError('You appear to be offline. Please check your connection.');
      return false;
    }

    try {
      if (updates.title !== undefined && !updates.title.trim()) {
        console.error('updateTask: Validation failed - Title is required');
        return false;
      }

      if (updates.duration !== undefined && (updates.duration < 30 || updates.duration > 480)) {
        console.error('updateTask: Validation failed - Duration must be between 30 and 480 minutes');
        return false;
      }

      const dbUpdates: any = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
      if (updates.actualHours !== undefined) dbUpdates.actual_hours = updates.actualHours;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.archived !== undefined) dbUpdates.archived = updates.archived;
      if (updates.tags !== undefined) dbUpdates.tags = normalizeTags(updates.tags);
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      if ((updates as any).is_deleted !== undefined) dbUpdates.is_deleted = (updates as any).is_deleted;

      if (updates.subject !== undefined) {
        dbUpdates.category = updates.subject;
        dbUpdates.subject = updates.subject;
      }

      if (updates.duration !== undefined) {
        dbUpdates.duration = Math.min(Math.max(updates.duration, 30), 480);
      }

      if (updates.dueDate !== undefined) {
        if (typeof updates.dueDate === 'string' && updates.dueDate) {
          dbUpdates.due_date = updates.dueDate;
        } else if (updates.dueDate instanceof Date) {
          dbUpdates.due_date = updates.dueDate.toISOString().split('T')[0];
        } else {
          dbUpdates.due_date = null;
        }
      }

      if (updates.startTime !== undefined) {
        dbUpdates.start_time = updates.startTime;

        if (updates.startTime && (updates.day !== undefined || tasks.find((t) => t.id === taskId)?.day !== undefined)) {
          const day = updates.day !== undefined ? updates.day : tasks.find((t) => t.id === taskId)?.day || 0;
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() + day);
          const [hours, minutes] = updates.startTime.split(':').map(Number);
          startDate.setHours(hours, minutes, 0, 0);
          dbUpdates.planned_start = startDate.toISOString();
        }
      }

      if (updates.day !== undefined) {
        dbUpdates.day = updates.day;

        const startTime = updates.startTime || tasks.find((t) => t.id === taskId)?.startTime;
        if (startTime) {
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(today.getDate() + updates.day);
          const [hours, minutes] = startTime.split(':').map(Number);
          startDate.setHours(hours, minutes, 0, 0);
          dbUpdates.planned_start = startDate.toISOString();
        }
      }

      const { data, error: updateError } = await queuedSupabaseQuery(
        () => supabase.from('tasks').update(dbUpdates).eq('id', taskId).select().single(),
        { maxRetries: 2, critical: true }
      );

      if (updateError) {
        console.error('📝 updateTask: Supabase error:', updateError);
        setError('Failed to update task. Please try again.');
        return false;
      }

      if (data) {
        const updatedTask = convertDbTaskToTask(data);
        setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)));

        // Global label color sync (case-insensitive)
        if (updates.color !== undefined) {
          const normalizeLabel = (s: string) => s.trim().toLowerCase();

          const existingTask = tasks.find((t) => t.id === taskId);
          const subjectToMatch = updates.subject !== undefined ? updates.subject : existingTask?.subject;
          const trimmedSubject = (subjectToMatch || '').trim();

          if (trimmedSubject) {
            const targetKey = normalizeLabel(trimmedSubject);

            const matchingTasks = tasks.filter((t) => normalizeLabel(t.subject || '') === targetKey);
            const idsToUpdate = matchingTasks
              .map((t) => t.id)
              .filter((id) => id && !id.startsWith('temp_') && id !== taskId);

            if (idsToUpdate.length > 0) {
              const { error: globalColorError } = await queuedSupabaseQuery(
                () =>
                  supabase
                    .from('tasks')
                    .update({ color: updates.color })
                    .eq('user_id', user.id)
                    .in('id', idsToUpdate),
                { maxRetries: 2, critical: false }
              );

              if (globalColorError) {
                console.error('🏷️ updateTask: Global color sync DB error:', globalColorError);
              }
            }

            setTasks((prev) =>
              prev.map((task) => {
                if (normalizeLabel(task.subject || '') === targetKey && task.id !== taskId) {
                  return { ...task, color: updates.color as string };
                }
                return task;
              })
            );
          }
        }
      }

      setError(null);
      return true;
    } catch (err: any) {
      console.error('📝 updateTask: Error:', err);
      setError('Failed to update task. Please try again.');
      return false;
    }
  };

  /**
   * Reorder tasks within a column or move to a new column with position
   *
   * FIX: Avoid fractional sort_order (which can round/truncate in DB and cause "snaps back" / "can't move by 1")
   */
  const reorderTask = async (taskId: string, newStatus: Task['status'], targetIndex: number, columnTasks: Task[]): Promise<boolean> => {
    if (!user) return false;

    if (!taskId || taskId === 'undefined' || taskId.startsWith('temp_')) {
      console.error('🔄 reorderTask: Invalid taskId:', taskId);
      return false;
    }

    if (!isOnline()) {
      setError('You appear to be offline. Please check your connection.');
      return false;
    }

    const SORT_GAP = 1000;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error('🔄 reorderTask: Task not found:', taskId);
      return false;
    }

    const otherColumnTasksRaw = columnTasks.filter((t) => t.id !== taskId);
    const clampedIndex = Math.max(0, Math.min(targetIndex, otherColumnTasksRaw.length));

    const otherColumnTasks = otherColumnTasksRaw.map((t, idx) => {
      const so = typeof t.sortOrder === 'number' && Number.isFinite(t.sortOrder) ? Math.trunc(t.sortOrder) : (idx + 1) * SORT_GAP;
      return { ...t, sortOrder: so };
    });

    const computeNewSortOrder = (list: Array<{ id: string; sortOrder: number }>, insertIndex: number): number | null => {
      if (list.length === 0) return SORT_GAP;

      const prev = insertIndex > 0 ? list[insertIndex - 1] : null;
      const next = insertIndex < list.length ? list[insertIndex] : null;

      if (!prev && next) return Math.max(0, next.sortOrder - SORT_GAP);
      if (prev && !next) return prev.sortOrder + SORT_GAP;

      const gap = next!.sortOrder - prev!.sortOrder;
      if (gap <= 1) return null;

      return prev!.sortOrder + Math.floor(gap / 2);
    };

    let renormalizePayload: Array<{ id: string; sort_order: number }> = [];
    let newSortOrder = computeNewSortOrder(otherColumnTasks as Array<{ id: string; sortOrder: number }>, clampedIndex);

    if (newSortOrder === null) {
      const renormalized = otherColumnTasks.map((t, idx) => ({ ...t, sortOrder: (idx + 1) * SORT_GAP }));
      renormalizePayload = renormalized.map((t) => ({ id: t.id, sort_order: t.sortOrder }));
      newSortOrder = computeNewSortOrder(renormalized as Array<{ id: string; sortOrder: number }>, clampedIndex);
      if (newSortOrder === null) newSortOrder = (clampedIndex + 1) * SORT_GAP;
    }

    const previousTasks = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, sortOrder: newSortOrder as number } : t)));

    try {
      if (renormalizePayload.length > 0) {
        const renormalizePromises = renormalizePayload.map((item) =>
          queuedSupabaseQuery(
            () => supabase.from('tasks').update({ sort_order: item.sort_order }).eq('id', item.id),
            { maxRetries: 2, critical: true, timeout: 15000 }
          )
        );

        const renormalizeResults = await Promise.all(renormalizePromises);
        const renormError = renormalizeResults.find((r: any) => r?.error)?.error;

        if (renormError) {
          setTasks(previousTasks);
          setError('Failed to reorder task. Please try again.');
          return false;
        }

        setTasks((prev) =>
          prev.map((t) => {
            const r = renormalizePayload.find((x) => x.id === t.id);
            return r ? { ...t, sortOrder: r.sort_order } : t;
          })
        );
      }

      const { error: updateError } = await queuedSupabaseQuery(
        () => supabase.from('tasks').update({ status: newStatus, sort_order: newSortOrder }).eq('id', taskId),
        { maxRetries: 2, critical: true }
      );

      if (updateError) {
        setTasks(previousTasks);
        setError('Failed to reorder task. Please try again.');
        return false;
      }

      setError(null);
      return true;
    } catch (err: any) {
      setTasks(previousTasks);
      setError('Failed to reorder task. Please try again.');
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return false;

    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!taskToDelete) return true;

    if (!isOnline()) {
      setError('You appear to be offline. Please check your connection.');
      return false;
    }

    setIsDeleting(true);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    try {
      const { error: deleteError } = await queuedSupabaseQuery(
        () => supabase.from('tasks').update({ is_deleted: true }).eq('id', taskId),
        { maxRetries: 2, critical: true }
      );

      if (deleteError) {
        setTasks((prev) => [taskToDelete, ...prev]);
        setIsDeleting(false);
        setError('Failed to delete task. Please try again.');
        return false;
      }

      setTimeout(() => setIsDeleting(false), 500);
      setError(null);
      return true;
    } catch (err: any) {
      setTasks((prev) => [taskToDelete, ...prev]);
      setIsDeleting(false);
      setError('Failed to delete task. Please try again.');
      return false;
    }
  };

  const restoreTask = async (taskId: string) => {
    if (!user) return false;

    if (!isOnline()) {
      setError('You appear to be offline. Please check your connection.');
      return false;
    }

    try {
      const { error: restoreError } = await queuedSupabaseQuery(
        () => supabase.from('tasks').update({ is_deleted: false }).eq('id', taskId),
        { maxRetries: 2, critical: true }
      );

      if (restoreError) {
        setError('Failed to restore task. Please try again.');
        return false;
      }

      await fetchTasks();
      setError(null);
      return true;
    } catch (err: any) {
      setError('Failed to restore task. Please try again.');
      return false;
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkSprintRollover = useCallback((sprintSettings: any) => {
    if (!sprintSettings?.startDate || !sprintSettings?.duration) return false;

    const sprintStart = new Date(sprintSettings.startDate);
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintStart.getDate() + sprintSettings.duration);

    return new Date() > sprintEnd;
  }, []);

  const triggerSprintRollover = async (sprintSettings: any) => {
    if (!user) return false;
    console.log('🔄 Sprint rollover triggered (MVP mode - no automatic task changes)');
    return true;
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!user) {
      setLoading(false);
      setTasks([]);
      return;
    }

    if (lastFetchUserIdRef.current !== user.id || !initialFetchDoneRef.current) {
      const fetchTimeout = setTimeout(() => {
        fetchTasks();
      }, 100);

      return () => clearTimeout(fetchTimeout);
    }

    const handleOnline = () => setError(null);
    const handleOffline = () => setError('You are offline. Changes will sync when you reconnect.');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    reorderTask,
    refetch: fetchTasks,
    clearError,
    triggerSprintRollover,
    checkSprintRollover,
  };
};
