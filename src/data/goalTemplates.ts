import { GoalTemplate } from '@/types/Goal';

export const goalTemplates: GoalTemplate[] = [
  {
    id: 'complete-sprint-tasks',
    title: 'Complete Sprint Tasks',
    description: 'Finish all planned tasks in the current sprint',
    category: 'project',
    type: 'sprint',
    defaultTargetValue: 10,
    defaultUnit: 'tasks',
    smartTemplate: {
      specific: 'Complete all tasks assigned to the current sprint',
      measurable: 'Track completion of {target} tasks',
      achievable: 'Based on current capacity and past performance',
      relevant: 'Directly supports learning objectives and skill development',
      timeBound: 'By the end of the current sprint period'
    },
    suggestedMilestones: [
      {
        title: '25% Complete',
        description: 'Quarter of tasks completed',
        targetValue: 0.25,
        reward: 'Study break badge'
      },
      {
        title: '50% Complete', 
        description: 'Half of tasks completed',
        targetValue: 0.5,
        reward: 'Momentum builder badge'
      },
      {
        title: '75% Complete',
        description: 'Three quarters completed',
        targetValue: 0.75,
        reward: 'Almost there badge'
      }
    ]
  },
  {
    id: 'study-hours',
    title: 'Study Time Goal',
    description: 'Dedicate focused study hours to learning',
    category: 'learning',
    type: 'sprint',
    defaultTargetValue: 20,
    defaultUnit: 'hours',
    smartTemplate: {
      specific: 'Spend focused time studying and completing tasks',
      measurable: 'Track {target} hours of study time',
      achievable: 'Approximately 1-2 hours per day',
      relevant: 'Essential for mastering new concepts and skills',
      timeBound: 'Within the current sprint timeframe'
    },
    suggestedMilestones: [
      {
        title: 'First 5 Hours',
        description: 'Getting into the rhythm',
        targetValue: 5,
        reward: 'Study starter badge'
      },
      {
        title: 'Halfway Point',
        description: 'Consistent progress made',
        targetValue: 10,
        reward: 'Consistency champion badge'
      }
    ]
  }
];