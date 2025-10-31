# Collections RLS Infinite Recursion - Fix Summary

## Problem Identified

The infinite recursion errors you're seeing are caused by two issues:

### Issue 1: API Using Wrong Table Name
The API code in `app/api/collections/route.ts` was querying `collection_access` table (line 48), but the migrations renamed it to `collection_members`. This mismatch was causing queries to fail or hit old policies.

### Issue 2: Stale RLS Policies
Multiple migrations created overlapping RLS policies on the collections tables. These old policies created circular dependencies that caused infinite recursion when querying collections with nested collection_items.

## Fixes Applied

### 1. Updated API Code ✅
- Changed `collection_access` → `collection_members` in `/app/api/collections/route.ts`
- Changed `permission_level` → `role` field
- Code changes are already applied and will take effect after migration

### 2. Created Clean RLS Migration ✅
- New migration file: `supabase/migrations/20251029120000_clean_rls_final.sql`
- This migration:
  - Disables RLS temporarily
  - Drops ALL existing policies on all collections tables
  - Creates fresh, simple policies with NO circular references
  - Re-enables RLS

## Action Required: Apply the Migration

Since I cannot connect to your Supabase database directly, you need to manually run the migration SQL:

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
2. Copy the ENTIRE contents of `supabase/migrations/20251029120000_clean_rls_final.sql`
3. Paste into the SQL editor
4. Click "Run"
5. You should see success messages in the "Results" panel

### Option 2: Via psql (If you have direct DB access)
```bash
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@db.fuqdbewftdthbjfcecrz.supabase.co:5432/postgres" \
  -f supabase/migrations/20251029120000_clean_rls_final.sql
```

## After Running the Migration

1. **Restart your dev server:**
   ```bash
   # Kill existing dev servers
   pkill -f "next dev"

   # Start fresh
   npm run dev
   ```

2. **Verify the fix:**
   - The infinite recursion errors should be GONE from your dev server logs
   - Collections API should work normally
   - Tests should start passing

3. **Check for any remaining errors:**
   - Monitor the dev server output
   - Run: `npm run test:e2e -- tests/e2e/collections-api.spec.ts`

## What the New RLS Policies Do

### Collections Table (4 policies)
- `collections_select_own`: Users can see their own collections
- `collections_insert_own`: Users can create collections for themselves
- `collections_update_own`: Users can update their non-system collections
- `collections_delete_own`: Users can delete their non-system collections

### Collection Members Table (4 policies)
- `members_select_own`: Users can see their own memberships
- `members_insert`: Collection owners can add members
- `members_update`: Collection owners can update members
- `members_delete`: Collection owners can remove members

### Collection Items Table (4 policies)
- `items_select`: Users can see items in their collections
- `items_insert`: Users can add items to their collections
- `items_update`: Collection owners can update items
- `items_delete`: Collection owners can delete items

## Why This Fixes the Recursion

The old policies had circular references where:
- `collections` policies checked `collection_members`
- `collection_members` policies checked `collections`

The new policies:
- Use simple `user_id = auth.uid()` checks where possible
- When checking ownership, use aliased table names (`collections c`) to avoid confusion
- Never reference the same table being queried within its own policy
- Keep the EXISTS subqueries simple and direct

## Files Changed

1. ✅ `app/api/collections/route.ts` - Updated to use `collection_members` table
2. ✅ `supabase/migrations/20251029120000_clean_rls_final.sql` - New clean RLS policies
3. ✅ This summary document

## Need Help?

If you still see errors after applying the migration:
1. Check the Supabase SQL editor "Results" tab for any errors
2. Share the error messages with me
3. Check that `collection_members` table exists: `SELECT * FROM collection_members LIMIT 1;`
4. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'collection%';`
