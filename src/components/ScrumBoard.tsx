import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  title: string;
  subject: string;
  duration: string;
  startTime: string;
  completed: boolean;
  color: string;
  day: number;
  status?: 'backlog' | 'todo' | 'doing' | 'done';
}

interface ScrumBoardProps {
  tasks: Task[];
  onTaskToggle: (id: string) => void;
  onTaskClick: (id: string) => void;
  onAddTask: (column: string) => void;
  onTaskMove: (taskId: string, newStatus: string) => void;
}

const ScrumBoard: React.FC<ScrumBoardProps> = ({
  tasks,
  onTaskToggle,
  onTaskClick,
  onAddTask,
  onTaskMove
}) => {
  // Remove currentWeek state - always show active sprint
  
  const columns = [
    { id: 'backlog', title: 'Backlog', color: 'bg-gray-50 border-gray-200' },
    { id: 'todo', title: 'To Do', color: 'bg-blue-50 border-blue-200' },
    { id: 'doing', title: 'Doing', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'done', title: 'Done', color: 'bg-green-50 border-green-200' }
  ];

  // MVP Single-Sprint Mode: Filter tasks purely by status field
  // Tasks are displayed based on their status, not by sprint_id or day
  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(task => {
      // Filter by status field only - no sprint or day-based filtering
      if (columnId === 'backlog') {
        return task.status === 'backlog';
      }
      if (columnId === 'todo') {
        return task.status === 'todo';
      }
      if (columnId === 'doing') {
        return task.status === 'doing';
      }
      if (columnId === 'done') {
        return task.status === 'done';
      }
      return false;
    });
  };


  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    onTaskMove(taskId, columnId);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Scrum Board</h2>
        <div className="flex items-center gap-2">
          <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-medium">
            Current Sprint
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {columns.map(column => (
          <div
            key={column.id}
            className={`border-2 border-dashed rounded-lg p-4 min-h-[500px] ${column.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">{column.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                  {getTasksForColumn(column.id).length}
                </span>
                <button
                  onClick={() => onAddTask(column.id)}
                  className="p-1 rounded-full hover:bg-white/50 text-gray-600 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {getTasksForColumn(column.id).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-move"
                >
                  <TaskCard
                    {...task}
                    onToggleComplete={onTaskToggle}
                    onClick={onTaskClick}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrumBoard;