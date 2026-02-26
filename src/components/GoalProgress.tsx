import React from 'react';
import { Goal } from '@/types/Goal';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Calendar } from 'lucide-react';

interface GoalProgressProps {
  goals: Goal[];
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ goals }) => {
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  
  const totalProgress = activeGoals.length > 0 
    ? activeGoals.reduce((acc, goal) => acc + (goal.currentValue / goal.targetValue * 100), 0) / activeGoals.length
    : 0;

  const upcomingDeadlines = activeGoals
    .filter(goal => {
      const daysUntilDue = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 7 && daysUntilDue >= 0;
    })
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  return (
    <div className="space-y-4">
      {/* Overall Progress - Compact Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-800">Progress Overview</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{activeGoals.length}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedGoals.length}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(totalProgress)}%</div>
            <div className="text-xs text-gray-600">Avg Progress</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium text-gray-800">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>
      </div>

      {/* Upcoming Deadlines - Only show if there are any */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-gray-800">Due This Week</h3>
          </div>
          
          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 3).map(goal => {
              const daysUntilDue = Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={goal.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-800 text-sm truncate">{goal.title}</h4>
                    <p className="text-xs text-gray-500">
                      {goal.currentValue}/{goal.targetValue} {goal.unit}
                    </p>
                  </div>
                  <div className={`text-xs font-medium ml-2 flex-shrink-0 ${daysUntilDue <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                    {daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d left`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Completions - Only show if there are any */}
      {completedGoals.length > 0 && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-800">Recently Completed</h3>
          </div>
          
          <div className="space-y-2">
            {completedGoals
              .sort((a, b) => new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime())
              .slice(0, 2)
              .map(goal => (
                <div key={goal.id} className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg">
                  <Trophy className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-800 text-sm truncate">{goal.title}</h4>
                    <p className="text-xs text-gray-500">
                      {goal.completedDate ? new Date(goal.completedDate).toLocaleDateString() : 'Completed'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
