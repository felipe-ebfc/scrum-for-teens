import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';

interface RetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    sprintDate: string;
    wentWell: string;
    improve: string;
    tryNext: string;
    mood: string;
  }) => void;
}

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🎉', label: 'Celebrating' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '🤔', label: 'Thoughtful' },
];

const RetroModal: React.FC<RetroModalProps> = ({ isOpen, onClose, onSave }) => {
  const [sprintDate, setSprintDate] = useState(new Date().toISOString().split('T')[0]);
  const [wentWell, setWentWell] = useState('');
  const [improve, setImprove] = useState('');
  const [tryNext, setTryNext] = useState('');
  const [mood, setMood] = useState('');
  const [errors, setErrors] = useState<{ wentWell?: string }>({});

  const handleSave = () => {
    if (!wentWell.trim()) {
      setErrors({ wentWell: 'Tell us at least one thing that went well!' });
      return;
    }

    onSave({
      sprintDate,
      wentWell: wentWell.trim(),
      improve: improve.trim(),
      tryNext: tryNext.trim(),
      mood,
    });

    // Reset form
    setWentWell('');
    setImprove('');
    setTryNext('');
    setMood('');
    setSprintDate(new Date().toISOString().split('T')[0]);
    setErrors({});
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Sprint Retrospective
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Reflect on your sprint — you're building great habits! 🌟
          </p>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Sprint Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Sprint Date</label>
            <Input
              type="date"
              value={sprintDate}
              onChange={(e) => setSprintDate(e.target.value)}
            />
          </div>

          {/* Mood Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              How are you feeling? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.emoji}
                  type="button"
                  onClick={() => setMood(mood === option.emoji ? '' : option.emoji)}
                  className={`text-2xl p-3 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                    mood === option.emoji
                      ? 'border-violet-500 bg-violet-50 shadow-md scale-110'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                  title={option.label}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* What went well? */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              🎉 What went well? <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={wentWell}
              onChange={(e) => {
                setWentWell(e.target.value);
                if (errors.wentWell) setErrors({});
              }}
              placeholder="I finished my tasks on time, learned something new..."
              rows={3}
              className={`resize-none ${errors.wentWell ? 'border-red-500' : ''}`}
            />
            {errors.wentWell && (
              <p className="text-xs text-red-500">{errors.wentWell}</p>
            )}
          </div>

          {/* What could be better? */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              🔧 What could be better? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              placeholder="I got distracted, didn't break tasks small enough..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* What will I try next sprint? */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              🚀 What will I try next sprint? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={tryNext}
              onChange={(e) => setTryNext(e.target.value)}
              placeholder="Set a timer for focus blocks, ask for help sooner..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Save Retrospective
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetroModal;
