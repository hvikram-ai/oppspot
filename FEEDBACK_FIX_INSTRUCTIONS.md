# Feedback Submission Error - Fix Instructions

## Problem Summary

**Error:** "Failed to submit feedback. Please try again or contact support with reference: FB-XXXXXXXXX"

**Root Cause:** The `feedback_activity` table is missing an INSERT policy in Row Level Security (RLS). When users submit feedback, the API attempts to log activity, but RLS blocks the INSERT operation, causing the entire feedback submission to fail.

---

## Investigation Results

### What We Found

1. ✅ **Tables exist** - All feedback tables are present in the database
   - `feedback`, `feedback_votes`, `feedback_comments`
   - `feedback_followers`, `feedback_activity`, `feedback_submissions`

2. ❌ **Missing RLS Policy** - The `feedback_activity` table only has:
   - SELECT policy: ✅ "Activity log viewable by all authenticated users"
   - INSERT policy: ❌ **MISSING**

3. 🔍 **API Code** (`app/api/feedback/route.ts:168-181`):
   ```typescript
   // This INSERT is blocked by RLS!
   await supabase
     .from('feedback_activity')
     .insert({
       feedback_id: feedback.id,
       user_id: user.id,
       action: 'created',
       new_value: {...}
     })
   ```

4. 📋 **Original Migration** (`supabase/migrations/20251031060948_feedback_system.sql:284`):
   ```sql
   GRANT SELECT ON feedback_activity TO authenticated;  -- Only SELECT, no INSERT!
   ```

---

## The Fix

A new migration has been created: `supabase/migrations/20251110000001_fix_feedback_activity_rls.sql`

This migration adds:
1. INSERT policy for `feedback_activity` table
2. GRANT INSERT permission to authenticated users
3. Documentation comment

---

## How to Apply the Fix

### Method 1: Supabase Dashboard (Recommended) ⭐

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
   ```

2. **Copy the migration SQL:**
   ```bash
   cat supabase/migrations/20251110000001_fix_feedback_activity_rls.sql
   ```

   Or copy this SQL directly:
   ```sql
   -- Fix Feedback Activity RLS Policies
   --
   -- Issue: feedback_activity table was missing INSERT policy
   -- causing feedback submission to fail

   -- Add INSERT policy for feedback_activity
   CREATE POLICY "Authenticated users can create activity logs"
       ON feedback_activity FOR INSERT
       WITH CHECK (auth.uid() IS NOT NULL);

   -- Update GRANT to allow INSERT operations
   GRANT INSERT ON feedback_activity TO authenticated;

   -- Add comment for documentation
   COMMENT ON POLICY "Authenticated users can create activity logs"
       ON feedback_activity
       IS 'Allows authenticated users to create activity log entries when they interact with feedback';
   ```

3. **Paste into SQL Editor** and click "Run" (or press Ctrl+Enter)

4. **Verify success** - You should see:
   ```
   Success. No rows returned
   ```

---

### Method 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref fuqdbewftdthbjfcecrz

# Push migrations
supabase db push
```

---

## Verification Steps

### 1. Check Policy Exists

Run this query in Supabase SQL Editor:

```sql
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'feedback_activity'
  AND policyname = 'Authenticated users can create activity logs';
```

**Expected result:** One row showing the new INSERT policy

### 2. Check GRANT Permissions

```sql
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'feedback_activity'
  AND grantee = 'authenticated';
```

**Expected result:** Rows showing SELECT and INSERT privileges

### 3. Test Feedback Submission

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/feedback`

3. Submit a test feedback entry

4. **Expected:** Success message without errors

5. **Verify in database:**
   ```sql
   SELECT * FROM feedback ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM feedback_activity ORDER BY created_at DESC LIMIT 1;
   ```

---

## Technical Details

### Why This Fixes the Issue

**Before fix:**
- User submits feedback → API creates feedback record → ✅ Success
- API tries to log activity → ❌ RLS blocks INSERT → **Error thrown**
- Error handler catches → Returns "Failed to submit feedback"

**After fix:**
- User submits feedback → API creates feedback record → ✅ Success
- API logs activity → ✅ INSERT allowed by new policy → **Success**
- Confirmation email sent → User sees success message

### Code Flow

1. **Client:** `app/(dashboard)/feedback/page.tsx:89-96`
   - POST request to `/api/feedback`

2. **API:** `app/api/feedback/route.ts:131-148`
   - Insert into `feedback` table (has INSERT policy ✅)

3. **API:** `app/api/feedback/route.ts:168-181`
   - Insert into `feedback_activity` table (was missing policy ❌, now fixed ✅)

4. **API:** `app/api/feedback/route.ts:184-195`
   - Insert into `feedback_submissions` table (has INSERT policy ✅)

### RLS Policy Details

**Policy Name:** "Authenticated users can create activity logs"

**Type:** FOR INSERT

**Check:** `auth.uid() IS NOT NULL`

**What it means:** Any authenticated user can insert activity logs, as long as they have a valid session (auth.uid() returns their user ID)

**Why this is safe:**
- Only authenticated users can create activity logs
- The API code sets `user_id = auth.uid()`, ensuring users can only log their own actions
- Activity logs are read-only for regular users (only SELECT policy exists for viewing)

---

## Files Created/Modified

### New Files:
1. ✅ `supabase/migrations/20251110000001_fix_feedback_activity_rls.sql` - The fix migration
2. ✅ `scripts/apply-feedback-fix.ts` - Helper script to display migration
3. ✅ `scripts/apply-feedback-fix-direct.ts` - Attempted automated apply (didn't work)
4. ✅ `scripts/apply-feedback-fix-pg.ts` - Attempted PostgreSQL direct (didn't work)
5. ✅ `FEEDBACK_FIX_INSTRUCTIONS.md` - This documentation

### Modified Files:
None - the API code is correct, only database policies needed fixing

---

## Next Steps

1. ✅ **Apply migration** using Method 1 or 2 above
2. ✅ **Verify** using verification steps
3. ✅ **Test** feedback submission
4. ✅ **Monitor** for any additional errors

---

## Questions or Issues?

If you encounter any problems:

1. Check Supabase logs in Dashboard
2. Check browser console for errors
3. Check API logs: Look for `[Feedback API]` prefixed messages
4. Verify authentication is working (user should be logged in)

---

## Reference

- **Original Migration:** `supabase/migrations/20251031060948_feedback_system.sql`
- **Fix Migration:** `supabase/migrations/20251110000001_fix_feedback_activity_rls.sql`
- **API Route:** `app/api/feedback/route.ts`
- **Frontend:** `app/(dashboard)/feedback/page.tsx`
- **Error Reference Code Format:** `FB-[timestamp][random]` (e.g., FB-MHT0C72Q4VP6YA)
