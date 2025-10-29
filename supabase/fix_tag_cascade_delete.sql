-- Fix cascading delete for tags
-- This ensures that when a tag is deleted, all associated task_tags entries are also deleted

-- Drop the existing foreign key constraint
ALTER TABLE public.task_tags 
DROP CONSTRAINT IF EXISTS task_tags_tag_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.task_tags 
ADD CONSTRAINT task_tags_tag_id_fkey 
FOREIGN KEY (tag_id) 
REFERENCES public.tags(id) 
ON DELETE CASCADE;

-- Also ensure task_id has cascade delete (should already exist but let's be sure)
ALTER TABLE public.task_tags 
DROP CONSTRAINT IF EXISTS task_tags_task_id_fkey;

ALTER TABLE public.task_tags 
ADD CONSTRAINT task_tags_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES public.tasks(id) 
ON DELETE CASCADE;
