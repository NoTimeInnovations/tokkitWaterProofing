# Quick Deployment Guide - Call History Feature

## Prerequisites
- Existing Supabase project with schema already deployed
- Access to Supabase SQL Editor

## Step 1: Update Database Schema

### Option A: Run the complete schema (recommended)
This will create the call_history table if it doesn't exist, and won't affect existing tables.

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `supabase/schema.sql`
5. Click **Run**

### Option B: Run only the call_history table
If you prefer to add just the new table:

1. Open Supabase Dashboard
2. Go to **SQL Editor**  
3. Click **New query**
4. Copy and paste this SQL:

```sql
-- Call History table for Admin Home
CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_call_history_phone ON public.call_history (phone_number);

-- Index for date-based sorting
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON public.call_history (created_at DESC);
```

5. Click **Run**

## Step 2: Verify Table Creation

Run this query to confirm the table exists:

```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'call_history' 
ORDER BY ordinal_position;
```

You should see:
- id (uuid)
- phone_number (text)
- notes (text)
- created_at (timestamp with time zone)

## Step 3: (Optional) Enable Row Level Security

For production, consider enabling RLS:

```sql
-- Enable RLS
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can access
CREATE POLICY "Authenticated users can manage call history"
ON public.call_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

## Step 4: Deploy Frontend

### Build the application
```powershell
bun run build
```

### Deploy to your hosting platform
- **Vercel**: Connect GitHub repo and deploy
- **Netlify**: Connect GitHub repo and deploy
- **Other**: Upload `dist` folder

### Environment Variables
Ensure these are set in your deployment platform:
- `VITE_SUPABASE_URL` = Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = Your Supabase anon/public key

## Step 5: Test the Feature

1. **Login** to the app with admin credentials
2. **Navigate** to Admin Home (click "Call History" button in header)
3. **Add** a phone number using the bottom input
4. **Verify** it appears in the "Today" section
5. **Test** the Call, Edit, and Delete buttons
6. **Add** a phone number that exists in your tasks
7. **Verify** it shows the client name and "View Task" button

## Verification Checklist

- [ ] call_history table created successfully
- [ ] Indexes created (idx_call_history_phone, idx_call_history_created_at)
- [ ] Can add new phone number from UI
- [ ] History displays with date grouping
- [ ] Can edit entry inline
- [ ] Can delete entry with confirmation
- [ ] Call button opens phone dialer
- [ ] Navigation between Home and Admin Home works
- [ ] Task linking works (shows client name when phone matches)
- [ ] View Task button appears and works correctly
- [ ] Mobile responsive on phone/tablet
- [ ] Dark mode works (if enabled)

## Troubleshooting

### Table creation fails
- Check if table already exists: `SELECT * FROM public.call_history LIMIT 1;`
- If it exists but has different columns, drop and recreate:
  ```sql
  DROP TABLE IF EXISTS public.call_history CASCADE;
  -- Then run creation SQL again
  ```

### Frontend errors after deployment
- Clear browser cache
- Check browser console for errors
- Verify environment variables are set correctly
- Check Supabase connection in Network tab

### Navigation doesn't work
- Make sure you deployed the latest code
- Check that both Home.tsx and AdminHome.tsx were updated
- Verify App.tsx has the navigation logic

### Task linking doesn't work
- Ensure tasks table has phone_number column
- Check that phone numbers match exactly (including formatting)
- Verify the tasks query is working in Supabase

## Rollback Plan

If you need to remove the feature:

```sql
-- Drop the table and all its data
DROP TABLE IF EXISTS public.call_history CASCADE;
```

Then redeploy the previous version of the frontend.

## Support

For issues:
1. Check `ADMIN_HOME_IMPLEMENTATION.md` for detailed documentation
2. Review `context.md` for architecture details  
3. Check Supabase logs for database errors
4. Check browser console for frontend errors

---

**Deployment Complete! 🎉**

The Admin Home call history feature is now live and ready to use.
