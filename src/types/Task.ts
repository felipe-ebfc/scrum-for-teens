export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  actualHours: number;
  dueDate?: Date | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Sort order for manual reordering within columns
  sortOrder?: number;
  
  // Legacy fields for backward compatibility
  subject?: string;
  duration?: number; // duration in minutes
  startTime?: string;
  completed?: boolean;
  color?: string;
  day?: number;
  emoji?: string;
  tags?: string[];
  archived?: boolean;
}

export interface SprintSettings {
  startDate: string;
  duration: number; // in days
  autoArchive: boolean;
}

export interface BoardFilters {
  category?: string;
  tags?: string[];
  showArchived?: boolean;
}
