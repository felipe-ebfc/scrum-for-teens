import React, { useState, useEffect } from 'react';
import { X, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Goal } from '@/types/Goal';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: any) => void;
  onDelete?: (goalId: string) => void;
  goal?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, onDelete, goal }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    status: 'active' as 'active' | 'completed',
  });

  const [errors, setErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    if (goal) {
      // Edit mode - populate with existing goal data
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
        status: goal.status === 'completed' ? 'completed' : 'active',
      });
    } else {
      // Create mode - reset form
      setFormData({
        title: '',
        description: '',
        targetDate: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [goal, isOpen]);

  const handleSave = () => {
    // Validate required fields
    if (!formData.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    // Prepare data for save
    const saveData = {
      title: formData.title.trim(),
      description: formData.description.trim() || '',
      // Target date is truly optional - pass null if empty, otherwise pass the Date
      targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
      status: formData.status,
      // Set default values for required database fields that we're not exposing in MVP UI
      category: 'learning',
      type: 'sprint',
      specific: '',
      measurable: '',
      achievable: '',
      relevant: '',
      timeBound: '',
      targetValue: 1,
      currentValue: formData.status === 'completed' ? 1 : 0,
      unit: 'goal',
      priority: 'medium',
    };

    onSave(saveData);
  };


  const handleDelete = () => {
    if (goal && onDelete) {
      if (window.confirm('Are you sure you want to delete this goal?')) {
        onDelete(goal.id);
        onClose();
      }
    }
  };

  const mode = goal ? 'edit' : 'create';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-blue-600" />
            {goal ? 'Edit Scrum Goal' : 'Create Scrum Goal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors({});
              }}
              placeholder="What do you want to achieve?"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add more details about your goal..."
              rows={3}
            />
          </div>

          {/* Target Date - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Target Date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'active' | 'completed') => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {mode === 'edit' && onDelete && (
              <Button 
                variant="ghost" 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete Goal
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {mode === 'create' ? 'Create Goal' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
