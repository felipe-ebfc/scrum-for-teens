export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'skill' | 'project' | 'habit';
  type: 'sprint' | 'milestone' | 'ongoing';
  
  // SMART Goal components
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  
  // Progress tracking
  targetValue: number;
  currentValue: number;
  unit: string; // 'tasks', 'hours', 'chapters', 'points'
  
  // Dates
  startDate: Date;
  targetDate: Date | null; // Optional - can be null if no target date is set
  completedDate?: Date;

  
  // Status and priority
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  
  // Rewards and motivation
  milestones: GoalMilestone[];
  reward?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  reward: string;
  completed: boolean;
  completedDate?: Date;
}

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: Goal['category'];
  type: Goal['type'];
  defaultTargetValue: number;
  defaultUnit: string;
  smartTemplate: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  suggestedMilestones: Omit<GoalMilestone, 'id' | 'completed' | 'completedDate'>[];
}