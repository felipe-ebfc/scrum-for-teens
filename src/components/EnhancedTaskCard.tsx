import React from 'react';
import { CheckCircle, Clock, Calendar, Edit3 } from 'lucide-react';
import { Task } from '@/types/Task';

interface EnhancedTaskCardProps extends Task {
  onToggleComplete: (id: string) => void;
  onClick: (task: Task) => void;
  onEdit: (id: string) => void;
}

const EnhancedTaskCard: React.FC<EnhancedTaskCardProps> = (props) => {
  const {
    id,
    title,
    subject,
    duration,
    dueDate,
    completed,
    color,
    onToggleComplete,
    onClick,
    onEdit
  } = props;

  const isDone = completed || props.status === 'done';

  // Date format: "MMM DD, YYYY" (e.g., "Jan 04, 2026")
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return null;

    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      if (Number.isNaN(dateObj.getTime())) return null;
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Duration format: decimal hours rounded to nearest 0.5 (e.g., 30 min => "0.5 hr")
  const formatDurationHours = (minutes: number | undefined) => {
    if (!minutes || minutes <= 0) return null;
    const hours = minutes / 60;
    const roundedToHalf = Math.round(hours * 2) / 2;
    return `${roundedToHalf} hr`;
  };

  const dueText = formatDate(dueDate);
  const durationText = formatDurationHours(duration);

  return (
    <div
      className={`relative p-3 pr-16 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group ${
        isDone ? 'opacity-75' : ''
      }`}
      style={{ borderLeftColor: color }}
      onClick={() => onClick(props)}
    >
      {/* Complete toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(id);
        }}
        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
          isDone
            ? 'text-green-600 bg-green-50'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
        }`}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        title={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        <CheckCircle size={20} />
      </button>

      {/* Edit icon (soft) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(id);
        }}
        className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-full transition-all"
        aria-label="Edit task"
        title="Edit"
      >
        <Edit3 size={13} className="text-gray-300 hover:text-gray-400" />
      </button>

      {/* Title */}
      <h3
        className={`font-semibold text-gray-800 leading-snug line-clamp-3 ${
          isDone ? 'line-through text-gray-500' : ''
        }`}
      >
        {title}
      </h3>

      {/* Subject */}
      {subject && subject.trim().length > 0 && (
        <p className="mt-1 text-sm text-gray-600 line-clamp-1">{subject}</p>
      )}

      {/* Meta badges row (NO TAGS) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 gap-y-2 text-[11px] text-gray-600">
        {dueText && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 whitespace-nowrap">
            <Calendar size={11} />
            <span>{dueText}</span>
          </span>
        )}

        {durationText && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 whitespace-nowrap">
            <Clock size={11} />
            <span>{durationText}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default EnhancedTaskCard;
