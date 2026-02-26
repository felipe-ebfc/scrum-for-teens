-- Update tasks table schema to match Task interface
-- Run this in your Supabase SQL Editor

-- First, update the status constraint to support all 4 Scrum board columns
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('backlog', 'todo', 'doing', 'done'));

-- Add missing columns if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📋';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ;

-- Convert due_date from timestamptz to date
ALTER TABLE public.tasks ALTER COLUMN due_date TYPE date USING due_date::date;

-- Ensure created_at and updated_at are timestamptz (they should be already)
ALTER TABLE public.tasks ALTER COLUMN created_at TYPE timestamptz USING created_at::timestamptz;
ALTER TABLE public.tasks ALTER COLUMN updated_at TYPE timestamptz USING updated_at::timestamptz;

-- Update default status to 'todo' instead of 'todo'
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';

-- Add constraints for new columns
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high'));

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_user_archived ON public.tasks(user_id, archived) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE is_deleted = false;

-- Update RLS policies to include is_deleted filter
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" 
ON public.tasks 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id AND is_deleted = false);

-- Add some sample tasks with all 4 status values for testing
INSERT INTO public.tasks (
  title, description, status, priority, estimated_hours, user_id, subject, color, emoji
) VALUES 
  ('Sample Backlog Task', 'This task is in the backlog', 'backlog', 'medium', 2, auth.uid(), 'Development', '#6B7280', '📋'),
  ('Sample Todo Task', 'This task is ready to start', 'todo', 'high', 3, auth.uid(), 'Development', '#3B82F6', '🚀'),
  ('Sample Doing Task', 'This task is in progress', 'doing', 'medium', 4, auth.uid(), 'Development', '#F59E0B', '⚡'),
  ('Sample Done Task', 'This task is completed', 'done', 'low', 1, auth.uid(), 'Development', '#10B981', '✅')
ON CONFLICT DO NOTHING;