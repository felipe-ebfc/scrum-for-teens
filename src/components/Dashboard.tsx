import React, { useState } from 'react';
import { Target, Clock, BookOpen, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SampleSprintModal from './SampleSprintModal';
import SprintVelocityChart from './SprintVelocityChart';
import EstimationAccuracy from './EstimationAccuracy';
import PlanningPoker from './PlanningPoker';
import { GoalsPage } from './GoalsPage';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { Task } from '@/types/Task';


interface DashboardProps {
  sprintProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  workloadRemainingHours: number;
  workloadTotalHours: number;
  workloadPercentRemaining: number;
  tasks: Task[];
  sprintStartDate?: string;
  sprintDurationDays?: number;
  onNavigateToBoard?: () => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
}

const Dashboard: React.FC<DashboardProps> = ({
  sprintProgress,
  tasksCompleted,
  totalTasks,
  workloadRemainingHours,
  workloadTotalHours,
  workloadPercentRemaining,
  tasks,
  sprintStartDate,
  sprintDurationDays,
  onNavigateToBoard,
  onUpdateTask,
}) => {

  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showPlanningPoker, setShowPlanningPoker] = useState(false);
  const { totalChapters, completedChapters, loading: chaptersLoading } = useLearningProgress();

  return (
    <div className="space-y-6">
      {/* Hero Section with Book Cover - Constrained width, reduced height */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 rounded-2xl py-4 px-5 sm:py-5 sm:px-6 text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-4 h-6 bg-yellow-300 rounded transform rotate-12"></div>
          <div className="absolute top-8 right-16 w-6 h-4 bg-green-300 rounded transform -rotate-6"></div>
          <div className="absolute bottom-6 left-12 w-4 h-5 bg-pink-300 rounded transform rotate-45"></div>
          <div className="absolute bottom-10 right-6 w-5 h-4 bg-purple-300 rounded transform -rotate-12"></div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 relative z-10">
          {/* Book Cover - Fixed size with subtle shadow anchor */}
          <img
            src="https://d64gsuwffb70l.cloudfront.net/68cb7ad2f4237b94daaac269_1758501748670_72f18d27.png"
            alt="Scrum for Teens Book Cover"
            className="w-24 h-32 sm:w-28 sm:h-36 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.3)] ring-1 ring-white/20 flex-shrink-0 object-cover"
          />
          
          {/* Text Content */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-[1.15]">
              Scrum for Teens: Level Up Your Learning
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mb-2">
              Master real Scrum techniques to plan smarter and stress less.
            </p>
            <p className="text-xs sm:text-sm text-blue-200 mb-4">
              Based on the book by <span className="font-semibold text-white">Noah Engineer-Manriquez</span>
            </p>
            
            {/* Primary CTA Button */}
            {onNavigateToBoard && (
              <Button 
                onClick={onNavigateToBoard}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg w-full sm:w-auto"
              >
                Go to My Scrum Board
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>




      {/* Main Metrics Row - Responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sprint Progress */}
        <div className="bg-white rounded-xl shadow-md p-5 min-h-[120px] flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
              <Target className="text-green-600 w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-800 leading-none">{sprintProgress}%</p>
              <p className="text-sm font-medium text-gray-600 mt-1">Sprint Progress</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">Backlog items not counted</p>
            </div>
          </div>
        </div>

        {/* Tasks Done */}
        <div className="bg-white rounded-xl shadow-md p-5 min-h-[120px] flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
              <CheckCircle2 className="text-green-600 w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-800 leading-none">{tasksCompleted}<span className="text-lg text-gray-500 font-normal">/{totalTasks}</span></p>
              <p className="text-sm font-medium text-gray-600 mt-1">Tasks Done</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">Excludes backlog items</p>
            </div>
          </div>
        </div>

        {/* Weekly Workload */}
        <div className="bg-white rounded-xl shadow-md p-5 min-h-[120px] flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <Clock className="text-blue-600 w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-800 leading-none">
                {workloadRemainingHours.toFixed(1)}<span className="text-lg text-gray-500 font-normal">h</span>
              </p>
              <p className="text-sm font-medium text-gray-600 mt-1">Weekly Workload</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{workloadPercentRemaining}% of {workloadTotalHours.toFixed(1)}h left</p>
            </div>
          </div>
        </div>

        {/* Chapters Done */}
        <div className="bg-white rounded-xl shadow-md p-5 min-h-[120px] flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <BookOpen className="text-blue-600 w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-800 leading-none">
                {chaptersLoading ? (
                  <span className="text-gray-400">...</span>
                ) : (
                  <>{completedChapters}<span className="text-lg text-gray-500 font-normal">/{totalChapters}</span></>
                )}
              </p>
              <p className="text-sm font-medium text-gray-600 mt-1">Chapters Done</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">Finish all takeaways per chapter</p>
            </div>
          </div>
        </div>
      </div>

      {/* Planning Poker + Sprint Burndown — side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <EstimationAccuracy
            tasks={tasks}
            onOpenPoker={() => setShowPlanningPoker(true)}
          />
        </div>
        <div className="lg:col-span-2">
          <SprintVelocityChart
            tasks={tasks}
            sprintStartDate={sprintStartDate}
            sprintDurationDays={sprintDurationDays}
          />
        </div>
      </div>

      {/* Goals Section - No extra wrapper, GoalsPage handles its own layout */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <GoalsPage />
      </div>

      <SampleSprintModal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
      />

      {/* Planning Poker Modal */}
      {showPlanningPoker && onUpdateTask && (
        <PlanningPoker
          tasks={tasks}
          onUpdateTask={onUpdateTask}
          onClose={() => setShowPlanningPoker(false)}
        />
      )}
    </div>

  );
};

export default Dashboard;
