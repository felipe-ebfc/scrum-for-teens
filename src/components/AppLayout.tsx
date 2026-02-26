import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import Dashboard from './Dashboard';
import WeeklyCalendar from './WeeklyCalendar';
import EnhancedScrumBoard from './EnhancedScrumBoard';
import ScrumLearning from './ScrumLearning';
import AccountProfile from './AccountProfile';
import Confetti from './Confetti';

import { MigrationRunnerComponent } from './MigrationRunner';
import ReplanModal from './ReplanModal';
import EnhancedTaskModal from './EnhancedTaskModal';
import SampleSprintModal from './SampleSprintModal';
import { GoalModal } from './GoalModal';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useSampleTasks } from '@/hooks/useSampleTasks';
import { Calendar, BookOpen, BarChart3, Kanban, User, LogOut, AlertCircle, X, RefreshCw } from 'lucide-react';
import { Task, SprintSettings, BoardFilters } from '@/types/Task';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { calculateSprintMetrics } from '@/utils/sprintMetrics';

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, showSampleTasks } = useAppContext();
  const { user, logout, profileLoading } = useAuth();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    reorderTask,
    clearError,
    triggerSprintRollover,
    checkSprintRollover
  } = useTasks();
  const { goals, createGoal } = useGoals();

  const { sampleTasks } = useSampleTasks();
  const { toast: showToast } = useToast();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState('dashboard');

  const [sprintSettings, setSprintSettings] = useState<SprintSettings>({
    startDate: new Date().toISOString().split('T')[0],
    duration: 7,
    autoArchive: true
  });

  const [filters, setFilters] = useState<BoardFilters>({
    showArchived: false
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [replanModalOpen, setReplanModalOpen] = useState(false);
  const [sampleSprintModalOpen, setSampleSprintModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const isBoardTab = activeTab === 'board';

  // Safety timeout - if loading takes more than 10 seconds, show content anyway
  useEffect(() => {
    if (tasksLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [tasksLoading]);

  // Determine if we should show loading screen
  const showLoadingScreen = tasksLoading && !loadingTimeout;

  // Debug: Log task counts whenever they change
  useEffect(() => {
    console.log('📱 AppLayout: Task state updated');
    console.log('📱 AppLayout: User tasks count:', tasks.length);
    console.log('📱 AppLayout: Sample tasks count:', sampleTasks.length);
    console.log('📱 AppLayout: showSampleTasks:', showSampleTasks);
    console.log('📱 AppLayout: allTasks count:', tasks.length + (showSampleTasks ? sampleTasks.length : 0));

    if (tasks.length > 0) {
      const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📱 AppLayout: User tasks status distribution:', statusCounts);
    }
  }, [tasks, sampleTasks, showSampleTasks]);

  /**
   * Combine user tasks with sample tasks based on toggle setting
   *
   * CRITICAL: This is the ONLY place where tasks are combined.
   * User tasks are ALWAYS included. Sample tasks are only included if showSampleTasks is true.
   */
  const allTasks = useMemo(() => {
    const combined = showSampleTasks ? [...tasks, ...sampleTasks] : tasks;
    console.log('📱 AppLayout: allTasks computed -', combined.length, 'total tasks');
    return combined;
  }, [tasks, sampleTasks, showSampleTasks]);

  // Use centralized metrics calculation for consistency - only count user tasks
  const sprintMetrics = useMemo(() => {
    return calculateSprintMetrics(tasks, false); // Don't include archived tasks or sample tasks
  }, [tasks]);

  const {
    totalTasks,
    completedTasks,
    progressPercentage: sprintProgress,
    workloadRemainingHours,
    workloadTotalHours,
    workloadPercentRemaining,
  } = sprintMetrics;

  /**
   * Get initials from profile full_name
   * Returns null while profile is loading (to show skeleton)
   * Returns 'U' only if loading is complete AND full_name is empty
   */
  const getInitials = (): string | null => {
    if (profileLoading) return null;

    const profileName = user?.profile?.full_name;
    if (!profileName || typeof profileName !== 'string' || !profileName.trim()) {
      return 'U';
    }
    return profileName
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Trigger confetti celebration effect
   * Called when a task is marked as Done
   */
  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  /**
   * Wrapper for updateTask that triggers confetti when status changes to 'done'
   * Used by the modal to detect task completion
   */
  const updateTaskWithConfetti = useCallback(async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
    if (updates.status === 'done') {
      const currentTask = tasks.find(t => t.id === taskId);
      if (currentTask && currentTask.status !== 'done') {
        const success = await updateTask(taskId, updates);
        if (success) triggerConfetti();
        return success;
      }
    }
    return updateTask(taskId, updates);
  }, [tasks, updateTask, triggerConfetti]);

  const handleTaskToggle = async (taskId: string) => {
    if (taskId.startsWith('10000000-')) {
      toast.info('Sample tasks are read-only for learning purposes');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newStatus = task.status === 'done' ? 'doing' : 'done';

      if (newStatus === 'done') {
        const doneTasks = tasks.filter(t => t.status === 'done' && t.id !== taskId);

        let newSortOrder: number;
        if (doneTasks.length === 0) {
          newSortOrder = Date.now() / 1000;
        } else {
          const minSortOrder = Math.min(...doneTasks.map(t => t.sortOrder ?? Date.now() / 1000));
          newSortOrder = minSortOrder - 1000;
        }

        const success = await updateTask(taskId, { status: newStatus, sortOrder: newSortOrder });
        if (success) triggerConfetti();
      } else {
        const doingTasks = tasks.filter(t => t.status === 'doing' && t.id !== taskId);

        let newSortOrder: number;
        if (doingTasks.length === 0) {
          newSortOrder = Date.now() / 1000;
        } else {
          const minSortOrder = Math.min(...doingTasks.map(t => t.sortOrder ?? Date.now() / 1000));
          newSortOrder = minSortOrder - 1000;
        }

        await updateTask(taskId, { status: newStatus, sortOrder: newSortOrder });
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    await updateTask(updatedTask.id, updatedTask);
  };

  const handleAddTask = (day: number | string) => {
    if (typeof day === 'string') {
      setSelectedDay(0);
      setEditingTask(undefined);
      setEditingTask({ status: day as Task['status'] } as Task);
    } else {
      setSelectedDay(day);
      setEditingTask(undefined);
    }
    setTaskModalOpen(true);
  };

  const handleTaskEdit = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setTaskModalOpen(true);
    }
  };

  const handleReplanTasks = async (replanedTasks: Task[]) => {
    for (const task of replanedTasks) {
      await updateTask(task.id, task);
    }
  };

  const handleTaskMove = async (taskId: string, newStatus: string): Promise<boolean> => {
    try {
      console.log('🚀 Moving task:', { taskId, newStatus });

      if (taskId.startsWith('10000000-')) {
        toast.info('Sample tasks are read-only for learning purposes');
        return false;
      }

      const validStatuses = ['backlog', 'todo', 'doing', 'done'];
      if (!validStatuses.includes(newStatus)) {
        console.error('❌ Invalid status:', newStatus);
        showToast({
          title: "Error",
          description: `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('📡 Calling updateTask with status:', newStatus);
      const success = await updateTask(taskId, { status: newStatus as Task['status'] });

      if (!success) {
        console.error('❌ Task update failed');
        showToast({
          title: "Move Failed",
          description: "Couldn't move task. Please check your connection and try again.",
          variant: "destructive",
        });
        return false;
      }

      toast.success(`Task moved to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('❌ Error moving task:', error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Couldn't update task. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Handle task reordering within or across columns
   */
  const handleTaskReorder = async (
    taskId: string,
    newStatus: Task['status'],
    targetIndex: number,
    columnTasks: Task[]
  ): Promise<boolean> => {
    try {
      console.log('🔄 Reordering task:', { taskId, newStatus, targetIndex });

      if (taskId.startsWith('10000000-')) {
        toast.info('Sample tasks are read-only for learning purposes');
        return false;
      }

      const currentTask = tasks.find(t => t.id === taskId);
      const isTransitioningToDone = newStatus === 'done' && currentTask && currentTask.status !== 'done';

      const success = await reorderTask(taskId, newStatus, targetIndex, columnTasks);

      if (!success) {
        console.error('❌ Task reorder failed');
        showToast({
          title: "Reorder Failed",
          description: "Couldn't reorder task. Please check your connection and try again.",
          variant: "destructive",
        });
        return false;
      }

      if (isTransitioningToDone) triggerConfetti();
      return true;
    } catch (error) {
      console.error('❌ Error reordering task:', error);
      showToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Couldn't reorder task. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle sprint rollover
  const handleSprintRollover = async () => {
    console.log('🔄 Triggering sprint rollover from UI');
    const success = await triggerSprintRollover(sprintSettings);

    if (success) {
      toast.success('🎉 Sprint rollover completed! Tasks have been processed.');
      const newSprintSettings = {
        ...sprintSettings,
        startDate: new Date().toISOString().split('T')[0]
      };
      setSprintSettings(newSprintSettings);
    } else {
      toast.error('❌ Sprint rollover failed. Please try again.');
    }
  };

  // Check for automatic sprint rollover on app load
  useEffect(() => {
    if (tasks.length > 0) {
      const needsRollover = checkSprintRollover(sprintSettings);
      if (needsRollover) {
        toast.info('📅 Sprint period has ended. Consider starting a new sprint to organize your tasks.');
      }
    }
  }, [tasks, sprintSettings, checkSprintRollover]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'board', label: 'Scrum Board', icon: Kanban },
    { id: 'learning', label: 'Scrum Learning', icon: BookOpen },
    { id: 'account', label: 'Account', icon: User }
  ];

  // Redirect to dashboard if somehow activeTab is set to 'calendar' (hidden for MVP)
  useEffect(() => {
    if (activeTab === 'calendar') {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  if (showLoadingScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/68cb7ad2f4237b94daaac269_1758501748670_72f18d27.png"
            alt="Scrum for Teens"
            className="w-8 h-10 rounded-md shadow-md mx-auto mb-4 animate-pulse object-cover"
          />
          <p className="text-gray-600">Loading your tasks...</p>
          <p className="text-gray-400 text-sm mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  const initials = getInitials();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tasks Error Banner */}
      {tasksError && (
        <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tasksError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-orange-700 hover:text-orange-900 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
              <button
                onClick={clearError}
                className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                src="https://d64gsuwffb70l.cloudfront.net/68cb7ad2f4237b94daaac269_1758501748670_72f18d27.png"
                alt="Scrum for Teens"
                className="w-8 h-10 rounded-md shadow-sm object-cover flex-shrink-0"
              />
              <h1 className="text-xl font-bold text-gray-800 hidden sm:block">Scrum for Teens</h1>
            </button>

            <div className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profile?.avatar_url || ''} />
                <AvatarFallback
                  className={`text-sm font-medium ${
                    profileLoading ? 'bg-gray-200 animate-pulse' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className={
          isBoardTab
            ? // Board tab = Trello-like viewport container (keeps horizontal scrollbar in view)
              'w-full h-[calc(100vh-64px)] overflow-hidden'
            : // Other tabs keep your centered layout
              'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
        }
      >
        {/* Dashboard */}
        <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
          <Dashboard
            sprintProgress={sprintProgress}
            tasksCompleted={completedTasks}
            totalTasks={totalTasks}
            workloadRemainingHours={workloadRemainingHours}
            workloadTotalHours={workloadTotalHours}
            workloadPercentRemaining={workloadPercentRemaining}
            onNavigateToBoard={() => setActiveTab('board')}
          />
        </div>

        {/* Scrum Board */}
        <div className={activeTab === 'board' ? 'h-full' : 'hidden'}>
          <EnhancedScrumBoard
            tasks={allTasks}
            goalsCount={goals.length}
            onTaskToggle={handleTaskToggle}
            onTaskClick={handleTaskClick}
            onTaskEdit={handleTaskEdit}
            onAddTask={handleAddTask}
            onTaskMove={handleTaskMove}
            onTaskReorder={handleTaskReorder}
            onTaskDelete={deleteTask}
            onOpenGoalModal={() => setGoalModalOpen(true)}
            sprintSettings={sprintSettings}
            onSprintSettingsChange={setSprintSettings}
          />
        </div>

        {/* Scrum Learning */}
        <div className={activeTab === 'learning' ? '' : 'hidden'}>
          <ScrumLearning />
        </div>

        {/* Account */}
        <div className={activeTab === 'account' ? '' : 'hidden'}>
          <AccountProfile />
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center p-2 rounded-lg ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs mt-1">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <EnhancedTaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(undefined);
        }}
        selectedDay={selectedDay}
        editingTask={editingTask}
        onAddTask={addTask}
        onUpdateTask={updateTaskWithConfetti}
        onDeleteTask={deleteTask}
        onRestoreTask={restoreTask}
      />

      <ReplanModal
        isOpen={replanModalOpen}
        onClose={() => setReplanModalOpen(false)}
        incompleteTasks={tasks.filter(task => task.status !== 'done')}
        onReplanTasks={handleReplanTasks}
      />

      <SampleSprintModal
        isOpen={sampleSprintModalOpen}
        onClose={() => setSampleSprintModalOpen(false)}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onSave={async (goalData) => {
          try {
            await createGoal(goalData);
            setGoalModalOpen(false);
            toast.success('Goal created successfully!');
          } catch (error) {
            toast.error('Failed to create goal');
          }
        }}
      />

      <Confetti
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
        duration={1000}
      />
    </div>
  );
};

export default AppLayout;
