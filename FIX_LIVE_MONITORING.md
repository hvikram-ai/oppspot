# Fix for Live Monitoring Connection Errors

## Problem Summary

The live monitoring feature is showing connection errors with the following issues:

1. ❌ **500 Error**: `/api/ai-chat?action=status` - AI chat status endpoint failing
2. ❌ **404 Error**: `/api/dashboard/digest` - AI digest endpoint not found (table missing)
3. ❌ **404 Error**: `get_user_permissions` RPC function not found in database
4. ❌ **404 Error**: `team_activities` table not found in database
5. ❌ **WebSocket Error**: Subscription status showing "CLOSED"
6. ❌ **Frontend Error**: `Cannot read properties of undefined (reading 'icon')` in landing page

## Root Cause

The database migrations exist locally but haven't been applied to your Supabase hosted database. The following objects are missing:

- `get_user_permissions()` PostgreSQL function
- `has_permission()` PostgreSQL function
- `team_activities` table
- Required indexes and RLS policies

## Solution

### Quick Fix (Recommended) - Apply via Supabase Dashboard

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new

2. **Copy and paste** the entire contents of `MANUAL_FIX.sql` (in the project root)

3. **Click "Run"** to execute the SQL

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

5. **Verify the fix**:
   - Open the app at http://localhost:3000
   - Check the browser console - errors should be gone
   - The live monitoring should now show "Connected" instead of errors

### Alternative - Using Supabase CLI

If you have Supabase CLI installed and linked:

```bash
# Run the fix script
./scripts/apply-fix-migration.sh

# Or manually
supabase db push
```

## What Gets Fixed

After applying the SQL, the following will be created:

✅ **Functions**:
- `get_user_permissions(user_id UUID)` - Returns user permission array based on role
- `has_permission(user_id UUID, permission TEXT)` - Checks if user has specific permission

✅ **Tables**:
- `team_activities` - Stores team collaboration activity feed
  - With indexes for performance
  - With Row Level Security policies
  - With proper foreign key constraints

✅ **Permissions**:
- Grants EXECUTE permission to authenticated users
- RLS policies for data security

## Expected Results

After applying the fix:

1. ✅ No more 404 errors for `get_user_permissions`
2. ✅ No more 404 errors for `team_activities`
3. ✅ Live monitoring will connect successfully
4. ✅ WebSocket subscriptions will work
5. ✅ Activity feed will load properly
6. ✅ RBAC permissions will work correctly

## Still Have Issues?

If you still see errors after applying the fix:

1. **Check the browser console** for remaining errors
2. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
3. **Restart the dev server** completely
4. **Check Supabase logs**: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/logs/explorer

## Note on AI Digest 404

The `/api/dashboard/digest` 404 error is expected behavior when no digest exists yet. The endpoint returns 404 when:
- No digest has been generated for today
- User hasn't triggered digest generation

This is normal and doesn't affect live monitoring functionality.

## Files Created

- ✅ `supabase/migrations/20251110_fix_missing_objects.sql` - Full migration file
- ✅ `MANUAL_FIX.sql` - Simplified version for copy/paste
- ✅ `scripts/apply-fix-migration.sh` - Automated application script
- ✅ `FIX_LIVE_MONITORING.md` - This documentation

---

**Need Help?** Check the browser console for specific error messages after applying the fix.
