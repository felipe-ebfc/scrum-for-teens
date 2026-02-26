import React, { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoalCard } from './GoalCard';
import { GoalModal } from './GoalModal';
import { Goal } from '@/types/Goal';
import { useGoals } from '@/hooks/useGoals';

const MAX_GOALS = 3;

export const GoalsPage: React.FC = () => {
  const { goals, loading, error, createGoal, updateGoal, deleteGoal } = useGoals();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const canCreateGoal = goals.length < MAX_GOALS;

  const handleCreateGoal = () => {
    if (!canCreateGoal) return;
    setSelectedGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (goalData: any) => {
    try {
      if (selectedGoal) {
        await updateGoal(selectedGoal.id, goalData);
      } else {
        await createGoal(goalData);
      }
      setIsModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      setIsModalOpen(false);
      setSelectedGoal(null);
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading goals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-3 text-sm">Error loading goals: {error}</div>
        <Button onClick={() => window.location.reload()} size="sm">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <h2 className="text-xl font-bold text-gray-800">Scrum Goals</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {!canCreateGoal && (
            <p className="text-sm text-amber-600 font-medium">
              You can have up to {MAX_GOALS} goals.
            </p>
          )}
          <Button 
            onClick={handleCreateGoal} 
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            disabled={!canCreateGoal}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Goal
          </Button>
        </div>
      </div>



      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={handleEditGoal}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Scrum Goals yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Create up to {MAX_GOALS} goals to track what matters most to you.
          </p>
          <Button onClick={handleCreateGoal} className="bg-blue-600 hover:bg-blue-700" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Goal
          </Button>
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedGoal(null);
        }}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        goal={selectedGoal}
      />
    </div>
  );
};
