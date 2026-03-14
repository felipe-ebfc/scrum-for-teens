import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Target, Dices } from 'lucide-react';
import { Task } from '@/types/Task';

interface EstimationAccuracyProps {
  tasks: Task[];
  onOpenPoker: () => void;
}

/**
 * EstimationAccuracy — Dashboard widget showing estimation quality
 * 
 * Shows:
 * - Overall accuracy percentage
 * - Count of estimated vs unestimated tasks
 * - CTA to open Planning Poker for unestimated tasks
 */
const EstimationAccuracy: React.FC<EstimationAccuracyProps> = ({ tasks, onOpenPoker }) => {
  const stats = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.archived);
    const withEstimates = activeTasks.filter((t) => t.estimatedHours > 0);
    const unestimated = activeTasks.filter((t) => !t.estimatedHours && t.status !== 'done');
    const completedWithBoth = activeTasks.filter(
      (t) => t.status === 'done' && t.estimatedHours > 0 && t.actualHours > 0
    );

    let accuracyPct = 0;
    let overallTrend: 'over' | 'under' | 'accurate' = 'accurate';

    if (completedWithBoth.length > 0) {
      const totalEstimated = completedWithBoth.reduce((s, t) => s + t.estimatedHours, 0);
      const totalActual = completedWithBoth.reduce((s, t) => s + t.actualHours, 0);
      const ratio = totalActual / totalEstimated;
      accuracyPct = Math.max(0, Math.round((1 - Math.abs(1 - ratio)) * 100));
      overallTrend = ratio > 1.15 ? 'under' : ratio < 0.85 ? 'over' : 'accurate';
    }

    return {
      totalActive: activeTasks.length,
      estimatedCount: withEstimates.length,
      unestimatedCount: unestimated.length,
      completedWithBoth: completedWithBoth.length,
      accuracyPct,
      overallTrend,
    };
  }, [tasks]);

  // Don't render if user has no tasks at all
  if (stats.totalActive === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Dices className="w-5 h-5 text-pink-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Planning Poker</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Accuracy Circle */}
        <div className="flex flex-col items-center justify-center text-center">
          {stats.completedWithBoth > 0 ? (
            <>
              <div className="relative w-20 h-20 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke={stats.accuracyPct >= 80 ? '#10b981' : stats.accuracyPct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(stats.accuracyPct / 100) * 94.2} 94.2`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-800">{stats.accuracyPct}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Estimation Accuracy
              </p>
              <div className="flex items-center gap-1 mt-1">
                {stats.overallTrend === 'under' && (
                  <span className="text-xs text-orange-500 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    Underestimating
                  </span>
                )}
                {stats.overallTrend === 'over' && (
                  <span className="text-xs text-blue-500 flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" />
                    Overestimating
                  </span>
                )}
                {stats.overallTrend === 'accurate' && (
                  <span className="text-xs text-green-500 flex items-center gap-0.5">
                    <Target className="w-3 h-3" />
                    Right on target
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-3">
              <Sparkles className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400 leading-tight text-center">
                Complete estimated tasks to see your accuracy
              </p>
            </div>
          )}
        </div>

        {/* Stats + CTA */}
        <div className="flex flex-col justify-center space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Estimated</span>
              <span className="font-medium text-gray-800">
                {stats.estimatedCount}/{stats.totalActive}
              </span>
            </div>
            {stats.unestimatedCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Need estimates</span>
                <span className="font-medium text-pink-600">
                  {stats.unestimatedCount}
                </span>
              </div>
            )}
          </div>

          {stats.unestimatedCount > 0 ? (
            <button
              onClick={onOpenPoker}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
            >
              <Dices className="w-4 h-4" />
              Estimate Tasks
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
              <Target className="w-4 h-4" />
              All estimated!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstimationAccuracy;
