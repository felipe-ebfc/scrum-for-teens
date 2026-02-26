import React, { useState } from 'react';
import { X, AlertCircle, Calendar, ArrowRight } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  subject: string;
  duration: string;
  startTime: string;
  completed: boolean;
  color: string;
  day: number;
}

interface ReplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  incompleteTasks: Task[];
  onReplanTasks: (tasks: Task[]) => void;
}

const ReplanModal: React.FC<ReplanModalProps> = ({
  isOpen,
  onClose,
  incompleteTasks,
  onReplanTasks
}) => {
  const [replanTasks, setReplanTasks] = useState<Task[]>(incompleteTasks);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const updateTaskDay = (taskId: string, newDay: number) => {
    setReplanTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, day: newDay } : task
      )
    );
  };

  const removeTask = (taskId: string) => {
    setReplanTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleSave = () => {
    onReplanTasks(replanTasks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Sprint Incomplete!</h2>
              <p className="text-sm text-gray-600">Replan your unfinished tasks for next week</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {replanTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Great job! All tasks completed! 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700 mb-4">
                You have {replanTasks.length} incomplete tasks. Choose which days to reschedule them:
              </p>
              
              {replanTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-gray-800">{task.title}</h3>
                        <p className="text-sm text-gray-600">{task.subject} • {task.duration}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Move to:</span>
                    <select
                      value={task.day}
                      onChange={(e) => updateTaskDay(task.id, parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {days.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip Replanning
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={16} />
            Replan Tasks
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplanModal;