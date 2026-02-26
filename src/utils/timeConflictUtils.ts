import { Task } from '../types/Task';

export interface TimeConflict {
  conflictingTask: Task;
  overlapMinutes: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface ConflictResolution {
  type: 'reschedule' | 'swap' | 'split' | 'cancel';
  suggestedTime?: string;
  swapTask?: Task;
  message: string;
}

// Convert time string (HH:MM) to minutes since midnight
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};


// Convert minutes since midnight to time string (HH:MM)
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Convert 24-hour time to 12-hour AM/PM format
export const formatTimeAMPM = (timeStr: string): string => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return timeStr;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Get end time for a task
export const getTaskEndTime = (task: Task): string => {
  const startMinutes = timeToMinutes(task.startTime);
  const endMinutes = startMinutes + task.duration;
  return minutesToTime(endMinutes);
};

// Check if two tasks have time conflicts
export const hasTimeConflict = (task1: Task, task2: Task): boolean => {
  if (task1.day !== task2.day) return false;
  
  const task1Start = timeToMinutes(task1.startTime);
  const task1End = task1Start + task1.duration;
  const task2Start = timeToMinutes(task2.startTime);
  const task2End = task2Start + task2.duration;
  
  return (task1Start < task2End && task2Start < task1End);
};

// Get overlap duration between two tasks
export const getOverlapMinutes = (task1: Task, task2: Task): number => {
  if (!hasTimeConflict(task1, task2)) return 0;
  
  const task1Start = timeToMinutes(task1.startTime);
  const task1End = task1Start + task1.duration;
  const task2Start = timeToMinutes(task2.startTime);
  const task2End = task2Start + task2.duration;
  
  const overlapStart = Math.max(task1Start, task2Start);
  const overlapEnd = Math.min(task1End, task2End);
  
  return overlapEnd - overlapStart;
};

// Find all conflicts for a task on a specific day
export const findTimeConflicts = (task: Task, dayTasks: Task[]): TimeConflict[] => {
  return dayTasks
    .filter(t => t.id !== task.id && hasTimeConflict(task, t))
    .map(conflictingTask => ({
      conflictingTask,
      overlapMinutes: getOverlapMinutes(task, conflictingTask)
    }));
};

// Generate available time slots for a day
export const getAvailableTimeSlots = (
  dayTasks: Task[], 
  duration: number, 
  startHour: number = 8, 
  endHour: number = 18
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const dayStart = startHour * 60;
  const dayEnd = endHour * 60;
  
  // Sort tasks by start time
  const sortedTasks = dayTasks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  
  let currentTime = dayStart;
  
  for (const task of sortedTasks) {
    const taskStart = timeToMinutes(task.startTime);
    const taskEnd = taskStart + task.duration;
    
    // Check if there's space before this task
    if (currentTime + duration <= taskStart) {
      slots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(currentTime + duration),
        available: true
      });
    }
    
    currentTime = Math.max(currentTime, taskEnd);
  }
  
  // Check if there's space after the last task
  if (currentTime + duration <= dayEnd) {
    slots.push({
      startTime: minutesToTime(currentTime),
      endTime: minutesToTime(currentTime + duration),
      available: true
    });
  }
  
  return slots;
};

// Suggest conflict resolutions
export const suggestResolutions = (
  task: Task, 
  conflicts: TimeConflict[], 
  allTasks: Task[]
): ConflictResolution[] => {
  const resolutions: ConflictResolution[] = [];
  const dayTasks = allTasks.filter(t => t.day === task.day && t.id !== task.id);
  
  // Suggest rescheduling to available slots
  const availableSlots = getAvailableTimeSlots(dayTasks, task.duration);
  if (availableSlots.length > 0) {
    availableSlots.slice(0, 3).forEach((slot, index) => {
      resolutions.push({
        type: 'reschedule',
        suggestedTime: slot.startTime,
        message: `Reschedule to ${slot.startTime} - ${slot.endTime}`
      });
    });
  }
  
  // Suggest swapping with conflicting tasks
  conflicts.forEach(conflict => {
    if (conflict.conflictingTask.duration === task.duration) {
      resolutions.push({
        type: 'swap',
        swapTask: conflict.conflictingTask,
        message: `Swap times with "${conflict.conflictingTask.title}"`
      });
    }
  });
  
  // Always offer cancel option
  resolutions.push({
    type: 'cancel',
    message: 'Cancel move and keep original time'
  });
  
  return resolutions;
};