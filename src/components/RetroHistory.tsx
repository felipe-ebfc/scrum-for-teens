import React from 'react';
import { Retrospective } from '@/types/Retrospective';
import { Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RetroHistoryProps {
  retros: Retrospective[];
  onDelete: (id: string) => void;
}

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const RetroHistory: React.FC<RetroHistoryProps> = ({ retros, onDelete }) => {
  if (retros.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-violet-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          No retrospectives yet
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          After your first sprint, take a moment to reflect. It's one of the
          most powerful habits in Scrum — and in life! 💜
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {retros.map((retro) => (
        <div
          key={retro.id}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {retro.mood && (
                <span className="text-2xl">{retro.mood}</span>
              )}
              <div>
                <p className="font-semibold text-gray-800">
                  {formatDate(retro.sprintDate)}
                </p>
                <p className="text-xs text-gray-400">
                  Saved {formatDate(retro.createdAt.split('T')[0])}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Delete this retrospective?')) {
                  onDelete(retro.id);
                }
              }}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Answers */}
          <div className="space-y-3">
            {retro.wentWell && (
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-1">🎉 What went well</p>
                <p className="text-sm text-green-900 whitespace-pre-wrap">{retro.wentWell}</p>
              </div>
            )}
            {retro.improve && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">🔧 What could be better</p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{retro.improve}</p>
              </div>
            )}
            {retro.tryNext && (
              <div className="bg-violet-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-violet-700 mb-1">🚀 What I'll try next</p>
                <p className="text-sm text-violet-900 whitespace-pre-wrap">{retro.tryNext}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RetroHistory;
