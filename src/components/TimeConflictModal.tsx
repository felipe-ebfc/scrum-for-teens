import React from 'react';
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { Task } from '../types/Task';
import { TimeConflict, ConflictResolution, formatTimeAMPM, getTaskEndTime } from '../utils/timeConflictUtils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';

interface TimeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  targetDay: number;
  conflicts: TimeConflict[];
  resolutions: ConflictResolution[];
  onResolve: (resolution: ConflictResolution) => void;
}

const TimeConflictModal: React.FC<TimeConflictModalProps> = ({
  isOpen,
  onClose,
  task,
  targetDay,
  conflicts,
  resolutions,
  onResolve
}) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const getResolutionIcon = (type: ConflictResolution['type']) => {
    switch (type) {
      case 'reschedule': return <Clock className="w-4 h-4" />;
      case 'swap': return <ArrowRight className="w-4 h-4" />;
      case 'cancel': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getResolutionColor = (type: ConflictResolution['type']) => {
    switch (type) {
      case 'reschedule': return 'bg-blue-500 hover:bg-blue-600';
      case 'swap': return 'bg-green-500 hover:bg-green-600';
      case 'cancel': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Time Conflict Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Task being moved */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Task to Move</h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: task.color }}></div>
              <div>
                <p className="font-medium">{task.title}</p>

                <p className="text-sm text-gray-600">
                  {formatTimeAMPM(task.startTime)} - {formatTimeAMPM(getTaskEndTime(task))} → {dayNames[targetDay]}
                </p>
              </div>
            </div>
          </div>

          {/* Conflicting tasks */}
          <div className="space-y-3">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Conflicting Tasks
            </h3>
            {conflicts.map((conflict, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: conflict.conflictingTask.color }}
                  ></div>
                  <div className="flex-1">
                    <p className="font-medium">{conflict.conflictingTask.title}</p>
                    <p className="text-sm text-gray-600">
                      {formatTimeAMPM(conflict.conflictingTask.startTime)} - {formatTimeAMPM(getTaskEndTime(conflict.conflictingTask))}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {formatDuration(conflict.overlapMinutes)} overlap
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution options */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Resolution Options</h3>
            <div className="grid gap-2">
              {resolutions.map((resolution, index) => (
                <Button
                  key={index}
                  onClick={() => onResolve(resolution)}
                  className={`justify-start gap-3 h-auto p-4 ${getResolutionColor(resolution.type)} text-white`}
                  variant="default"
                >
                  {getResolutionIcon(resolution.type)}
                  <div className="text-left">
                    <p className="font-medium">{resolution.message}</p>
                    {resolution.suggestedTime && (
                       <p className="text-sm opacity-90">
                         New time: {formatTimeAMPM(resolution.suggestedTime)}
                       </p>
                    )}
                    {resolution.swapTask && (
                       <p className="text-sm opacity-90">
                         "{resolution.swapTask.title}" will move to {formatTimeAMPM(task.startTime)}
                       </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeConflictModal;