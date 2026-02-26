import React from 'react';
import { X, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { useSampleTasks } from '@/hooks/useSampleTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SampleSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SampleSprintModal: React.FC<SampleSprintModalProps> = ({ isOpen, onClose }) => {
  const { sampleTasks, loading } = useSampleTasks();

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'doing': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusCounts = sampleTasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Noah's Sample Sprint</h2>
              <p className="text-sm text-gray-600">A 7-day example sprint from Noah's Scrum guide</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Sprint Overview */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{statusCounts.done || 0} Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>{statusCounts.doing || 0} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-gray-400"></div>
                    <span>{statusCounts.todo || 0} To Do</span>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    READ-ONLY EXAMPLE
                  </Badge>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="grid gap-4">
                {sampleTasks.map((task) => (
                  <Card key={task.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium">{task.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📅 {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                        <span>⏱️ {task.estimatedHours}h estimated</span>
                        {task.actualHours > 0 && <span>✅ {task.actualHours}h completed</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>📖 About this sample:</strong> This is a read-only example sprint based on Noah's Scrum methodology. 
                  It shows how to structure a 7-day sprint with realistic tasks and progress tracking. 
                  Create your own sprint to start planning your work!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SampleSprintModal;