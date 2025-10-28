-- Seed common tags with color values (Polaris-compatible tokens or hex colors)
-- Run after creating the schema: supabase/schema.sql

INSERT INTO public.tags (name, color)
SELECT name, color FROM (VALUES
  ('Urgent', '#ef4444'),
  ('High-Priority', '#dc2626'),
  ('Follow-up', '#f59e0b'),
  ('Pending', '#f97316'),
  ('Completed', '#10b981'),
  ('Cancelled', '#6b7280')
) AS v(name,color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tags t WHERE t.name = v.name
);
