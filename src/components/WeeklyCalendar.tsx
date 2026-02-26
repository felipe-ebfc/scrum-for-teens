import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Task, BoardFilters } from '../types/Task';
import EnhancedTaskCard from './EnhancedTaskCard';
import TimeConflictModal from './TimeConflictModal';
import DailyProgressIndicator from './DailyProgressIndicator';
import { useIsMobile } from '../hooks/use-mobile';
import { 
  findTimeConflicts, 
  suggestResolutions, 
  TimeConflict, 
  ConflictResolution 
} from '../utils/timeConflictUtils';

interface WeeklyCalendarProps {
  tasks: Task[];
  filters: BoardFilters;
  onTaskToggle: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (day: number) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskArchive: (id: string) => void;
  onTaskMove?: (taskId: string, newDay: number) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  tasks,
  filters,
  onTaskToggle,
  onTaskClick,
  onAddTask,
  onTaskUpdate,
  onTaskArchive,
  onTaskMove
}) => {
  // Remove currentWeek state - always show active sprint
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const isMobile = useIsMobile();
  
  // Time conflict detection state
  const [pendingMove, setPendingMove] = useState<{
    taskId: string;
    targetDay: number;
    task: Task;
    conflicts: TimeConflict[];
    resolutions: ConflictResolution[];
  } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  /**
   * MVP Single-Sprint Mode: Get filtered tasks for a specific day
   * 
   * Tasks are filtered by:
   * 1. Day field (which day of the week the task is scheduled for)
   * 2. Archived status (hidden unless showArchived filter is enabled)
   * 3. Category filter (if set)
   * 4. Tag filter (if set)
   * 
   * NO sprint-based filtering is applied - all non-archived tasks are shown
   * based on their scheduled day.
   */
  const getFilteredTasksForDay = (dayIndex: number) => {
    // Filter tasks by day field - no sprint filtering
    let filteredTasks = tasks.filter(task => {
      // Use task.day if available, otherwise distribute by index
      const taskDay = task.day !== undefined ? task.day : tasks.indexOf(task) % 7;
      return taskDay === dayIndex;
    });
    
    // Apply filters - archived tasks hidden by default
    if (!filters.showArchived) {
      filteredTasks = filteredTasks.filter(task => !task.archived);
    }
    
    // Apply category filter - handle empty subjects gracefully for new tasks
    if (filters.category) {
      const filterCategory = filters.category.trim();
      filteredTasks = filteredTasks.filter(task => {
        const taskCategory = task.subject?.trim() || '';
        // If filter is set but task has no category, only exclude if filter is not empty
        return !filterCategory || taskCategory === filterCategory || 
               task.description?.includes(filterCategory);
      });
    }
    
    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.tags?.some(tag => filters.tags?.includes(tag))
      );
    }
    
    // Sort by planned start time (startTime) if available
    return filteredTasks.sort((a, b) => {
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return a.title.localeCompare(b.title);
    });
  };


  // Handle task click - convert task object to id for consistency with Scrum Board
  const handleTaskClick = (task: Task) => {
    onTaskClick(task);
  };

  // Handle task edit - same as click for editing
  const handleTaskEdit = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onTaskClick(task);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    setDragOverDay(dayIndex);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the day column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDay(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    setDraggedTask(null);
    setDragOverDay(null);
    
    if (onTaskMove && taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      // If moving to the same day, proceed without conflict check
      if (task.day === dayIndex) {
        onTaskMove(taskId, dayIndex);
        return;
      }
      
      // Create a temporary task with the new day to check for conflicts
      const tempTask = { ...task, day: dayIndex };
      const dayTasks = getFilteredTasksForDay(dayIndex);
      const conflicts = findTimeConflicts(tempTask, dayTasks);
      
      if (conflicts.length > 0) {
        // Show conflict resolution modal
        const resolutions = suggestResolutions(tempTask, conflicts, tasks);
        setPendingMove({
          taskId,
          targetDay: dayIndex,
          task: tempTask,
          conflicts,
          resolutions
        });
        setShowConflictModal(true);
      } else {
        // No conflicts, proceed with move
        onTaskMove(taskId, dayIndex);
      }
    }
  };

  // Handle conflict resolution
  const handleConflictResolution = (resolution: ConflictResolution) => {
    if (!pendingMove) return;
    
    setShowConflictModal(false);
    
    switch (resolution.type) {
      case 'reschedule':
        if (resolution.suggestedTime && onTaskUpdate) {
          const updatedTask = {
            ...pendingMove.task,
            startTime: resolution.suggestedTime,
            day: pendingMove.targetDay
          };
          onTaskUpdate(updatedTask);
        }
        break;
        
      case 'swap':
        if (resolution.swapTask && onTaskUpdate) {
          // Update the dragged task to new day and time
          const draggedTask = {
            ...pendingMove.task,
            startTime: resolution.swapTask.startTime,
            day: pendingMove.targetDay
          };
          // Update the conflicting task to original task's time and day
          const swappedTask = {
            ...resolution.swapTask,
            startTime: pendingMove.task.startTime,
            day: pendingMove.task.day
          };
          onTaskUpdate(draggedTask);
          onTaskUpdate(swappedTask);
        }
        break;
        
      case 'cancel':
        // Do nothing, just close modal
        break;
    }
    
    setPendingMove(null);
  };

  const handleCloseConflictModal = () => {
    setShowConflictModal(false);
    setPendingMove(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Weekly Sprint</h2>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
            Current Sprint
          </span>
        </div>
      </div>

      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {days.map((day, index) => (
            <div 
              key={day} 
              className={`flex-shrink-0 w-72 border-2 border-dashed rounded-lg p-3 min-h-[300px] transition-colors flex flex-col ${
                dragOverDay === index 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm">{day}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {getFilteredTasksForDay(index).length}
                  </span>
                  <button
                    onClick={() => onAddTask(index)}
                    className="p-1 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              {/* Mobile progress indicator - below header */}
              {isMobile && (
                <DailyProgressIndicator
                  tasks={tasks}
                  dayIndex={index}
                  isMobile={true}
                />
              )}
              
              {/* Tasks container - flex-grow to push desktop progress indicator to bottom */}
              <div className="space-y-3 flex-grow">
                {getFilteredTasksForDay(index).map(task => (
                  <div 
                    key={task.id} 
                    className={`w-full cursor-move transition-opacity ${
                      draggedTask === task.id ? 'opacity-50' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  >
                    <EnhancedTaskCard
                      {...task}
                      onToggleComplete={onTaskToggle}
                      onClick={() => handleTaskClick(task)}
                      onEdit={handleTaskEdit}
                    />
                  </div>
                ))}
              </div>
              
              {/* Desktop progress indicator - at bottom of column */}
              {!isMobile && (
                <DailyProgressIndicator
                  tasks={tasks}
                  dayIndex={index}
                  isMobile={false}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Conflict Modal */}
      {pendingMove && (
        <TimeConflictModal
          isOpen={showConflictModal}
          onClose={handleCloseConflictModal}
          task={pendingMove.task}
          targetDay={pendingMove.targetDay}
          conflicts={pendingMove.conflicts}
          resolutions={pendingMove.resolutions}
          onResolve={handleConflictResolution}
        />
      )}
    </div>
  );
};

export default WeeklyCalendar;