import React, { useState, useMemo } from 'react';
import { Calendar, Settings, Save, X, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { SprintSettings as SprintSettingsType, Task } from '@/types/Task';
import { toast } from 'sonner';
import { useBadgeChecker } from '@/hooks/useBadgeChecker';

interface SprintSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SprintSettingsType;
  onSave: (settings: SprintSettingsType) => void;
  tasks: Task[];
  onDeleteTask: (taskId: string) => Promise<boolean>;
}


const SprintSettings: React.FC<SprintSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  tasks,
  onDeleteTask
}) => {
  const { checkBadges } = useBadgeChecker();
  const [localSettings, setLocalSettings] = useState<SprintSettingsType>(settings);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Count done tasks (not archived)
  const doneTasksCount = useMemo(() => {
    return tasks.filter(task => task.status === 'done' && !task.archived).length;
  }, [tasks]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleStartNewSprint = () => {
    // ── Easter egg: Early Bird ─────────────────────────────────────────────────
    // Award if the sprint is started before 8 AM (local time)
    if (new Date().getHours() < 8) {
      checkBadges('early_sprint');
    }

    // ── Easter egg: Perfect Sprint ─────────────────────────────────────────────
    // Award if the outgoing sprint had 100% velocity:
    // all non-archived, non-backlog tasks are Done AND at least one exists.
    const sprintTasks = tasks.filter(
      (t) => !t.archived && t.status !== 'backlog'
    );
    if (sprintTasks.length > 0 && sprintTasks.every((t) => t.status === 'done')) {
      checkBadges('perfect_sprint');
    }

    // Update sprint settings with today as start date
    const newSettings: SprintSettingsType = {
      ...localSettings,
      startDate: new Date().toISOString().split('T')[0]
    };
    
    // Save the new settings
    onSave(newSettings);
    
    // Update local state to reflect the change
    setLocalSettings(newSettings);
    
    // Show success toast and close
    toast.success('New sprint started 🎉');
    onClose();
  };

  const handleClearDoneTasks = async () => {
    setIsClearing(true);
    
    // Get all done tasks (not archived)
    const doneTasks = tasks.filter(task => task.status === 'done' && !task.archived);
    
    let successCount = 0;
    let failCount = 0;
    
    // Delete each done task
    for (const task of doneTasks) {
      try {
        const success = await onDeleteTask(task.id);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Failed to delete task:', task.id, error);
        failCount++;
      }
    }
    
    setIsClearing(false);
    setShowClearConfirmation(false);
    
    // Show result toast
    if (failCount === 0) {
      toast.success(`Cleared ${successCount} completed task${successCount !== 1 ? 's' : ''} 🧹`);
    } else if (successCount > 0) {
      toast.warning(`Cleared ${successCount} task${successCount !== 1 ? 's' : ''}, but ${failCount} failed`);
    } else {
      toast.error('Failed to clear tasks. Please try again.');
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-gray-800">Sprint Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={localSettings.startDate}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Duration (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={localSettings.duration}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Start New Sprint Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleStartNewSprint}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Start New Sprint
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Sets today as the sprint start date
              </p>
            </div>

            {/* Clear Done Tasks Button - Sprint Review */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowClearConfirmation(true)}
                disabled={doneTasksCount === 0}
                className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  doneTasksCount === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                }`}
              >
                <Trash2 size={18} />
                Clear Done Tasks
                {doneTasksCount > 0 && (
                  <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full ml-1">
                    {doneTasksCount}
                  </span>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {doneTasksCount === 0 
                  ? 'No completed tasks to clear'
                  : 'Permanently delete all completed tasks'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Clear Done Tasks Confirmation Modal */}
      {showClearConfirmation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          onClick={() => setShowClearConfirmation(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Clear Completed Tasks?</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Delete <strong>{doneTasksCount}</strong> completed task{doneTasksCount !== 1 ? 's' : ''}? 
              <span className="block mt-1 text-sm text-gray-500">This can't be undone.</span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirmation(false)}
                disabled={isClearing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Tasks
              </button>
              <button
                onClick={handleClearDoneTasks}
                disabled={isClearing}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SprintSettings;
