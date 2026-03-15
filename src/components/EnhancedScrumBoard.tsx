import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Settings, Target, ArrowRight, X, BookOpen } from 'lucide-react';
import EnhancedTaskCard from './EnhancedTaskCard';
import BoardFilters from './BoardFilters';
import SprintSettings from './SprintSettings';
import { Task, SprintSettings as SprintSettingsType, BoardFilters as BoardFiltersType } from '@/types/Task';

interface EnhancedScrumBoardProps {
  tasks: Task[];
  goalsCount?: number;
  onTaskToggle: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onTaskEdit: (id: string) => void;
  onAddTask: (column: string) => void;
  onTaskMove: (taskId: string, newStatus: string) => Promise<boolean>;
  onTaskReorder: (taskId: string, newStatus: Task['status'], targetIndex: number, columnTasks: Task[]) => Promise<boolean>;
  onTaskDelete: (taskId: string) => Promise<boolean>;
  onOpenGoalModal?: () => void;
  sprintSettings: SprintSettingsType;
  onSprintSettingsChange: (settings: SprintSettingsType) => void;
}

/**
 * EnhancedScrumBoard - MVP Single-Sprint Mode (HARDENED)
 *
 * ORDERING:
 * - Tasks are sorted by sort_order within each column
 * - Manual drag-and-drop reordering is supported within and across columns
 * - Order persists to database and survives page refresh
 */
const EnhancedScrumBoard: React.FC<EnhancedScrumBoardProps> = ({
  tasks,
  goalsCount = 0,
  onTaskToggle,
  onTaskClick,
  onTaskEdit,
  onAddTask,
  onTaskMove,
  onTaskReorder,
  onTaskDelete,
  onOpenGoalModal,
  sprintSettings,
  onSprintSettingsChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState<BoardFiltersType>({});
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Mobile touch support: "tap to select, tap column to move" pattern
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Ref to track the column element (kept for potential future use)
  const columnRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Ref to track the scrollable task list element for each column (used for hit testing + autoscroll)
  const taskListRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const columns = [
    { id: 'backlog', title: 'Backlog', color: 'bg-gray-50 border-gray-200' },
    { id: 'todo', title: 'To Do', color: 'bg-blue-50 border-blue-200' },
    { id: 'doing', title: 'Doing', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'done', title: 'Done', color: 'bg-green-50 border-green-200' }
  ];

  // Filter out sample tasks for the onboarding check (only count user's real tasks)
  const userTasksCount = useMemo(() => {
    return tasks.filter(t => !t.id.startsWith('10000000-')).length;
  }, [tasks]);

  // Show onboarding card only when user has 0 tasks AND 0 goals AND not dismissed
  const showOnboarding = userTasksCount === 0 && goalsCount === 0 && !onboardingDismissed;

  // Debug: Log incoming tasks whenever they change
  useEffect(() => {
    console.log('🎯 EnhancedScrumBoard: Received', tasks.length, 'tasks from parent');
    if (tasks.length > 0) {
      // Log status distribution
      const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🎯 EnhancedScrumBoard: Status distribution:', statusCounts);

      // Log archived count
      const archivedCount = tasks.filter(t => t.archived === true).length;
      console.log('🎯 EnhancedScrumBoard: Archived tasks:', archivedCount);

      // Log sort_order info
      const withSortOrder = tasks.filter(t => t.sortOrder != null).length;
      console.log('🎯 EnhancedScrumBoard: Tasks with sort_order:', withSortOrder, '/', tasks.length);
    } else {
      console.log('🎯 EnhancedScrumBoard: No tasks received - check useTasks hook');
    }
  }, [tasks]);

  // Get available tags and categories for filtering
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, string>(); // lowercase -> original casing
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!tagMap.has(lower)) {
            tagMap.set(lower, trimmed);
          }
        }
      });
    });
    return Array.from(tagMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity: 'base' })
    );
  }, [tasks]);

  const availableCategories = useMemo(() => {
    const categoryMap = new Map<string, string>(); // lowercase -> original casing
    tasks.forEach(task => {
      if (task.subject) {
        const trimmed = task.subject.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!categoryMap.has(lower)) {
            categoryMap.set(lower, trimmed);
          }
        }
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity: 'base' })
    );
  }, [tasks]);

  /**
   * MVP Single-Sprint Mode: Filter tasks (HARDENED)
   */
  const filteredTasks = useMemo(() => {
    console.log('🔍 filteredTasks: Starting filter with', tasks.length, 'tasks');
    console.log('🔍 filteredTasks: Current filters:', filters);

    const result = tasks.filter(task => {
      // Filter 1: Archived status
      if (!filters.showArchived && task.archived === true) {
        return false;
      }

      // Filter 2: Category filter (optional) - case-insensitive matching
      if (filters.category) {
        const taskCategory = (task.subject || '').trim().toLowerCase();
        const filterCategory = filters.category.trim().toLowerCase();
        if (filterCategory && taskCategory !== filterCategory) {
          return false;
        }
      }

      // Filter 3: Tag filter (optional) - case-insensitive matching
      if (filters.tags?.length && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag =>
          task.tags?.some(taskTag =>
            taskTag.trim().toLowerCase() === filterTag.trim().toLowerCase()
          )
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });

    console.log('🔍 filteredTasks: After filtering:', result.length, 'tasks visible');

    if (result.length > 0) {
      const statusCounts = result.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🔍 filteredTasks: Filtered status distribution:', statusCounts);
    }

    return result;
  }, [tasks, filters]);

  /**
   * MVP Single-Sprint Mode: Get tasks for a specific column
   */
  const getTasksForColumn = (columnId: string): Task[] => {
    const columnTasks = filteredTasks.filter(task => {
      if (task.status !== columnId) return false;
      if (!filters.showArchived && task.archived === true) return false;
      return true;
    });

    const sortedTasks = columnTasks.sort((a, b) => {
      const aOrder = a.sortOrder;
      const bOrder = b.sortOrder;

      if (aOrder != null && bOrder != null) return aOrder - bOrder;
      if (aOrder != null && bOrder == null) return -1;
      if (aOrder == null && bOrder != null) return 1;

      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return sortedTasks;
  };

  // Memoize column tasks to avoid recalculating on every render
  const columnTasksMap = useMemo(() => {
    const map: { [key: string]: Task[] } = {};
    columns.forEach(col => {
      map[col.id] = getTasksForColumn(col.id);
    });
    return map;
  }, [filteredTasks, filters]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(taskId);

    // Create a custom drag image
    const draggedElement = e.currentTarget as HTMLElement;
    const rect = draggedElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(draggedElement, rect.width / 2, rect.height / 2);
  };

  /**
   * Auto-scroll the column list while dragging near its edges
   */
  const maybeAutoScroll = (e: React.DragEvent, columnId: string) => {
    const listEl = taskListRefs.current[columnId];
    if (!listEl) return;

    const rect = listEl.getBoundingClientRect();
    const edge = 40;   // px hot zone near top/bottom
    const speed = 18;  // scroll speed per dragover tick
    const y = e.clientY;

    if (y < rect.top + edge) listEl.scrollTop -= speed;
    if (y > rect.bottom - edge) listEl.scrollTop += speed;
  };

  /**
   * Calculate the drop index based on mouse position within the scrollable task list.
   * - Ignores the dragged element to avoid same-column index drift.
   * - Handles "gap drops" between cards so moving by 1 slot feels intuitive.
   */
  const calculateDropIndex = (e: React.DragEvent, columnId: string): number => {
    const listEl = taskListRefs.current[columnId];
    if (!listEl) return 0;

    const taskElements = Array.from(listEl.querySelectorAll('[data-task-id]'))
      .filter(el => (el as HTMLElement).dataset.taskId !== draggedTask) as HTMLElement[];

    if (taskElements.length === 0) return 0;

    const mouseY = e.clientY;

    // Above the first item => insert at top
    const firstRect = taskElements[0].getBoundingClientRect();
    if (mouseY < firstRect.top) return 0;

    for (let i = 0; i < taskElements.length; i++) {
      const current = taskElements[i];
      const currentRect = current.getBoundingClientRect();

      // Cursor is inside this card: before/after based on midpoint
      if (mouseY >= currentRect.top && mouseY <= currentRect.bottom) {
        const midpoint = currentRect.top + currentRect.height / 2;
        return mouseY < midpoint ? i : i + 1;
      }

      // Cursor is in the gap between current and next: insert between them
      const next = taskElements[i + 1];
      if (next) {
        const nextRect = next.getBoundingClientRect();
        if (mouseY > currentRect.bottom && mouseY < nextRect.top) {
          return i + 1;
        }
      }
    }

    // Below all items => insert at end
    return taskElements.length;
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);

    // Fix "locks at 16+" by scrolling the list during drag
    maybeAutoScroll(e, columnId);

    // Calculate drop index for visual feedback
    const dropIndex = calculateDropIndex(e, columnId);
    setDragOverIndex(dropIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');

    console.log('🔎 DRAG & DROP - Starting drop operation');
    console.log('📍 Column ID:', columnId);
    console.log('📋 Task ID:', taskId);

    // IMPORTANT: compute dropIndex BEFORE clearing draggedTask so calculateDropIndex can filter it out
    const dropIndex = calculateDropIndex(e, columnId);
    console.log('📍 Drop index:', dropIndex);

    // Clear drag state
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverIndex(null);

    // Find the task being moved
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('❌ Task not found:', taskId);
      return;
    }

    console.log('📋 Task Details:');
    console.log('  - Current status:', task.status);
    console.log('  - New status:', columnId);

    // Get the column tasks for reordering
    const columnTasks = columnTasksMap[columnId] || [];

    // Status mapping is now 1:1 - column IDs match status values exactly
    const newStatus = columnId as Task['status'];

    // Same-column optimization removed — it was causing off-by-one/no-op behavior.
    // Reorder is cheap (single row update), and this keeps UX consistent.

    console.log('🚀 Calling onTaskReorder with:', { taskId, newStatus, dropIndex });

    try {
      const success = await onTaskReorder(taskId, newStatus, dropIndex, columnTasks);

      if (success) {
        console.log('✅ Task reordered successfully');
      } else {
        console.log('❌ Task reorder failed - error should have been shown via toast');
      }
    } catch (error) {
      console.error('❌ Error in drag drop handler:', error);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverIndex(null);
  };

  /**
   * Mobile touch support: Handle task selection (tap to select)
   * If a task is already selected and user taps a different task, deselect
   */
  const handleTaskSelect = (taskId: string) => {
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null); // Deselect if tapping the same task
    } else {
      setSelectedTaskId(taskId); // Select new task
    }
  };

  /**
   * Mobile touch support: Handle column header tap to move selected task
   */
  const handleColumnTap = async (columnId: string) => {
    if (!selectedTaskId) return;

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    // Don't move if already in this column
    if (task.status === columnId) {
      setSelectedTaskId(null);
      return;
    }

    // Move to end of the target column
    const columnTasks = columnTasksMap[columnId] || [];
    const newStatus = columnId as Task['status'];

    try {
      const success = await onTaskReorder(selectedTaskId, newStatus, columnTasks.length, columnTasks);
      if (success) {
        console.log('✅ Mobile move: Task moved successfully');
      }
    } catch (error) {
      console.error('❌ Mobile move error:', error);
    }

    setSelectedTaskId(null);
  };

  /**
   * Render a drop indicator line at the specified position
   */
  const renderDropIndicator = (columnId: string, index: number) => {
    if (dragOverColumn !== columnId || dragOverIndex !== index) {
      return null;
    }

    return (
      <div
        className="h-1 bg-purple-500 rounded-full my-1 transition-all duration-150 shadow-lg shadow-purple-300"
        style={{ marginLeft: '-4px', marginRight: '-4px' }}
      />
    );
  };

  return (
    // KEY CHANGE: make the whole board fill the available height and manage scrolling inside
    <div className="h-full flex flex-col bg-white">

      {/* Getting Started Onboarding Card */}
      {showOnboarding && (
        // KEY CHANGE: keep onboarding in the header area, but tighter spacing
        <div className="px-6 pt-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 relative">
            <button
              onClick={() => setOnboardingDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
              title="Dismiss"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Start your first Sprint!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Follow these 3 steps to get started with Scrum:
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-blue-600" />
                      <span className="text-sm text-gray-700">
                        <strong>Set a Goal</strong> — What do you want to achieve this week?
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-purple-600" />
                      <span className="text-sm text-gray-700">
                        <strong>Add tasks to To Do</strong> — Break your goal into small tasks
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-green-600" />
                      <span className="text-sm text-gray-700">
                        <strong>Move to Doing</strong> — Start working on one task at a time
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <BookOpen size={14} />
                  <span>See Chapter 4 of the book for more details</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenGoalModal?.()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                  >
                    Create your first goal
                  </button>
                  <button
                    onClick={() => setOnboardingDismissed(true)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile selection banner - shows when a task is selected */}
      {selectedTaskId && (
        <div className="lg:hidden bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">
            Task selected — tap a column to move it
          </span>
          <button
            onClick={() => setSelectedTaskId(null)}
            className="px-3 py-1 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* KEY CHANGE: Mobile-friendly header - stacks on small screens */}
      <div className="px-4 lg:px-6 pt-4 pb-3 border-b bg-white">
        {/* Mobile: stack vertically. Desktop: horizontal layout */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
          {/* Title row - always full width on mobile */}
          <div className="flex items-center justify-between lg:justify-start gap-2">
            <div className="min-w-0">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-800 leading-tight">Scrum Board</h2>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} total
              </p>
            </div>
            {/* Settings button - visible on mobile in title row */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2 lg:gap-4 pb-1 lg:pb-0 flex-shrink-0">
            <BoardFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
              availableCategories={availableCategories}
            />

            <span className="px-3 lg:px-4 py-1.5 lg:py-2 bg-purple-50 text-purple-700 rounded-lg font-medium text-sm whitespace-nowrap">
              Current Sprint
            </span>

            {/* Settings button - desktop only (hidden on mobile, shown in title row instead) */}
            <button
              onClick={() => setShowSettings(true)}
              className="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Trello-style layout: fixed-width columns + horizontal overflow */}
      {/* Mobile fix: overflow-y-auto on mobile (columns stack), overflow-y-hidden on desktop (columns side-by-side) */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto lg:overflow-y-hidden px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-flow-col lg:auto-cols-[320px] gap-6 lg:min-w-max lg:h-full lg:items-stretch">
          {columns.map(column => {
            const isDropZone = dragOverColumn === column.id;
            const isDragging = draggedTask !== null;
            const columnTasks = columnTasksMap[column.id] || [];

            return (
              <div
                key={column.id}
                ref={(el) => { columnRefs.current[column.id] = el; }}
                className={`
                  border-2 border-dashed rounded-lg p-4 transition-all duration-200
                  ${column.color}
                  ${isDragging ? 'border-opacity-70' : ''}
                  ${isDropZone ? 'border-purple-400 bg-purple-50 scale-[1.02] shadow-lg' : ''}
                  ${isDragging && !isDropZone ? 'opacity-60' : ''}
                  flex flex-col min-h-[400px] lg:h-full lg:min-h-0
                `}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column header - tappable on mobile when a task is selected */}
                <div
                  className={`flex items-center justify-between mb-4 rounded-lg transition-all ${
                    selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.status !== column.id
                      ? 'cursor-pointer bg-purple-100 -mx-2 px-2 py-1 border-2 border-dashed border-purple-400'
                      : ''
                  }`}
                  onClick={() => selectedTaskId && handleColumnTap(column.id)}
                >
                  <h3 className={`font-semibold transition-colors ${
                    isDropZone ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {column.title}
                    {isDropZone && (
                      <span className="ml-2 text-sm font-normal text-purple-600">
                        Drop here
                      </span>
                    )}
                    {/* Mobile hint: show "Tap to move here" when task is selected */}
                    {selectedTaskId && tasks.find(t => t.id === selectedTaskId)?.status !== column.id && (
                      <span className="ml-2 text-xs font-normal text-purple-600 lg:hidden">
                        Tap to move here
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                      {columnTasks.length}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); onAddTask(column.id); }}
                      className="p-1 rounded-full hover:bg-white/50 text-gray-600 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div
                  ref={(el) => { taskListRefs.current[column.id] = el; }}
                  className="space-y-1 relative flex-1 min-h-0 overflow-y-auto pr-1"
                >
                  {isDropZone && columnTasks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-purple-500 text-sm font-medium bg-purple-100 px-4 py-2 rounded-lg border-2 border-dashed border-purple-300">
                        Drop task here
                      </div>
                    </div>
                  )}

                  {/* Render drop indicator at position 0 */}
                  {renderDropIndicator(column.id, 0)}

                  {columnTasks.map((task, index) => (
                    <React.Fragment key={task.id}>
                      <div
                        data-task-id={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`
                          cursor-move transition-all duration-200 transform
                          ${draggedTask === task.id ? 'opacity-50 scale-95 rotate-1' : 'hover:scale-[1.02]'}
                          ${draggedTask && draggedTask !== task.id ? 'opacity-75' : ''}
                          ${selectedTaskId === task.id ? 'ring-2 ring-purple-500 ring-offset-2 scale-[1.02]' : ''}
                        `}
                      >
                        {/* Mobile: long-press area for selection */}
                        <div
                          className="lg:hidden absolute -left-2 top-0 bottom-0 w-6 flex items-center justify-center touch-none"
                          onTouchStart={(e) => {
                            // Long press to select on mobile
                            const timer = setTimeout(() => {
                              handleTaskSelect(task.id);
                              // Haptic feedback if available
                              if (navigator.vibrate) navigator.vibrate(50);
                            }, 400);
                            (e.currentTarget as any)._longPressTimer = timer;
                          }}
                          onTouchEnd={(e) => {
                            clearTimeout((e.currentTarget as any)._longPressTimer);
                          }}
                          onTouchMove={(e) => {
                            clearTimeout((e.currentTarget as any)._longPressTimer);
                          }}
                        >
                          <div className="w-1 h-8 bg-gray-300 rounded-full" />
                        </div>
                        <EnhancedTaskCard
                          {...task}
                          onToggleComplete={onTaskToggle}
                          onClick={() => onTaskClick(task)}
                          onEdit={onTaskEdit}
                        />
                      </div>
                      {/* Render drop indicator after each task */}
                      {renderDropIndicator(column.id, index + 1)}
                    </React.Fragment>
                  ))}

                  {columnTasks.length === 0 && !isDropZone && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No tasks</p>
                      <button
                        onClick={() => onAddTask(column.id)}
                        className="text-xs text-blue-500 hover:text-blue-600 mt-2"
                      >
                        + Add a task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SprintSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={sprintSettings}
        onSave={onSprintSettingsChange}
        tasks={tasks}
        onDeleteTask={onTaskDelete}
      />
    </div>
  );
};

export default EnhancedScrumBoard;
