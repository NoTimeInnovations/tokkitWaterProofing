-- supabase/delete_admin_user.sql
-- Idempotent helper to remove a user and related auth rows created manually/incorrectly.
-- Edit the v_email variable below to target the account to remove.
-- Run in Supabase SQL editor or via psql: psql -f delete_admin_user.sql

DO $$
DECLARE
  v_email text := 'admin@tokkit.app'; -- change as needed
  uid uuid;
BEGIN
  -- find the user id (uuid) from auth.users
  SELECT id::uuid INTO uid FROM auth.users WHERE email = v_email LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'No user with email % found in auth.users', v_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Deleting auth data for user id: % (email: %)', uid, v_email;

  -- Optional: show auth table column types to help debugging (uncomment if needed)
  -- RAISE NOTICE '%', (SELECT json_agg(row_to_json(t)) FROM (
  --   SELECT table_name, column_name, data_type FROM information_schema.columns
  --   WHERE table_schema = 'auth' AND table_name IN ('identities','refresh_tokens','mfa_secrets')
  -- ) t);

  -- identities (compare as text to avoid uuid vs varchar operator errors)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
    DELETE FROM auth.identities WHERE user_id::text = uid::text;
  END IF;

  -- refresh_tokens (some installations use varchar for user_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'refresh_tokens') THEN
    DELETE FROM auth.refresh_tokens WHERE user_id::text = uid::text;
  END IF;

  -- mfa_secrets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_secrets') THEN
    DELETE FROM auth.mfa_secrets WHERE user_id::text = uid::text;
  END IF;

  -- finally, delete the user row
  DELETE FROM auth.users WHERE id::uuid = uid;

  RAISE NOTICE 'Deletion completed for user % (%).', v_email, uid;
END
$$;
