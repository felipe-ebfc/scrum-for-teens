import React from 'react';
import { CheckCircle, Clock, Calendar } from 'lucide-react';

interface TaskCardProps {
  id: string;
  title: string;
  subject: string;
  duration: string;
  startTime: string;
  completed: boolean;
  color: string;
  onToggleComplete: (id: string) => void;
  onClick: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  subject,
  duration,
  startTime,
  completed,
  color,
  onToggleComplete,
  onClick
}) => {
  return (
    <div
      className={`p-4 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
        completed ? 'opacity-75' : ''
      }`}
      style={{ borderLeftColor: color }}
      onClick={() => onClick(id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold text-gray-800 ${completed ? 'line-through' : ''}`}>
            {title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{subject}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {duration}
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              {startTime}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(id);
          }}
          className={`p-2 rounded-full transition-colors ${
            completed
              ? 'text-green-600 bg-green-50'
              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
          }`}
        >
          <CheckCircle size={20} />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;