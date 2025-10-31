# Troubleshooting Collections RLS Issues

## Current Status
- ✅ Playwright config fixed (port 3000)
- ✅ Database tables exist
- ✅ Columns, enums, functions exist
- ❌ API returning HTTP 500
- ❌ RLS verification failing

## Step-by-Step Troubleshooting

### Step 1: Verify RLS Is Actually Enabled

Run this query in **Supabase Dashboard → SQL Editor**:

```sql
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'collection_items', 'collection_access')
ORDER BY tablename;
```

**Expected Result:**
```
tablename           | rls_enabled | status
--------------------|-------------|-------------
collection_access   | true        | ✅ ENABLED
collection_items    | true        | ✅ ENABLED
collections         | true        | ✅ ENABLED
```

**If you see `false` (DISABLED):**
RLS was NOT applied. Run the complete script again:

```bash
# In Supabase Dashboard SQL Editor, paste and run:
scripts/apply-collections-rls-complete.sql
```

### Step 2: Check RLS Policies Exist

Run this query:

```sql
SELECT
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('collections', 'collection_items', 'collection_access')
ORDER BY tablename, policyname;
```

**Expected Result:** Should show **12 policies total**
- 4 policies for `collections`
- 4 policies for `collection_items`
- 4 policies for `collection_access`

**If you see 0 policies:**
The RLS policies script didn't run. Apply it now.

### Step 3: Check Actual Database Error

Run this test query as an authenticated user:

```sql
-- This should work for authenticated users
SELECT * FROM collections LIMIT 1;
```

**If this fails with "permission denied" or "RLS":**
- RLS is enabled BUT policies are wrong/missing
- Re-run: `scripts/apply-collections-rls-complete.sql`

**If this succeeds:**
- Database is fine, problem is in API code

### Step 4: Test API with Detailed Logging

Check the Next.js dev server logs when the test runs. Look for:

```
Error creating collection: {
  code: '...',
  message: '...'
}
```

Common error codes:
- `42501` - Permission denied (RLS blocking)
- `23502` - NOT NULL violation (missing required field)
- `23505` - Unique constraint violation
- `42P01` - Table doesn't exist

### Step 5: Manual API Test

Try creating a collection manually through the UI:

1. Login to http://localhost:3000/login (demo@oppspot.com / Demo123456!)
2. Go to http://localhost:3000/collections
3. Click "New Collection"
4. Enter a name and create
5. Check browser console for errors
6. Check server logs for detailed error

## Quick Fixes

### Fix 1: Force Apply RLS
```sql
-- Run each command separately in SQL Editor

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;
```

### Fix 2: Verify Service Role Key
The API uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.

Check in `.env.local`:
```bash
grep SUPABASE_SERVICE_ROLE_KEY .env.local
```

Should be set. If missing, add it from Supabase Dashboard → Settings → API.

### Fix 3: Check Auth Context

The error might be auth-related, not RLS. Check if user is properly authenticated:

```typescript
// In app/api/collections/route.ts
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user) // Should not be null
```

## What to Share With Me

After running the troubleshooting steps, please share:

1. **RLS Status Query Result** (Step 1)
2. **Policy Count** (Step 2)
3. **Exact error message** from Step 4 server logs
4. **Did manual test work?** (Step 5)

Then I can provide targeted fix!

## Nuclear Option: Reset Everything

If nothing works, reset the collections tables completely:

```sql
-- ⚠️ WARNING: This deletes all data!
DROP TABLE IF EXISTS collection_access CASCADE;
DROP TABLE IF EXISTS collection_items CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- Then run the full migration:
-- 1. supabase/migrations/20251027000001_create_collections_tables.sql
-- 2. scripts/apply-collections-rls-complete.sql
```
