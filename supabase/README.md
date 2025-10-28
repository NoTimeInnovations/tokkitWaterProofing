Supabase schema — Tokkit Waterproofing

This folder contains SQL to create the core tables used by the Tokkit app:
- `districts`, `staff`, `tags`, `tasks`, `task_tags`

Files:
- `schema.sql` — CREATE TABLE statements, indexes, a small tag seed, and a materialized view `tasks_with_tags`.

How to apply

1) Supabase SQL Editor (recommended for quick one-off runs)

- Open your Supabase project → SQL Editor → New query. Paste the contents of `schema.sql` and run it.

2) Using psql (if you have a direct database connection string)

Replace <CONN_STRING> with your Supabase Postgres connection string (found in Project Settings → Database → Connection string).

Example (PowerShell):

```powershell
psql "<CONN_STRING>" -f supabase/schema.sql
```

3) Using Supabase CLI migrations

If you want migration-managed SQL, add this file to a migrations folder compatible with the Supabase CLI, or split into migration steps and use `supabase db push` or the migration workflow. See Supabase CLI docs for details.

Next steps

- Seed `districts` with all Kerala districts + a final row `Other State`.
- Create an admin user via the Supabase Auth UI or the Auth API (don’t commit credentials). Use the provided admin email in your local/dev environment if desired.
- Implement a data-migration script (Node.js or Python) to import your CSVs into the new schema (map districts/staff -> their UUIDs, insert tasks, then populate `task_tags`).
- (Optional) Add a Postgres function to compute distances or leverage PostGIS if you want efficient geospatial queries for the “near me” feature.

If you want, I can now:

- Insert a complete list of Kerala districts into `schema.sql` as seed rows, or
- Create a Node.js migration script that reads CSVs and populates these tables.

Seeds (added)

- `supabase/districts_seed.sql` — idempotent INSERTs for Kerala districts + `Other State`.

- `supabase/tags_seed.sql` — idempotent INSERTs for common tags with color values (hex/Tailwind/Polaris-friendly).

Create admin user (SQL)

I added `supabase/create_aadmin_user.sql` which inserts an admin user into `auth.users` if it doesn't exist. This SQL sets the password to `123456` (bcrypt via crypt()) and marks the email as confirmed. Example usage:

```powershell
# In the Supabase SQL editor: paste the contents of supabase/create_aadmin_user.sql and run.

# Or from PowerShell with psql:
psql "<CONN_STRING>" -f supabase/create_aadmin_user.sql
```

Notes:
- Directly inserting into `auth.users` bypasses some GoTrue internal flows (email hooks, audit triggers). The Admin REST API (`/auth/v1/admin/users`) with the service-role key is the recommended approach for production.
- After running the SQL, change the admin password immediately and restrict the service-role key.

How to run the seed

1) Seed districts via SQL editor or psql:

```powershell
# Run district seed in Supabase SQL editor or locally with psql
psql "<CONN_STRING>" -f supabase/districts_seed.sql
```

Notes
- If you later decide you want an import script to load CSVs, I can create a safer, configurable migration tool (or a one-time script) on request.

Run all seeds & create admin (recommended order)

After creating the schema (`supabase/schema.sql`) run the seeds and admin SQL in this order. Each step is idempotent, but test first in a dev project.

```powershell
# 1) Create schema
psql "<CONN_STRING>" -f supabase/schema.sql

# 2) Seed districts
psql "<CONN_STRING>" -f supabase/districts_seed.sql

# 3) Seed tags
psql "<CONN_STRING>" -f supabase/tags_seed.sql

# 4) Create admin user (idempotent)
psql "<CONN_STRING>" -f supabase/create_admin_user.sql

# 5) Refresh materialized view used by the UI
psql "<CONN_STRING>" -c "REFRESH MATERIALIZED VIEW public.tasks_with_tags;"
```

Verify admin creation

After running `create_admin_user.sql`, confirm the row exists with:

```sql
SELECT id, email, role, aud FROM auth.users WHERE email = 'admin@tokkit.app';
```

If you get errors about missing columns when running the admin SQL, inspect the actual `auth.users` columns in your project and share them with me so I can adjust the INSERT accordingly:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'auth' AND table_name = 'users' ORDER BY ordinal_position;
```

