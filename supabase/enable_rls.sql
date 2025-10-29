-- Enable Row Level Security (RLS) for all tables
-- This ensures data access is controlled by policies

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make script idempotent)
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.districts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.tags;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.task_tags;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.call_history;

-- =====================================================
-- TASKS TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all tasks
CREATE POLICY "Allow authenticated users to view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert tasks
CREATE POLICY "Allow authenticated users to insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update tasks
CREATE POLICY "Allow authenticated users to update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete tasks
CREATE POLICY "Allow authenticated users to delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- DISTRICTS TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all districts
CREATE POLICY "Allow authenticated users to view districts"
ON public.districts
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert districts
CREATE POLICY "Allow authenticated users to insert districts"
ON public.districts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update districts
CREATE POLICY "Allow authenticated users to update districts"
ON public.districts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete districts
CREATE POLICY "Allow authenticated users to delete districts"
ON public.districts
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- TAGS TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all tags
CREATE POLICY "Allow authenticated users to view tags"
ON public.tags
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert tags
CREATE POLICY "Allow authenticated users to insert tags"
ON public.tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update tags
CREATE POLICY "Allow authenticated users to update tags"
ON public.tags
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete tags
CREATE POLICY "Allow authenticated users to delete tags"
ON public.tags
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- TASK_TAGS TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all task-tag relationships
CREATE POLICY "Allow authenticated users to view task_tags"
ON public.task_tags
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert task-tag relationships
CREATE POLICY "Allow authenticated users to insert task_tags"
ON public.task_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete task-tag relationships
CREATE POLICY "Allow authenticated users to delete task_tags"
ON public.task_tags
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- CALL_HISTORY TABLE POLICIES
-- =====================================================

-- Allow authenticated users to view all call history
CREATE POLICY "Allow authenticated users to view call_history"
ON public.call_history
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert call history
CREATE POLICY "Allow authenticated users to insert call_history"
ON public.call_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update call history
CREATE POLICY "Allow authenticated users to update call_history"
ON public.call_history
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete call history
CREATE POLICY "Allow authenticated users to delete call_history"
ON public.call_history
FOR DELETE
TO authenticated
USING (true);

