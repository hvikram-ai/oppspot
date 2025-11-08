# 🚀 COMPETITIVE INTELLIGENCE - STRESS TEST START GUIDE

## ✅ SERVER STATUS: RUNNING

**Dev Server:** http://localhost:3000
**API Status:** ✓ Responding (401 expected without auth)
**Compilation:** ✓ Ready in 2.1s

---

## 🎯 IMMEDIATE NEXT STEPS

### STEP 1: Apply Database Migration (5 minutes)

**Option A: Supabase Dashboard (EASIEST)**

1. Open browser and go to:
   ```
   https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz
   ```

2. Login with your Supabase credentials

3. Navigate to: **SQL Editor** (left sidebar)

4. Click: **New Query** (top right)

5. Open this file in a text editor:
   ```
   supabase/migrations/20251031_competitive_intelligence.sql
   ```

6. Copy ALL contents (800+ lines) and paste into SQL Editor

7. Click: **Run** button (bottom right)

8. Wait 30 seconds for completion

9. Verify success (should show 12 tables created)

**Option B: Check if Already Applied**

If you've previously applied this migration, you can verify by running:
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'competitive%'
ORDER BY tablename;
```

Expected output: 12 tables starting with "competitive" or "analysis" or "competitor"

---

### STEP 2: Login to oppSpot (1 minute)

1. Open browser: http://localhost:3000

2. Login with demo credentials:
   ```
   Email: demo@oppspot.com
   Password: Demo123456!
   ```
   OR click "Try Demo (No Registration)"

3. You should see the dashboard

---

### STEP 3: Navigate to Competitive Intelligence (30 seconds)

1. In the navigation menu, go to:
   ```
   /competitive-analysis
   ```

   OR directly open:
   ```
   http://localhost:3000/competitive-analysis
   ```

2. You should see:
   - "Competitive Analyses" heading
   - "New Analysis" button
   - Empty table (or existing analyses if you've used this before)

---

### STEP 4: Create ITONICS Analysis (5 minutes)

**Use the test data file for easy copy-paste:**

Open in another window: `ITONICS_TEST_DATA.txt`

1. Click **"New Analysis"** button

2. **STEP 1 - Target Company:**
   - Copy-paste from ITONICS_TEST_DATA.txt:
     - Company Name: `ITONICS GmbH`
     - Website: `https://www.itonics-innovation.com`
     - Description: (full paragraph provided in file)
   - Click **"Next"**

3. **STEP 2 - Analysis Settings:**
   - Copy-paste from ITONICS_TEST_DATA.txt:
     - Title: `ITONICS Innovation OS - Q4 2024 Acquisition Analysis`
     - Market Segment: `Innovation Management Software / Enterprise SaaS`
     - Geographic Focus: Select **"Global"** from dropdown
     - Representative Price: `50000`
   - Click **"Next"**

4. **STEP 3 - Competitors:**
   - Add all 7 competitors from ITONICS_TEST_DATA.txt
   - For each competitor:
     - Name: (copy from file)
     - Website: (copy from file)
     - Click "Add Another Competitor" after each
   - After all 7 are added, click **"Create Analysis"**

5. **Verify:**
   - Should redirect to dashboard: `/competitive-analysis/[id]`
   - Should see 7 competitor cards in left sidebar
   - Should see 4 tabs: Overview, Features, Pricing, Moat

---

### STEP 5: Test Dashboard (2 minutes)

**Quick Smoke Test:**

✓ Dashboard loads without errors
✓ Header shows: Title, badges, 3 action buttons
✓ Sidebar shows: 7 competitor cards
✓ Tabs render: Overview, Features, Pricing, Moat
✓ Overview tab shows: Summary stats
✓ Features tab shows: Empty feature matrix
✓ Pricing tab shows: Empty or "no data" message
✓ Moat tab shows: "No moat analysis available"

**Open Browser Console (F12):**
- Check for any errors (red text)
- Should only see standard Next.js logs

---

### STEP 6: Follow Full Test Plan (2 hours)

Now that the basic setup is complete, follow the comprehensive test guide:

**Open:** `STRESS_TEST_MIGRATION_GUIDE.md`

**Execute:**
- Phase 3: Populate feature matrix
- Phase 4: Add pricing comparisons
- Phase 5: Trigger AI refresh
- Phase 6: Validate scoring
- Phase 7: Test visualizations
- Phase 8: Test sharing
- Phase 9: Test exports
- Phase 10: Test edge cases

**Reference Data:**
- Keep `ITONICS_TEST_DATA.txt` open for copy-paste
- Feature matrix checkmarks provided
- Pricing data provided
- Expected results provided

---

## 🛠️ TROUBLESHOOTING

### Issue: Migration Fails

**Error:** "relation already exists"
- **Solution:** Tables already created, skip migration
- **Verify:** Run check query from Option B above

**Error:** Permission denied
- **Solution:** Check you're using service role key, not anon key
- **Check:** Supabase dashboard → Settings → API

### Issue: Dashboard Shows 404

**Symptom:** "Analysis not found" after creation
- **Solution:** Check browser console for API errors
- **Verify:** Go back to /competitive-analysis list
- **Debug:** Check if analysis appears in table

### Issue: Competitor Cards Not Showing

**Symptom:** Sidebar is empty
- **Solution:** Click "Add Competitor" or check if they were saved
- **Debug:** Check API: `curl http://localhost:3000/api/competitive-analysis/[ID]/competitors`
- **Verify:** Check browser network tab for 200 response

### Issue: Feature Matrix Empty

**Expected:** This is normal initially
- **Solution:** You need to manually add features (Phase 3)
- **Or:** Trigger AI refresh to auto-detect features (Phase 5)

### Issue: Server Won't Start

**Error:** Port 3000 already in use
- **Solution:** Kill existing process: `pkill -f "next dev"`
- **Then:** `npm run dev` again

**Error:** Module not found
- **Solution:** `npm install --legacy-peer-deps`
- **Then:** `npm run dev` again

---

## 📊 SUCCESS METRICS

After completing all phases, you should have:

✅ **Analysis Created:**
- Title: "ITONICS Innovation OS - Q4 2024 Acquisition Analysis"
- Target: ITONICS GmbH
- 7 competitors added

✅ **Dashboard Populated:**
- 30+ features in matrix
- 8 pricing entries (many "undisclosed")
- Parity scores calculated
- Moat score: 70-80/100

✅ **Visualizations Working:**
- Feature matrix table displays
- Pricing bar chart renders
- Moat radar chart shows 5 dimensions
- All competitor cards show scores

✅ **Interactions Tested:**
- Refresh button triggers
- Share dialog opens
- Export dialog opens
- Navigation works

✅ **Data Quality:**
- AI refresh completes (even if partial data)
- Scoring algorithms produce reasonable results
- Missing data handled gracefully
- No crashes or blocking errors

---

## 📝 QUICK TEST CHECKLIST

Copy this checklist and mark as you go:

```
□ Migration applied successfully
□ Server running at localhost:3000
□ Logged in to oppSpot
□ Navigated to /competitive-analysis
□ Created ITONICS analysis via wizard
□ 7 competitors added
□ Dashboard loads without errors
□ Feature matrix renders (empty initially OK)
□ Pricing chart renders (empty initially OK)
□ Moat radar renders ("no data" initially OK)
□ Added 10+ features manually
□ Features appear in matrix
□ Triggered AI refresh
□ Refresh progress modal shows
□ After refresh, parity scores appear
□ Moat score calculated
□ Share dialog works
□ Export dialog opens
□ Tested removing a competitor
□ Tested filtering features
□ Checked stale data alert (if >30 days)
□ No console errors (except expected auth warnings)
□ Documented any bugs or issues
```

---

## 🎯 EXPECTED TIMELINE

- **Migration:** 5 minutes
- **Login & Navigate:** 1 minute
- **Create Analysis:** 5 minutes
- **Initial Smoke Test:** 2 minutes
- **Full Stress Test (Phases 3-10):** 2 hours
- **Documentation:** 15 minutes

**Total:** ~2.5 hours

---

## 📞 NEED HELP?

1. **Check server logs:** Look at terminal where `npm run dev` is running
2. **Check browser console:** Press F12, look for errors
3. **Check API responses:** Network tab in browser dev tools
4. **Check database:** Run verification SQL in Supabase dashboard

---

## ✨ YOU'RE READY TO GO!

**Current Status:**
✓ Server running
✓ Code complete
✓ Test data prepared
✓ Documentation ready

**Next Action:**
→ Apply database migration (Step 1)
→ Login and navigate (Steps 2-3)
→ Create ITONICS analysis (Step 4)
→ Follow full test plan

**Good luck with the stress test!** 🚀
