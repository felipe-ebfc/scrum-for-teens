import React from 'react';
import { Task } from '../types/Task';
import { calculateDailyMetrics } from '../utils/sprintMetrics';

interface DailyProgressIndicatorProps {
  tasks: Task[];
  dayIndex: number;
  isMobile?: boolean;
}

const DailyProgressIndicator: React.FC<DailyProgressIndicatorProps> = ({
  tasks,
  dayIndex,
  isMobile = false
}) => {
  const CAPACITY_MINUTES = 720; // 12 hours in minutes
  
  // Use centralized calculation for consistency
  const dailyMetrics = calculateDailyMetrics(tasks, dayIndex);
  const { 
    totalMinutes, 
    totalHours, 
    isOverloaded, 
    taskCount,
    completedTaskCount 
  } = dailyMetrics;
  const capacityHours = CAPACITY_MINUTES / 60;
  
  // Calculate progress percentages
  const normalProgress = Math.min((totalMinutes / CAPACITY_MINUTES) * 100, 100);
  const overageProgress = totalMinutes > CAPACITY_MINUTES 
    ? ((totalMinutes - CAPACITY_MINUTES) / CAPACITY_MINUTES) * 100 
    : 0;
  
  // Format hours display
  const formatHours = (hours: number) => {
    return hours % 1 === 0 ? `${hours} hrs` : `${hours.toFixed(1)} hrs`;
  };

  if (isMobile) {
    // Mobile: Slim line indicator below day header
    return (
      <div className="w-full mt-1 mb-2">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div 
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${normalProgress}%` }}
            />
            {overageProgress > 0 && (
              <div 
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(overageProgress, 100)}%` }}
              />
            )}
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1 text-center">
          {formatHours(totalHours)} {isOverloaded && '(Overloaded)'}
        </div>
      </div>
    );
  }

  // Desktop: Full progress bar at bottom of column
  return (
    <div className="mt-4 pt-3 border-t border-gray-200">
      <div className="mb-2">
        <div className="text-xs font-medium text-gray-700 mb-1">
          {formatHours(totalHours)} scheduled
          {isOverloaded && <span className="text-red-600 ml-1">(Overloaded)</span>}
        </div>
        <div className="text-xs text-gray-500">
          Capacity: {formatHours(capacityHours)}
        </div>
      </div>
      
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div 
            className="bg-green-500 h-full transition-all duration-300 ease-in-out"
            style={{ width: `${normalProgress}%` }}
          />
          {overageProgress > 0 && (
            <div 
              className="bg-red-500 h-full transition-all duration-300 ease-in-out"
              style={{ width: `${Math.min(overageProgress, 100)}%` }}
            />
          )}
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0 hrs</span>
        <span>{formatHours(capacityHours)}</span>
        {isOverloaded && (
          <span className="text-red-600 font-medium">
            +{formatHours(totalHours - capacityHours)}
          </span>
        )}
      </div>
    </div>
  );
};

export default DailyProgressIndicator;