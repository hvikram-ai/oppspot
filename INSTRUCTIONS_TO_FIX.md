# Instructions to Fix Live Monitoring Errors

## Problem Summary

The live monitoring is showing errors because:

1. **Missing database objects** - Functions and tables not created in Supabase
2. **API errors on landing page** - Chat widget loads before user authentication
3. **Cached errors** - Browser and Next.js are caching failed requests

## Step-by-Step Fix

### STEP 1: Apply Database Fixes (CRITICAL)

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
   ```

2. Copy **ALL** contents of `/home/vik/oppspot/COMPLETE_FIX.sql`

3. Paste into SQL Editor and click **"Run"**

4. You should see output like:
   ```
   ✅ get_user_permissions test: {...}
   Created Functions: get_user_permissions, has_permission
   Created Tables: team_activities, ai_digest
   ```

5. If you see any errors, run `/home/vik/oppspot/CHECK_LIVE_MONITORING.sql` to see what's missing

### STEP 2: Clear All Caches

```bash
# Stop the dev server (Ctrl+C in the terminal where it's running)

# Clear Next.js cache
rm -rf /home/vik/oppspot/.next

# Restart dev server
cd /home/vik/oppspot
npm run dev
```

### STEP 3: Clear Browser Cache

1. Open the app in browser
2. Press **F12** to open DevTools
3. Right-click the refresh button
4. Select **"Empty Cache and Hard Reload"**
   - OR press **Ctrl+Shift+R** (Linux/Windows)
   - OR press **Cmd+Shift+R** (Mac)

### STEP 4: Verify the Fix

1. Open the app (it should be on http://localhost:3005 or similar)
2. Press **F12** to open browser console
3. Check for errors:

**BEFORE FIX - You see:**
```
❌ Failed to load resource: 500 (api/ai-chat?action=status)
❌ Failed to load resource: 404 (get_user_permissions)
❌ Failed to load resource: 404 (team_activities)
❌ Failed to load resource: 404 (api/dashboard/digest)
❌ Subscription status: CLOSED
```

**AFTER FIX - You should see:**
```
✅ No 404 errors
✅ No 500 errors
✅ Subscription status: SUBSCRIBED or CONNECTED
✅ Clean console (maybe some warnings but no red errors)
```

## Expected Results

After completing all 4 steps:

- ✅ No database-related 404 errors
- ✅ No 500 errors on AI chat
- ✅ WebSocket connections work
- ✅ Live monitoring shows "Connected"
- ✅ Real-time features work
- ✅ Team activities load correctly

## Troubleshooting

### If errors persist after Step 4:

1. **Verify database objects were created:**
   - Run `/home/vik/oppspot/CHECK_LIVE_MONITORING.sql` in Supabase
   - All checks should show ✅ EXISTS

2. **Check Supabase logs:**
   ```
   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/logs/explorer
   ```
   - Look for recent errors
   - Filter by "Error" or "Failed"

3. **Verify environment variables:**
   ```bash
   grep "LLM_MASTER_KEY" /home/vik/oppspot/.env.local
   # Should show: LLM_MASTER_KEY=8c2a911f0de79668e0294e6a293465e6c96d1377dccacd964c812fb43fd07a1c
   ```

4. **Check dev server logs:**
   - Look at the terminal where `npm run dev` is running
   - Look for any startup errors

### If the AI chat widget still shows errors:

This is actually **EXPECTED** on the landing page (homepage) because there's no authenticated user. The errors will disappear once you log in.

To verify:
1. Go to `/login` and log in
2. Check the console again - AI chat should work without errors

### Still having issues?

1. Kill all Node processes:
   ```bash
   killall node
   npm run dev
   ```

2. Try a different browser (to rule out browser-specific caching)

3. Check if port 3000 is in use:
   ```bash
   lsof -ti:3000 | xargs kill -9
   npm run dev
   ```

## Files Reference

- `COMPLETE_FIX.sql` - Complete database fix (run this in Supabase)
- `CHECK_LIVE_MONITORING.sql` - Verification script
- `MANUAL_FIX.sql` - Alternative shorter version
- This file - Step-by-step instructions

## Quick Test

After applying all fixes, test with:

```bash
# Test AI chat endpoint
curl http://localhost:3005/api/ai-chat?action=status

# Should return JSON with llm_manager object
# NOT a 500 error
```

---

**Next Step**: Start with STEP 1 above and apply the database fixes!
