import React, { useState, useMemo, useCallback } from 'react';
import { Dices, ChevronRight, Check, Sparkles, X, RotateCcw } from 'lucide-react';
import { Task } from '@/types/Task';
import { toast } from 'sonner';

interface PlanningPokerProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Fibonacci estimation values (in hours)                             */
/* ------------------------------------------------------------------ */
const ESTIMATION_VALUES = [
  { value: 0.5, label: '½', description: 'Quick task — 30 min' },
  { value: 1,   label: '1',  description: '1 hour focus block' },
  { value: 2,   label: '2',  description: 'A good study session' },
  { value: 3,   label: '3',  description: 'Half a day\'s work' },
  { value: 5,   label: '5',  description: 'Most of a day' },
  { value: 8,   label: '8',  description: 'A full day of effort' },
  { value: 13,  label: '13', description: 'Break this one down! 🤔' },
];

/* ------------------------------------------------------------------ */
/*  Single Estimation Card with flip animation                         */
/* ------------------------------------------------------------------ */
const EstimationCard: React.FC<{
  value: number;
  label: string;
  description: string;
  isSelected: boolean;
  isRevealed: boolean;
  onSelect: () => void;
}> = ({ value, label, description, isSelected, isRevealed, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`
        group relative w-16 h-24 sm:w-20 sm:h-28
        perspective-500
        transition-transform duration-200
        ${isSelected ? 'scale-110 z-10' : 'hover:scale-105'}
      `}
      aria-label={`Estimate ${value} hours`}
    >
      {/* Card container with flip */}
      <div
        className={`
          relative w-full h-full transition-transform duration-500 transform-style-3d
          ${isRevealed ? 'rotate-y-180' : ''}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Front face — card back (face down) */}
        <div
          className={`
            absolute inset-0 rounded-xl border-2 flex items-center justify-center
            backface-hidden
            ${isSelected
              ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-400 shadow-lg shadow-blue-200'
              : 'bg-gradient-to-br from-blue-100 to-purple-100 border-blue-200 hover:border-blue-400 hover:shadow-md'
            }
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className={`text-2xl sm:text-3xl font-bold ${isSelected ? 'text-white' : 'text-blue-600'}`}>
            {label}
          </span>
        </div>

        {/* Back face — revealed card */}
        <div
          className={`
            absolute inset-0 rounded-xl border-2 flex flex-col items-center justify-center
            bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 shadow-lg
            backface-hidden
          `}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <span className="text-2xl sm:text-3xl font-bold text-green-700">{label}</span>
          <span className="text-xs text-green-600 mt-1">hrs</span>
        </div>
      </div>
    </button>
  );
};

/* ------------------------------------------------------------------ */
/*  Accuracy star rating                                               */
/* ------------------------------------------------------------------ */
const AccuracyStar: React.FC<{ ratio: number }> = ({ ratio }) => {
  // ratio = actual / estimated; 1.0 = perfect
  let emoji = '🎯';
  let label = 'Perfect estimate!';
  let color = 'text-green-600';

  if (ratio === 0) {
    emoji = '⏳';
    label = 'No actual hours logged';
    color = 'text-gray-400';
  } else if (ratio <= 0.5) {
    emoji = '🚀';
    label = 'Way faster than expected!';
    color = 'text-blue-600';
  } else if (ratio <= 0.8) {
    emoji = '⚡';
    label = 'Faster than expected';
    color = 'text-blue-500';
  } else if (ratio <= 1.2) {
    emoji = '🎯';
    label = 'Great estimate!';
    color = 'text-green-600';
  } else if (ratio <= 1.5) {
    emoji = '📈';
    label = 'Took a bit longer';
    color = 'text-orange-500';
  } else {
    emoji = '🐢';
    label = 'Way longer than expected';
    color = 'text-red-500';
  }

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Planning Poker Component                                      */
/* ------------------------------------------------------------------ */
const PlanningPoker: React.FC<PlanningPokerProps> = ({
  tasks,
  onUpdateTask,
  onClose,
}) => {
  // Unestimated tasks: estimatedHours is 0 or undefined, status is not 'done'
  const unestimatedTasks = useMemo(
    () => tasks.filter((t) => !t.estimatedHours && t.status !== 'done' && !t.archived),
    [tasks]
  );

  // Completed tasks with estimates for accuracy review
  const completedWithEstimates = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.estimatedHours > 0 && !t.archived),
    [tasks]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [showAccuracy, setShowAccuracy] = useState(false);

  const currentTask = unestimatedTasks[currentIndex];
  const totalUnestimated = unestimatedTasks.length;
  const hasMoreTasks = currentIndex < totalUnestimated - 1;

  const handleSelectCard = useCallback((value: number) => {
    if (isRevealed) return; // Don't allow re-selection after reveal
    setSelectedValue(value);
  }, [isRevealed]);

  const handleReveal = useCallback(() => {
    if (selectedValue === null) {
      toast.error('Pick a card first! 🃏');
      return;
    }
    setIsRevealed(true);
  }, [selectedValue]);

  const handleConfirm = useCallback(async () => {
    if (!currentTask || selectedValue === null) return;

    setIsSaving(true);
    try {
      const success = await onUpdateTask(currentTask.id, {
        estimatedHours: selectedValue,
      });

      if (success) {
        setEstimatedCount((prev) => prev + 1);
        toast.success(`Estimated "${currentTask.title}" at ${selectedValue}h ✨`);

        // Move to next task or show completion
        if (hasMoreTasks) {
          setCurrentIndex((prev) => prev + 1);
          setSelectedValue(null);
          setIsRevealed(false);
        } else {
          // All done!
          setSelectedValue(null);
          setIsRevealed(false);
          setCurrentIndex(totalUnestimated); // Move past the last task
        }
      } else {
        toast.error('Failed to save estimate. Try again.');
      }
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentTask, selectedValue, onUpdateTask, hasMoreTasks, totalUnestimated]);

  const handleSkip = useCallback(() => {
    if (hasMoreTasks) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedValue(null);
      setIsRevealed(false);
    } else {
      setCurrentIndex(totalUnestimated);
    }
  }, [hasMoreTasks, totalUnestimated]);

  const handleReset = useCallback(() => {
    setSelectedValue(null);
    setIsRevealed(false);
  }, []);

  // ---------- Accuracy Review View ----------
  if (showAccuracy) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div
          className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Estimation Accuracy</h2>
            </div>
            <button
              onClick={() => setShowAccuracy(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white"
              aria-label="Back"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-120px)]">
            {completedWithEstimates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No completed tasks with estimates yet.</p>
                <p className="text-gray-400 text-sm mt-1">
                  Estimate tasks here, then complete them to see your accuracy!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">
                  How accurate were your estimates? The closer to 🎯, the better you're getting at Planning Poker!
                </p>
                {completedWithEstimates.map((task) => {
                  const ratio = task.actualHours > 0 ? task.actualHours / task.estimatedHours : 0;
                  return (
                    <div
                      key={task.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Est: {task.estimatedHours}h</span>
                            <span>•</span>
                            <span>Actual: {task.actualHours > 0 ? `${task.actualHours}h` : '—'}</span>
                          </div>
                        </div>
                        <AccuracyStar ratio={ratio} />
                      </div>
                    </div>
                  );
                })}

                {/* Overall accuracy */}
                {completedWithEstimates.filter((t) => t.actualHours > 0).length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 mt-4">
                    <p className="text-sm font-semibold text-purple-800">
                      Overall Accuracy
                    </p>
                    {(() => {
                      const withActual = completedWithEstimates.filter((t) => t.actualHours > 0);
                      const totalEstimated = withActual.reduce((s, t) => s + t.estimatedHours, 0);
                      const totalActual = withActual.reduce((s, t) => s + t.actualHours, 0);
                      const overallRatio = totalActual / totalEstimated;
                      const accuracyPct = Math.round((1 - Math.abs(1 - overallRatio)) * 100);

                      return (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-sm text-purple-600">
                            {totalEstimated}h estimated → {totalActual}h actual
                          </div>
                          <div className="text-2xl font-bold text-purple-700">
                            {Math.max(0, accuracyPct)}%
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-3 flex justify-end">
            <button
              onClick={() => setShowAccuracy(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              Back to Poker
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- All Estimated View ----------
  if (currentIndex >= totalUnestimated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div
          className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 px-6 py-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {estimatedCount > 0 ? 'All Tasks Estimated!' : 'No Tasks to Estimate'}
            </h2>
            <p className="text-green-100 text-sm">
              {estimatedCount > 0
                ? `You estimated ${estimatedCount} task${estimatedCount !== 1 ? 's' : ''} this session. Nice work!`
                : 'All your active tasks already have estimates. Come back when you add new ones!'}
            </p>
          </div>

          <div className="px-6 py-4 space-y-3">
            {completedWithEstimates.length > 0 && (
              <button
                onClick={() => setShowAccuracy(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 font-medium text-sm border border-purple-200"
              >
                <Sparkles className="w-4 h-4" />
                View Estimation Accuracy
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Main Estimation View ----------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dices className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Planning Poker</h2>
            </div>
            <div className="flex items-center gap-2">
              {completedWithEstimates.length > 0 && (
                <button
                  onClick={() => setShowAccuracy(true)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
                  aria-label="View accuracy"
                  title="Estimation accuracy"
                >
                  <Sparkles size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {/* Progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${((currentIndex + (isRevealed ? 1 : 0)) / totalUnestimated) * 100}%`,
                }}
              />
            </div>
            <span className="text-white/80 text-xs font-medium">
              {currentIndex + 1}/{totalUnestimated}
            </span>
          </div>
        </div>

        {/* Task Being Estimated */}
        <div className="px-6 py-5">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-5">
            <p className="text-sm text-gray-500 mb-1">How long will this take?</p>
            <h3 className="text-base font-semibold text-gray-800 leading-snug">
              {currentTask.title}
            </h3>
            {currentTask.description && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                {currentTask.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3">
              {currentTask.subject && (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    currentTask.color ? 'text-white' : 'text-gray-600 border border-gray-200'
                  }`}
                  style={{ backgroundColor: currentTask.color || undefined }}
                >
                  {currentTask.subject}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                currentTask.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : currentTask.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {currentTask.priority}
              </span>
            </div>
          </div>

          {/* Estimation Cards */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-5">
            {ESTIMATION_VALUES.map((est) => (
              <EstimationCard
                key={est.value}
                value={est.value}
                label={est.label}
                description={est.description}
                isSelected={selectedValue === est.value}
                isRevealed={isRevealed && selectedValue === est.value}
                onSelect={() => handleSelectCard(est.value)}
              />
            ))}
          </div>

          {/* Selected description */}
          <div className="h-6 text-center mb-4">
            {selectedValue !== null && (
              <p className="text-sm text-gray-500 animate-fade-in">
                {ESTIMATION_VALUES.find((e) => e.value === selectedValue)?.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isRevealed ? (
              <>
                <button
                  onClick={handleSkip}
                  className="flex-none px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                  Skip
                </button>
                <button
                  onClick={handleReveal}
                  disabled={selectedValue === null}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedValue !== null
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Dices className="w-4 h-4" />
                  Reveal Card
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReset}
                  className="flex-none px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-pick
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                >
                  {isSaving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm {selectedValue}h
                      {hasMoreTasks && (
                        <ChevronRight className="w-4 h-4 ml-1" />
                      )}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningPoker;
