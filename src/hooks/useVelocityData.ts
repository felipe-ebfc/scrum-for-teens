import { useMemo } from 'react';
import { Task } from '@/types/Task';
import { isTaskCompleted, getTaskDurationHours } from '@/utils/sprintMetrics';

export interface VelocityDataPoint {
  /** Day label, e.g. "Mon", "Day 1" */
  label: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Ideal remaining tasks (straight line from total → 0) */
  ideal: number;
  /** Actual remaining tasks at end of this day */
  actual: number | null;
  /** Cumulative completed tasks */
  completed: number;
  /** Cumulative completed hours */
  completedHours: number;
}

export interface VelocityStats {
  /** Current streak of consecutive days with at least one completion */
  streak: number;
  /** Best single-day completion count */
  bestDay: number;
  /** Best day label */
  bestDayLabel: string;
  /** Average tasks completed per day (only days that have passed) */
  avgPerDay: number;
  /** Whether the user is ahead, on track, or behind the ideal line */
  pacing: 'ahead' | 'on-track' | 'behind';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Derive daily velocity / burndown data from the task list.
 *
 * Uses each task's `updatedAt` timestamp to determine which day it was
 * completed. Sprint duration defaults to 7 days starting from the earliest
 * non-sample, non-archived task's createdAt (or provided start date).
 */
export function useVelocityData(
  tasks: Task[],
  sprintStartDate?: string,
  sprintDurationDays = 7,
): { data: VelocityDataPoint[]; stats: VelocityStats } {
  return useMemo(() => {
    // Filter to user tasks only (exclude samples & archived)
    const userTasks = tasks.filter(
      (t) => !t.id.startsWith('10000000-') && !t.archived,
    );

    // Only consider sprint tasks (todo, doing, done — not backlog)
    const sprintTasks = userTasks.filter(
      (t) => t.status === 'todo' || t.status === 'doing' || t.status === 'done',
    );

    const totalTasks = sprintTasks.length;

    if (totalTasks === 0) {
      return {
        data: [],
        stats: {
          streak: 0,
          bestDay: 0,
          bestDayLabel: '-',
          avgPerDay: 0,
          pacing: 'on-track',
        },
      };
    }

    // Determine sprint start
    let start: Date;
    if (sprintStartDate) {
      start = new Date(sprintStartDate + 'T00:00:00');
    } else {
      // Fall back to earliest task createdAt
      const earliest = sprintTasks.reduce((min, t) => {
        const d = new Date(t.createdAt);
        return d < min ? d : min;
      }, new Date());
      start = new Date(earliest);
      start.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Build a map: YYYY-MM-DD → tasks completed that day
    const completionsByDay = new Map<string, Task[]>();
    for (const task of sprintTasks) {
      if (isTaskCompleted(task)) {
        const d = new Date(task.updatedAt);
        const key = d.toISOString().slice(0, 10);
        const arr = completionsByDay.get(key) || [];
        arr.push(task);
        completionsByDay.set(key, arr);
      }
    }

    // Generate data points for each day of the sprint
    const data: VelocityDataPoint[] = [];
    let cumulativeCompleted = 0;
    let cumulativeHours = 0;

    for (let i = 0; i < sprintDurationDays; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + i);
      const dateKey = dayDate.toISOString().slice(0, 10);
      const dayName = DAY_NAMES[dayDate.getDay()];
      const isPast = dayDate <= today;

      const dayCompletions = completionsByDay.get(dateKey) || [];
      cumulativeCompleted += dayCompletions.length;
      cumulativeHours += dayCompletions.reduce(
        (sum, t) => sum + getTaskDurationHours(t),
        0,
      );

      // Ideal burndown: linear from totalTasks → 0
      const ideal =
        Math.round(
          (totalTasks - (totalTasks / sprintDurationDays) * (i + 1)) * 10,
        ) / 10;

      data.push({
        label: dayName,
        date: dateKey,
        ideal: Math.max(0, ideal),
        actual: isPast ? totalTasks - cumulativeCompleted : null,
        completed: cumulativeCompleted,
        completedHours: Math.round(cumulativeHours * 10) / 10,
      });
    }

    // Calculate stats
    let streak = 0;
    let bestDay = 0;
    let bestDayLabel = '-';
    let pastDays = 0;

    // Walk backwards from latest past day for streak
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].actual === null) continue; // future day
      pastDays++;
      const dayCompletions =
        i === 0
          ? data[i].completed
          : data[i].completed - data[i - 1].completed;

      if (dayCompletions > bestDay) {
        bestDay = dayCompletions;
        bestDayLabel = data[i].label;
      }
    }

    // Streak: count consecutive past days (from most recent) with completions
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].actual === null) continue;
      const dayCompletions =
        i === 0
          ? data[i].completed
          : data[i].completed - data[i - 1].completed;
      if (dayCompletions > 0) {
        streak++;
      } else {
        break;
      }
    }

    // Pacing: compare actual vs ideal for most recent past day
    const latestPast = [...data].reverse().find((d) => d.actual !== null);
    const latestIdealMatch = data.find((d) => d.date === latestPast?.date);
    let pacing: VelocityStats['pacing'] = 'on-track';
    if (latestPast && latestIdealMatch) {
      const diff = (latestPast.actual ?? 0) - latestIdealMatch.ideal;
      if (diff < -0.5) pacing = 'ahead';
      else if (diff > 0.5) pacing = 'behind';
    }

    const avgPerDay =
      pastDays > 0
        ? Math.round((cumulativeCompleted / pastDays) * 10) / 10
        : 0;

    return {
      data,
      stats: { streak, bestDay, bestDayLabel, avgPerDay, pacing },
    };
  }, [tasks, sprintStartDate, sprintDurationDays]);
}
