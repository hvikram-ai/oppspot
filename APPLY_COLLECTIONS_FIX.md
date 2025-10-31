# Apply Collections RLS Fix

## Problem
The Collections feature has infinite recursion errors due to:
1. Circular dependencies in RLS policies
2. Wrong table structure (collection_access vs collection_members)
3. Missing columns that the code expects

## Solution
Run the comprehensive migration in Supabase dashboard to fix everything at once.

## Steps to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql
2. Click "New Query"
3. Copy and paste the entire contents of:
   ```
   supabase/migrations/20251029000000_fix_collections_complete.sql
   ```
4. Click "Run" or press Cmd/Ctrl + Enter
5. You should see success messages in the output

### Option 2: Using Direct Database URL

If you have the direct database URL (not the pooler), you can run:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/20251029000001_fix_collections_rls_final.sql
```

## What This Fix Does

1. **Recreates Table**: Drops `collection_access` and creates proper `collection_members` with all needed columns:
   - `role` (owner/editor/viewer)
   - `invited_by`, `invitation_sent_at`, `invitation_accepted_at`
   - `notification_settings` (JSONB)
   - `joined_at`, `last_accessed_at`
2. **Removes Recursion**: Eliminates circular dependencies between tables
3. **Simplifies Policies**: Uses direct ownership checks instead of complex joins
4. **Enables RLS**: Ensures all tables have Row Level Security enabled

## After Applying

1. Restart your dev server (the background process should pick up the changes)
2. Test creating a collection: http://localhost:3000/dashboard
3. Test the Collections API endpoints
4. The infinite recursion errors should be gone!

## Verification

After running the migration, you should see these messages:
- ✅ Created proper collection_members table
- ✅ Removed circular dependencies
- ✅ Applied simple, non-recursive policies
- ✅ RLS enabled on all tables

## Single Migration File

Use this ONE file only:
```
supabase/migrations/20251029000000_fix_collections_complete.sql
```

This replaces and combines all previous attempts.
