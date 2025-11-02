-- Add site_visit_date and work_start_date columns to tasks table

-- Add site_visit_date column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS site_visit_date DATE;

-- Add work_start_date column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS work_start_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN tasks.site_visit_date IS 'Date when the site visit was conducted';
COMMENT ON COLUMN tasks.work_start_date IS 'Date when the work was started (auto-set when task is marked as completed)';
