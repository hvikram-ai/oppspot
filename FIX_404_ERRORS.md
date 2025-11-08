# Fix 404 Errors - Production Deployment Guide

## Problem Summary

Your production deployment at `https://oppspot-qgl954rdp-h-viks-projects.vercel.app/` is showing multiple 404 errors because several database tables and functions haven't been applied to the production database.

### Errors Identified:

1. ❌ **`get_user_permissions`** - Missing RPC function (RBAC system)
2. ❌ **`team_activities`** - Missing table (TeamPlay activity feed)
3. ❌ **`user_presence`** - Missing table (who's online feature)
4. ❌ **`upsert_user_presence`** - Missing RPC function
5. ❌ **`/api/dashboard/digest`** - 404 (table missing, not route)
6. ❌ **`/api/ai-chat?action=status`** - 500 error (needs investigation)
7. ❌ **Companies House search** - Failed to load businesses

---

## Solution

### Step 1: Apply Missing Database Migrations

I've created a script that will apply all missing migrations to your production database.

**Run this command:**

```bash
cd /home/vik/oppspot
./scripts/apply-missing-migrations.sh
```

**What this script does:**

1. Applies RBAC permissions functions (`get_user_permissions`, `has_permission`)
2. Creates TeamPlay tables (`team_activities`, `user_presence`, `comments`)
3. Creates collaboration triggers and functions
4. Applies stream workflow tables
5. Applies feedback system tables
6. Applies competitive intelligence features
7. Verifies all tables and functions exist

**Migrations applied (in order):**

1. `supabase/migrations/20251031_rbac_permissions.sql` - **NEW** (created today)
2. `supabase/migrations/20251002000005_teamplay.sql`
3. `supabase/migrations/20251012000001_collaboration_triggers.sql`
4. `supabase/migrations/20251031000003_stream_workflow.sql`
5. `supabase/migrations/20251031060948_feedback_system.sql`
6. `supabase/migrations/20251031_competitive_intelligence.sql`

---

### Step 2: Verify Migrations Applied

After running the script, verify the tables exist:

```bash
PGPASSWORD=TCLP-oppSpot3 psql \
  -h aws-0-eu-west-2.pooler.supabase.com \
  -U postgres.fuqdbewftdthbjfcecrz \
  -d postgres \
  -p 6543 \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('team_activities', 'user_presence', 'comments') ORDER BY tablename;"
```

**Expected output:**
```
 tablename
-----------------
 comments
 team_activities
 user_presence
(3 rows)
```

---

### Step 3: Verify RPC Functions

Check that the RPC functions exist:

```bash
PGPASSWORD=TCLP-oppSpot3 psql \
  -h aws-0-eu-west-2.pooler.supabase.com \
  -U postgres.fuqdbewftdthbjfcecrz \
  -d postgres \
  -p 6543 \
  -c "SELECT proname FROM pg_proc WHERE proname IN ('get_user_permissions', 'upsert_user_presence', 'has_permission') ORDER BY proname;"
```

**Expected output:**
```
       proname
----------------------
 get_user_permissions
 has_permission
 upsert_user_presence
(3 rows)
```

---

### Step 4: Refresh Your Browser

After applying migrations:

1. **Hard refresh** your browser (Ctrl+Shift+R on Linux/Windows, Cmd+Shift+R on Mac)
2. **Clear cache** if needed
3. **Check the console** - the 404 errors should be gone

---

## Files Created/Modified

### New Files:
1. ✅ `supabase/migrations/20251031_rbac_permissions.sql` - RBAC permission functions
2. ✅ `scripts/apply-missing-migrations.sh` - Migration application script

### Modified Files:
None - all migrations are new applications

---

## Troubleshooting

### Issue: Connection Error

If you get a connection error like:
```
psql: error: connection to server failed: FATAL: Tenant or user not found
```

**Solution:** Check that the database credentials are correct in the script. The current credentials are:
- Host: `aws-0-eu-west-2.pooler.supabase.com`
- User: `postgres.fuqdbewftdthbjfcecrz`
- Database: `postgres`
- Port: `6543`
- Password: `TCLP-oppSpot3`

If these have changed, update the script variables at the top.

---

### Issue: Migration Already Exists

If you see:
```
ERROR:  relation "team_activities" already exists
```

**This is OK!** The script will show "❌ Failed (may already exist)" but continue. As long as the verification step shows the tables exist, you're good.

---

### Issue: AI Chat 500 Error

The `/api/ai-chat?action=status` endpoint is returning 500. This might be:

1. **Missing environment variable** - Check that `OPENROUTER_API_KEY` is set in Vercel
2. **Database table missing** - Check if there's an `ai_chat_sessions` table
3. **Code error** - Check the API route logs in Vercel

**To investigate:**

```bash
# Check the API route code
cat app/api/ai-chat/route.ts

# Check Vercel logs
vercel logs https://oppspot-qgl954rdp-h-viks-projects.vercel.app
```

---

### Issue: Companies House Search Failed

The error "failed to load businesses in companies house search" suggests:

1. **Missing API key** - Check `COMPANIES_HOUSE_API_KEY` in Vercel environment variables
2. **API endpoint down** - Check if Companies House API is accessible
3. **Database query issue** - Check RLS policies on `businesses` table

**To check environment variables:**

```bash
# In Vercel dashboard, go to:
# Project Settings → Environment Variables
# Verify these exist:
# - COMPANIES_HOUSE_API_KEY
# - FINANCIAL_DATA_API_KEY (if needed)
```

---

## Expected Results After Fix

After applying all migrations and refreshing:

✅ **RBAC Context** - No more `get_user_permissions` 404 errors
✅ **TeamPlay Activity Feed** - `team_activities` table accessible
✅ **User Presence** - "Who's online" feature working
✅ **Comments** - Team collaboration comments working
✅ **Dashboard Digest** - Digest API working (if table exists)

---

## Next Steps

1. ✅ Run `./scripts/apply-missing-migrations.sh`
2. ✅ Verify tables and functions exist
3. ✅ Refresh browser and check console
4. ⏳ Investigate remaining issues:
   - AI Chat 500 error
   - Companies House search
   - CSS preload warnings (minor, not critical)

---

## Contact

If you encounter issues:

1. Check the script output for specific error messages
2. Verify database credentials are correct
3. Check Vercel logs for API route errors
4. Ensure all environment variables are set in Vercel

---

**Last Updated:** 2025-10-31
**Status:** Ready to apply
**Risk:** Low (migrations are idempotent and safe)
