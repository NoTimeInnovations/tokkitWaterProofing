-- Seed Kerala districts + "Other State"
-- Run this after creating the schema (or in the Supabase SQL editor)

INSERT INTO public.districts (name)
SELECT name FROM (VALUES
  ('Thiruvananthapuram'),
  ('Kollam'),
  ('Pathanamthitta'),
  ('Alappuzha'),
  ('Kottayam'),
  ('Idukki'),
  ('Ernakulam'),
  ('Thrissur'),
  ('Palakkad'),
  ('Malappuram'),
  ('Kozhikode'),
  ('Wayanad'),
  ('Kannur'),
  ('Kasaragod'),
  ('Other State')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.districts d WHERE d.name = v.name
);
