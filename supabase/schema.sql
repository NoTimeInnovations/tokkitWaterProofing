
-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);


-- Tags table (user-manageable tags with a color token or CSS class)
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text -- store a Polaris token, Tailwind class, or hex code
);

-- Tasks main table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  entry_date date,
  client_name text,
  phone_number text,
  staff text,
  place text,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  site_visit_payment text,
  notes text,
  status text
);

-- Join table for many-to-many between tasks and tags
CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Call History table for Admin Home
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  notes text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes to speed up common queries and global search
CREATE INDEX IF NOT EXISTS idx_tasks_client_name ON public.tasks (client_name);
CREATE INDEX IF NOT EXISTS idx_tasks_phone_number ON public.tasks (phone_number);
CREATE INDEX IF NOT EXISTS idx_tasks_place ON public.tasks (place);
CREATE INDEX IF NOT EXISTS idx_tasks_district ON public.tasks (district_id);

-- Indexes for call_history table
CREATE INDEX IF NOT EXISTS idx_call_history_phone ON public.call_history (phone_number);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON public.call_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_task_id ON public.call_history (task_id);

-- Full-text search index (searches client_name, place, phone_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_tasks_search_tsv'
  ) THEN
    CREATE INDEX idx_tasks_search_tsv ON public.tasks USING gin (
      to_tsvector('simple', coalesce(client_name,'') || ' ' || coalesce(place,'') || ' ' || coalesce(phone_number,''))
    );
  END IF;
END$$;







CREATE MATERIALIZED VIEW IF NOT EXISTS public.tasks_full_data AS
SELECT
  l.*, 
  json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL) AS tags,
  d.name as district  -- Changed to text instead of JSON object
FROM public.tasks l
LEFT JOIN public.task_tags lt ON lt.task_id = l.id
LEFT JOIN public.tags t ON t.id = lt.tag_id
LEFT JOIN public.districts d ON d.id = l.district_id
GROUP BY l.id, d.name;  -- Added d.name to GROUP BY

-- Create unique index for concurrent refresh (PostgreSQL 12+)
CREATE UNIQUE INDEX IF NOT EXISTS tasks_full_data_id_idx ON public.tasks_full_data (id);


-- Refresh function with concurrent refresh
CREATE OR REPLACE FUNCTION refresh_tasks_full_data()
RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.tasks_full_data;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-refresh when underlying data changes
CREATE OR REPLACE TRIGGER refresh_tasks_full_data_after_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    EXECUTE FUNCTION refresh_tasks_full_data();

CREATE OR REPLACE TRIGGER refresh_tasks_full_data_after_task_tags
    AFTER INSERT OR UPDATE OR DELETE ON public.task_tags
    EXECUTE FUNCTION refresh_tasks_full_data();

CREATE OR REPLACE TRIGGER refresh_tasks_full_data_after_tags
    AFTER INSERT OR UPDATE OR DELETE ON public.tags
    EXECUTE FUNCTION refresh_tasks_full_data();

CREATE OR REPLACE TRIGGER refresh_tasks_full_data_after_districts
    AFTER INSERT OR UPDATE OR DELETE ON public.districts
    EXECUTE FUNCTION refresh_tasks_full_data();

-- Initial refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY public.tasks_full_data;