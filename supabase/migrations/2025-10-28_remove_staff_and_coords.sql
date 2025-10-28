-- Migration: remove staff table and staff_id, latitude, longitude columns from leads
-- Backup leads, drop materialized view, drop columns and staff table, recreate materialized view
BEGIN;

-- 1) Backup existing leads table (fast snapshot)
CREATE TABLE IF NOT EXISTS public.leads_backup_2025_10_28 AS
SELECT * FROM public.leads;

-- 2) Drop materialized view (it references the leads columns)
DROP MATERIALIZED VIEW IF EXISTS public.leads_with_tags;

-- 3) Remove columns from leads. Use CASCADE to ensure constraints depending on them are removed.
ALTER TABLE IF EXISTS public.leads
  DROP COLUMN IF EXISTS staff_id CASCADE;

ALTER TABLE IF EXISTS public.leads
  DROP COLUMN IF EXISTS latitude CASCADE;

ALTER TABLE IF EXISTS public.leads
  DROP COLUMN IF EXISTS longitude CASCADE;

-- 4) Drop the staff table entirely
DROP TABLE IF EXISTS public.staff CASCADE;

-- 5) Recreate the materialized view without staff/coords (same as repo's schema.sql)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leads_with_tags AS
SELECT
  l.*, 
  json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL) AS tags
FROM public.leads l
LEFT JOIN public.lead_tags lt ON lt.lead_id = l.id
LEFT JOIN public.tags t ON t.id = lt.tag_id
GROUP BY l.id;

COMMIT;

-- Notes:
-- 1. This migration creates a backup table `leads_backup_2025_10_28`. If you need to restore data, you can copy rows back from that table.
-- 2. CASCADE is used to ensure dependent constraints or objects are removed; review the effects before running in production.
-- 3. After running this migration, update repository schema (this file has been updated) and redeploy app code to remove references to dropped columns.
