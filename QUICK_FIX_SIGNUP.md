# QUICK FIX FOR SIGNUP ERROR

## The Problem
Your signup is failing because the `profiles` table is missing the `org_id` column.

## The Solution - Run This SQL in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste this EXACT SQL:

```sql
-- Add org_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add other missing columns if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('sales', 'marketing', 'business-dev', 'research', 'founder', 'other', NULL)),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"email_notifications": true, "weekly_digest": true}',
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

5. Click **Run** button
6. You should see the list of columns including `org_id`

## Test the Fix

After running the SQL above:

```bash
# Try creating an account via script
npm run create-account

# Or test the signup page
npm run dev
# Visit http://localhost:3001/signup
```

## If You Still Get Errors

Run the complete fix from `FIX_DATABASE_NOW.sql`:
1. Open `FIX_DATABASE_NOW.sql` in your editor
2. Copy ALL the contents
3. Paste in Supabase SQL Editor
4. Click Run

This will ensure all tables, columns, and policies are properly set up.