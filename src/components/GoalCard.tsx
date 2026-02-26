import React from 'react';
import { Calendar, Target, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Goal } from '@/types/Goal';

interface GoalCardProps {
  goal: Goal;
  onClick?: (goal: Goal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick }) => {
  const isCompleted = goal.status === 'completed';
  // Check if targetDate exists and is a valid date (handle null properly)
  const hasTargetDate = goal.targetDate !== null && goal.targetDate !== undefined && !isNaN(new Date(goal.targetDate).getTime());
  const isOverdue = hasTargetDate && new Date() > new Date(goal.targetDate!) && !isCompleted;

  const statusColors = {
    active: 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-md',
    completed: 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-md',
    paused: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 hover:shadow-md',
    cancelled: 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-md'
  };

  const handleClick = () => {
    if (onClick) {
      onClick(goal);
    }
  };

  return (
    <Card 
      className={`${statusColors[goal.status]} cursor-pointer transition-all duration-200 select-none`}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <CardTitle className="text-base font-semibold truncate">{goal.title}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs capitalize flex-shrink-0 ${
              isCompleted ? 'bg-green-100 text-green-700 border-green-300' : 
              isOverdue ? 'bg-red-100 text-red-700 border-red-300' :
              'bg-blue-100 text-blue-700 border-blue-300'
            }`}
          >
            {isCompleted ? 'Done' : isOverdue ? 'Overdue' : 'Active'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Description */}
        {goal.description && (
          <p className="text-gray-600 text-sm line-clamp-2">{goal.description}</p>
        )}

        {/* Target Date - only show if there is a valid target date */}
        {hasTargetDate && goal.targetDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span className={isOverdue && !isCompleted ? 'text-red-600 font-medium' : ''}>
              {isOverdue && !isCompleted ? 'Overdue: ' : 'Target: '}
              {new Date(goal.targetDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: new Date(goal.targetDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </span>
          </div>
        )}


        {/* Click hint */}
        <p className="text-xs text-gray-400 italic">Click to edit</p>
      </CardContent>
    </Card>
  );
};
