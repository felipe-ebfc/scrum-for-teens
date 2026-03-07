import { Task } from '@/types/Task';

export interface SprintMetrics {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  totalDurationHours: number;
  activeDurationHours: number;
  completedDurationHours: number;
  // Weekly workload metrics (excludes backlog tasks)
  workloadRemainingHours: number;
  workloadTotalHours: number;
  workloadPercentRemaining: number;
}

/**
 * Check if a task is completed - handles both status and completed fields
 */
export const isTaskCompleted = (task: Task): boolean => {
  return task.status === 'done' || task.completed === true;
};

/**
 * Get task duration in hours - handles both duration (minutes) and estimatedHours
 */
export const getTaskDurationHours = (task: Task): number => {
  // Priority: duration field (in minutes), then estimatedHours, then 0
  if (task.duration !== undefined && task.duration > 0) {
    return task.duration / 60; // Convert minutes to hours
  }
  return task.estimatedHours || 0;
};

/**
 * Calculate comprehensive sprint metrics excluding sample tasks
 */
export const calculateSprintMetrics = (tasks: Task[], includeArchived = false): SprintMetrics => {
  // Sprint metrics calculation
  
  // Filter out sample tasks and archived tasks
  const userTasks = tasks.filter(task => {
    // Exclude sample tasks (they have specific ID pattern)
    const isUserTask = !task.id.startsWith('10000000-');
    const includeTask = includeArchived || !task.archived;
    return isUserTask && includeTask;
  });
  
  // Sprint Progress calculation (excludes backlog tasks)
  // Only include tasks with status: todo, doing, done
  const sprintTasks = userTasks.filter(task => 
    task.status === 'todo' || task.status === 'doing' || task.status === 'done'
  );
  
  // activeCount = count of tasks with status IN ('todo', 'doing', 'done')
  const totalTasks = sprintTasks.length;
  // doneCount = count of tasks with status = 'done'
  const completedTasks = sprintTasks.filter(task => task.status === 'done').length;
  // Sprint Progress percent: if activeCount <= 0 then 0, else round to nearest whole percent
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate duration metrics (all tasks)
  const totalDurationHours = userTasks.reduce((total, task) => {
    return total + getTaskDurationHours(task);
  }, 0);
  
  const completedDurationHours = userTasks
    .filter(isTaskCompleted)
    .reduce((total, task) => {
      return total + getTaskDurationHours(task);
    }, 0);
  
  const activeDurationHours = totalDurationHours - completedDurationHours;
  
  // Calculate weekly workload metrics (excludes backlog tasks)
  // Only include tasks with status: todo, doing, done
  const nonBacklogTasks = userTasks.filter(task => 
    task.status === 'todo' || task.status === 'doing' || task.status === 'done'
  );
  
  // Total hours = sum of estimated_hours for todo + doing + done
  const workloadTotalHours = nonBacklogTasks.reduce((total, task) => {
    return total + getTaskDurationHours(task);
  }, 0);
  
  // Remaining hours = sum of estimated_hours for todo + doing (not done)
  const workloadRemainingHours = nonBacklogTasks
    .filter(task => task.status === 'todo' || task.status === 'doing')
    .reduce((total, task) => {
      return total + getTaskDurationHours(task);
    }, 0);
  
  // Percent remaining: if totalHours <= 0 then 0, else round to nearest whole percent
  const workloadPercentRemaining = workloadTotalHours > 0 
    ? Math.round((workloadRemainingHours / workloadTotalHours) * 100) 
    : 0;
  
  const metrics = {
    totalTasks,
    completedTasks,
    progressPercentage,
    totalDurationHours: Math.round(totalDurationHours * 10) / 10,
    activeDurationHours: Math.round(activeDurationHours * 10) / 10,
    completedDurationHours: Math.round(completedDurationHours * 10) / 10,
    workloadRemainingHours: Math.round(workloadRemainingHours * 10) / 10,
    workloadTotalHours: Math.round(workloadTotalHours * 10) / 10,
    workloadPercentRemaining,
  };
  
  return metrics;
};


/**
 * Calculate daily load metrics for a specific day excluding sample tasks
 */
export const calculateDailyMetrics = (tasks: Task[], dayIndex: number) => {
  const dayTasks = tasks.filter(task => 
    task.day === dayIndex && 
    !task.archived && 
    !task.id.startsWith('10000000-') // Exclude sample tasks
  );
  
  const totalMinutes = dayTasks.reduce((total, task) => {
    const duration = task.duration || (task.estimatedHours || 0) * 60;
    return total + duration;
  }, 0);
  
  const completedMinutes = dayTasks
    .filter(isTaskCompleted)
    .reduce((total, task) => {
      const duration = task.duration || (task.estimatedHours || 0) * 60;
      return total + duration;
    }, 0);
  
  const activeMinutes = totalMinutes - completedMinutes;
  const totalHours = totalMinutes / 60;
  const isOverloaded = totalMinutes > 720; // 12 hours = 720 minutes
  
  return {
    totalMinutes,
    completedMinutes,
    activeMinutes,
    totalHours: Math.round(totalHours * 10) / 10,
    isOverloaded,
    taskCount: dayTasks.length,
    completedTaskCount: dayTasks.filter(isTaskCompleted).length,
  };
};