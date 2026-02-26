import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, Trash2, ChevronDown } from 'lucide-react';
import { Task } from '@/types/Task';
import { toast } from 'sonner';

interface EnhancedTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: number;
  editingTask?: Task;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  onDeleteTask: (taskId: string) => Promise<boolean>;
  onRestoreTask?: (taskId: string) => Promise<boolean>;
}

const labelColors = [
  // Row 1 – Core / Everyday
  '',            // C1R1 – No color
  '#2563EB',     // C2R1 – Blue
  '#16A34A',     // C3R1 – Green
  '#7C3AED',     // C4R1 – Purple
  '#F59E0B',     // C5R1 – Amber
  '#DC2626',     // C6R1 – Red (kept)
  '#0D9488',     // C7R1 – Teal
  '#65A30D',     // C8R1 – Lime
  '#CBD5E1',     // C9R1 – Light slate (FIXED)

  // Row 2 – Secondary / Emotional / Meta
  '#EA580C',     // C1R2 – Orange
  '#EC4899',     // C2R2 – Pink (FIXED)
  '#3730A3',     // C3R2 – Deep indigo (FIXED)
  '#155E75',     // C4R2 – Dark teal
  '#92400E',     // C5R2 – Brown
  '#D946EF',     // C6R2 – Magenta (FIXED)
  '#0284C7',     // C7R2 – Sky blue
  '#6B7280',     // C8R2 – Gray
  '#020617',     // C9R2 – Near black
];

// Generate duration options: 30-minute increments up to 8 hours (480 minutes)
const generateDurationOptions = () => {
  const options: { value: number; label: string }[] = [];
  for (let minutes = 30; minutes <= 480; minutes += 30) {
    const hours = minutes / 60;
    const formattedHours = hours % 1 === 0 ? `${Math.floor(hours)} hr` : `${hours.toFixed(1)} hr`;
    options.push({ value: minutes, label: `${minutes} min (${formattedHours})` });
  }
  return options;
};

const durationOptions = generateDurationOptions();

const EnhancedTaskModal: React.FC<EnhancedTaskModalProps> = ({
  isOpen,
  onClose,
  selectedDay,
  editingTask,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onRestoreTask
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    subject: '',
    duration: 30,
    startTime: '',
    dueDate: undefined,
    color: '', // Default: no color
    tags: [],
    day: selectedDay
  });

  // Track previous subject for tag sync
  const prevSubjectRef = useRef<string>('');

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Title textarea ref for auto-grow
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow title textarea up to 3 rows
  const autosizeTitle = () => {
    const el = titleRef.current;
    if (!el) return;

    el.style.height = 'auto';

    const maxHeightPx = 240; // matches textarea style maxHeight
    el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`;
  };


  useEffect(() => {
    if (editingTask && editingTask.id) {
      setFormData({
        ...editingTask,
        dueDate:
          typeof editingTask.dueDate === 'string'
            ? editingTask.dueDate
            : editingTask.dueDate instanceof Date
              ? editingTask.dueDate.toISOString().split('T')[0]
              : undefined
      });
      prevSubjectRef.current = editingTask.subject?.trim() || '';
    } else if (editingTask && editingTask.status && !editingTask.id) {
      setFormData({
        title: '',
        subject: '',
        duration: 30,
        startTime: '',
        dueDate: undefined,
        color: '', // Default: no color
        tags: [],
        day: selectedDay,
        status: editingTask.status,
        priority: 'medium'
      });
      prevSubjectRef.current = '';
    } else {
      setFormData({
        title: '',
        subject: '',
        duration: 30,
        startTime: '',
        dueDate: undefined,
        color: '', // Default: no color
        tags: [],
        day: selectedDay,
        status: 'todo',
        priority: 'medium'
      });
      prevSubjectRef.current = '';
    }
  }, [editingTask, selectedDay, isOpen]);

  // Re-autosize when modal opens or title changes (including when editing an existing task)
  useEffect(() => {
    if (!isOpen) return;
    // Let DOM paint first so scrollHeight is correct
    requestAnimationFrame(() => autosizeTitle());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, formData.title]);

  if (!isOpen) return null;

  const isExistingTask = !!(editingTask && editingTask.id && !editingTask.id.startsWith('temp_'));

  /**
   * Sync subject to tags:
   * - When subject changes from A to B, remove tag A (if exists) and add tag B (if not empty and not duplicate)
   * - If subject is cleared, remove the old subject tag
   */
  const handleSubjectChange = (newSubject: string) => {
    const trimmedNew = newSubject.trim();
    const trimmedOld = prevSubjectRef.current;

    let newTags = [...(formData.tags || [])];

    // Remove old subject tag if it exists
    if (trimmedOld && newTags.includes(trimmedOld)) {
      newTags = newTags.filter(t => t !== trimmedOld);
    }

    // Add new subject tag if not empty and not already present
    if (trimmedNew && !newTags.includes(trimmedNew)) {
      newTags.push(trimmedNew);
    }

    // Update state
    setFormData(prev => ({
      ...prev,
      subject: newSubject,
      tags: newTags
    }));

    // Update ref for next change
    prevSubjectRef.current = trimmedNew;
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.duration || formData.duration < 30 || formData.duration > 480) {
      toast.error('Duration must be between 30 minutes and 8 hours');
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure subject tag is in tags before saving
      const trimmedSubject = formData.subject?.trim() || '';
      let finalTags = [...(formData.tags || [])];

      // Make sure subject is in tags (in case of any edge cases)
      if (trimmedSubject && !finalTags.includes(trimmedSubject)) {
        finalTags.push(trimmedSubject);
      }

      const taskData: Partial<Task> = {
        title: formData.title.trim(),
        subject: trimmedSubject,
        duration: formData.duration,
        startTime: formData.startTime || '',
        dueDate: formData.dueDate || undefined,
        color: formData.color || '', // Empty string = no color
        tags: finalTags,
        day: formData.day || selectedDay,
        description: formData.description || '',
        priority: formData.priority || 'medium',
        status: formData.status || 'todo',
        completed: formData.completed || false,
        archived: formData.archived || false,
      };

      const isNewTask = !editingTask || !editingTask.id || editingTask.id.startsWith('temp_');
      let success = false;

      if (isNewTask) {
        const result = await onAddTask(taskData as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
        success = !!result;
      } else {
        success = await onUpdateTask(editingTask.id, taskData);
      }

      if (success) {
        toast.success(isNewTask ? 'Task created successfully' : 'Task updated successfully');
        onClose();
      } else {
        toast.error('Failed to save task. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error in handleSave:', error);
      toast.error(error?.message || 'An error occurred while saving the task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = async () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;

    if (formData.tags?.includes(trimmedTag)) {
      setTagInput('');
      return;
    }

    const newTags = [...(formData.tags || []), trimmedTag];
    setFormData(prev => ({ ...prev, tags: newTags }));
    setTagInput('');

    if (isExistingTask && editingTask?.id) {
      try {
        const success = await onUpdateTask(editingTask.id, { tags: newTags });
        if (!success) {
          setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== trimmedTag) || [] }));
          toast.error('Failed to add tag');
        }
      } catch {
        setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== trimmedTag) || [] }));
        toast.error('Failed to add tag');
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const previousTags = formData.tags || [];
    const newTags = previousTags.filter(tag => tag !== tagToRemove);

    setFormData(prev => ({ ...prev, tags: newTags }));

    if (isExistingTask && editingTask?.id) {
      try {
        const success = await onUpdateTask(editingTask.id, { tags: newTags });
        if (!success) {
          setFormData(prev => ({ ...prev, tags: previousTags }));
          toast.error('Failed to remove tag');
        }
      } catch {
        setFormData(prev => ({ ...prev, tags: previousTags }));
        toast.error('Failed to remove tag');
      }
    }
  };

  const handleDelete = async () => {
    if (!editingTask?.id) return;

    setIsSubmitting(true);
    try {
      const success = await onDeleteTask(editingTask.id);
      if (success) {
        const timeoutId = setTimeout(() => setUndoTimeoutId(null), 5000);
        setUndoTimeoutId(timeoutId);

        toast.success('Task deleted. Undo?', {
          action: {
            label: 'Undo',
            onClick: async () => {
              if (timeoutId) clearTimeout(timeoutId);
              setUndoTimeoutId(null);
              if (onRestoreTask) {
                const restored = await onRestoreTask(editingTask.id);
                restored ? toast.success('Task restored') : toast.error('Failed to restore task');
              }
            }
          },
          duration: 5000
        });

        onClose();
      } else {
        toast.error('Failed to delete task');
      }
    } catch {
      toast.error('An error occurred while deleting the task');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const modalTitle = isExistingTask ? 'Edit Task' : 'Add New Task';

  // Helper to determine if a color is "light" for text contrast
  const isLightColor = (color: string) => {
    if (!color) return true;
    const lightColors = ['#F59E0B', '#65A30D', '#EA580C', '#CA8A04'];
    return lightColors.includes(color.toUpperCase());
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Trello-style structure: overflow hidden + sticky header/footer + scrollable middle */}
      <div
        className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1) Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{modalTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* 2) Scrollable body (only the middle scrolls) */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 3) Quick edits (designed to fit without scrolling in most cases) */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <textarea
                ref={titleRef}
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                onInput={autosizeTitle}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none leading-6"
                placeholder="Enter task title"
                required
                style={{
                  maxHeight: '240px',  // grow up to ~10 rows, then scroll (Trello-like)
                  overflowY: 'auto',
                }}
              />
            </div>


            {/* Subject (Label) with Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject (Label)</label>
              <div className="flex gap-3 items-start">
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Math, English, Robotics"
                />
                {/* Label Color Picker (2-row grid, Trello-ish) */}
                <div className="grid grid-cols-9 gap-1">
                  {labelColors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-7 h-7 rounded border-2 flex items-center justify-center ${
                        formData.color === color
                          ? 'border-gray-600 ring-2 ring-blue-400'
                          : 'border-gray-300'
                      } ${!color ? 'bg-white' : ''}`}
                      style={{ backgroundColor: color || '#ffffff' }}
                      aria-label={color ? `Set label color ${color}` : 'No color (remove)'}
                      type="button"
                      title={color ? color : 'No color'}
                    >
                      {!color && <span className="text-gray-400 text-xs font-medium">∅</span>}
                    </button>
                  ))}
                </div>
              </div>
              {/* Preview label if subject exists */}
              {formData.subject?.trim() && (
                <div className="mt-2">
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      formData.color
                        ? isLightColor(formData.color) ? 'text-gray-800' : 'text-white'
                        : 'text-gray-800 border border-gray-300'
                    }`}
                    style={{
                      backgroundColor: formData.color || '#ffffff',
                    }}
                  >
                    {formData.subject.trim()}
                  </span>
                </div>
              )}
            </div>

            {/* Duration and Start Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (≤ 8 hours) *
                </label>
                <select
                  value={formData.duration || 30}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {durationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={typeof formData.dueDate === 'string' ? formData.dueDate : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* More details (progressive disclosure) - contains ONLY Tags */}
            <details className="border rounded-lg bg-gray-50">
              <summary className="cursor-pointer select-none px-4 py-3 flex items-center text-sm font-medium text-gray-700">
                <ChevronDown size={16} className="mr-2" />
                More details
              </summary>

              <div className="px-4 pb-4 pt-2 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag size={16} className="inline mr-1" />
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Add tag"
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      type="button"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag, index) => {
                      const isSubjectTag = tag === formData.subject?.trim();
                      return (
                        <span
                          key={index}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full border ${
                            isSubjectTag
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white text-gray-700 border-gray-300'
                          }`}
                        >
                          {tag}
                          {isSubjectTag && <span className="text-xs text-blue-500">(subject)</span>}
                          {!isSubjectTag && (
                            <button
                              onClick={() => removeTag(tag)}
                              className="text-gray-400 hover:text-gray-600"
                              type="button"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {formData.subject?.trim() && (
                    <p className="text-xs text-gray-500 mt-2">
                      The subject tag is auto-managed and cannot be removed directly.
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* 4) Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t px-6 py-4 flex gap-3">
          {isExistingTask && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              type="button"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            type="button"
          >
            {isSubmitting ? 'Saving...' : (isExistingTask ? 'Update' : 'Save')}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-xl p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Task</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this task? Deleted tasks won't count toward your progress or achievements.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  type="button"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTaskModal;
