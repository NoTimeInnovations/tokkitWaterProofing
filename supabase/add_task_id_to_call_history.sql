-- Add task_id column to call_history table
-- This allows linking call history entries to tasks

-- Add the column
ALTER TABLE public.call_history 
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_call_history_task_id ON public.call_history (task_id);
