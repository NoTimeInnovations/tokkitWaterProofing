-- Supabase schema for Tokkit Waterproofing
-- Creates districts, staff, tags, leads, lead_tags
-- Run this in Supabase SQL editor or with psql against your Supabase Postgres DB

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- Staff table


-- Tags table (user-manageable tags with a color token or CSS class)
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text -- store a Polaris token, Tailwind class, or hex code
);

-- Leads main table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  entry_date date,
  client_name text,
  phone_number text,
  place text,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  site_visit_payment text,
  notes text,
  -- latitude and longitude removed intentionally
  -- longitude and latitude columns were removed in a migration
);

-- Join table for many-to-many between leads and tags
CREATE TABLE IF NOT EXISTS public.lead_tags (
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Indexes to speed up common queries and global search
CREATE INDEX IF NOT EXISTS idx_leads_client_name ON public.leads (client_name);
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON public.leads (phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_place ON public.leads (place);
CREATE INDEX IF NOT EXISTS idx_leads_district ON public.leads (district_id);

-- Full-text search index (searches client_name, place, phone_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_leads_search_tsv'
  ) THEN
    CREATE INDEX idx_leads_search_tsv ON public.leads USING gin (
      to_tsvector('simple', coalesce(client_name,'') || ' ' || coalesce(place,'') || ' ' || coalesce(phone_number,''))
    );
  END IF;
END$$;

-- Optional sample seed data for tags (you can change colors to Polaris tokens or Tailwind classes)
INSERT INTO public.tags (name, color)
  SELECT * FROM (VALUES
    ('Urgent','#ef4444'),
    ('Completed','#10b981'),
    ('Cancelled','#6b7280')
  ) AS v(name,color)
  WHERE NOT EXISTS (SELECT 1 FROM public.tags WHERE name = v.name);

-- NOTE: Districts should contain the Kerala districts + "Other State". Add them via SQL INSERTs or the Supabase UI.

-- Helpful view: lead with tags aggregated (for UI queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leads_with_tags AS
SELECT
  l.*, 
  json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color) ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL) AS tags
FROM public.leads l
LEFT JOIN public.lead_tags lt ON lt.lead_id = l.id
LEFT JOIN public.tags t ON t.id = lt.tag_id
GROUP BY l.id;

-- You can refresh the materialized view after bulk inserts with: REFRESH MATERIALIZED VIEW public.leads_with_tags;
