# SaaS Valuation Feature - Testing Guide

This guide provides step-by-step instructions for testing the SaaS Valuation Model feature in oppSpot.

---

## 🎯 Overview

The SaaS Valuation feature enables users to generate AI-powered company valuations with prominent "$75M-$120M" ranges to anchor M&A negotiations. This guide covers:

- Database verification
- UI flow testing
- API endpoint testing
- AI extraction testing
- Permission testing

---

## 📋 Prerequisites

- ✅ Database migration applied (`20250113_saas_valuation_model.sql`)
- ✅ Development server running (`npm run dev`)
- ✅ Access to Supabase Dashboard
- ✅ Test user account with data room access

---

## 🗄️ Database Verification

Run these queries in the **Supabase SQL Editor** (https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new):

### 1. Check All Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'saas_valuation_models',
    'valuation_comparables',
    'valuation_scenarios',
    'valuation_exports'
  )
ORDER BY table_name;
```

**Expected Result**: 4 rows returned
- `saas_valuation_models`
- `valuation_comparables`
- `valuation_exports`
- `valuation_scenarios`

---

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%valuation%'
ORDER BY tablename;
```

**Expected Result**: All 4 tables should have `rowsecurity = true`

---

### 3. Check RLS Policies

```sql
SELECT
  tablename,
  policyname,
  cmd,
  CASE WHEN cmd = 'SELECT' THEN 'View'
       WHEN cmd = 'INSERT' THEN 'Create'
       WHEN cmd = 'UPDATE' THEN 'Edit'
       WHEN cmd = 'DELETE' THEN 'Delete'
  END as operation
FROM pg_policies
WHERE tablename LIKE '%valuation%'
ORDER BY tablename, cmd;
```

**Expected Result**: ~16 policies total
- `saas_valuation_models`: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- `valuation_comparables`: 4 policies
- `valuation_scenarios`: 4 policies
- `valuation_exports`: 2 policies (SELECT, INSERT)

---

### 4. Check Helper View

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'valuation_models_with_stats';
```

**Expected Result**: 1 row (`valuation_models_with_stats`)

---

### 5. Check Triggers

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table LIKE '%valuation%'
ORDER BY event_object_table;
```

**Expected Result**: 2 triggers
- `trigger_update_valuation_models_updated_at` on `saas_valuation_models`
- `trigger_update_valuation_scenarios_updated_at` on `valuation_scenarios`

---

## 🌐 UI Testing (Browser)

### Test 1: Create Valuation (Manual Entry)

1. **Navigate to Application**:
   - Open browser: http://localhost:3000
   - Login with demo credentials or test account

2. **Access Data Room**:
   - Click "Data Rooms" in navigation
   - Select an existing data room (or create one)
   - Click on the **"Valuations"** tab

3. **Create Valuation - Step 1 (Basic Info)**:
   - Click **"Create Valuation"** button
   - Fill in fields:
     - **Model Name**: `Test Valuation - ITONICS Q4 2024`
     - **Company Name**: `ITONICS GmbH`
     - **Currency**: `USD`
     - **Fiscal Year End**: `2024-12-31` (optional)
   - Click **"Next"**

4. **Create Valuation - Step 2 (Data Source)**:
   - Select **"Manual Entry"** (blue button)
   - Click **"Next"**

5. **Create Valuation - Step 3 (Financial Inputs)**:
   - **ARR**: `10000000` ($10M)
   - **MRR**: `833333` (~$833K)
   - **Revenue Growth Rate**: `45.5` (%)
   - **Gross Margin**: `75.0` (%)
   - **Net Revenue Retention**: `110.0` (%)
   - **CAC Payback**: `12` (months)
   - Click **"Review"**

6. **Create Valuation - Step 4 (Review)**:
   - Verify all details are correct
   - Click **"Create Valuation"**

7. **Expected Result**:
   - ✅ Success toast: "Valuation created successfully"
   - ✅ Display range: e.g., "$75M-$120M" (exact range depends on calculation)
   - ✅ Should redirect to valuation detail page (or return to list)
   - ✅ Valuation card shows:
     - Model name and company name
     - Prominent valuation range
     - Revenue multiple (e.g., "10.5x")
     - Data quality score (e.g., "85%")
     - Growth rate with trend arrow
     - Confidence level (High/Medium/Low)

---

### Test 2: View Valuation List

1. **Navigate to Valuations List**:
   - From data room, click "Valuations" tab
   - Should see grid of valuation cards

2. **Expected Result**:
   - ✅ All valuations displayed in responsive grid (1-3 columns)
   - ✅ Each card shows:
     - Model name
     - Company name
     - Status badge (Complete, Draft, etc.)
     - Valuation range (if complete)
     - Key metrics
   - ✅ "View Details" button works
   - ✅ Dropdown menu (3 dots) shows options

---

### Test 3: Recalculate Valuation

1. **From Valuations List**:
   - Click dropdown menu (⋮) on a completed valuation
   - Click **"Recalculate"**

2. **Expected Result**:
   - ✅ Success toast: "Valuation recalculated"
   - ✅ Valuation card updates with new values
   - ✅ Loading state shown during recalculation

---

### Test 4: Export Valuation (Future Feature)

1. **From Valuations List**:
   - Click dropdown menu (⋮) on a valuation
   - Click **"Export PDF"**

2. **Expected Result**:
   - ✅ Info toast: "PDF export coming soon"

---

### Test 5: Delete Valuation

1. **From Valuations List**:
   - Click dropdown menu (⋮) on a valuation
   - Click **"Delete"**
   - Confirm deletion in modal

2. **Expected Result**:
   - ✅ Confirmation dialog appears
   - ✅ After confirming, success toast: "Valuation deleted"
   - ✅ Valuation card removed from grid
   - ✅ Database record has `deleted_at` timestamp (soft delete)

---

### Test 6: Empty State

1. **Delete All Valuations** (if any exist)
2. **Navigate to Valuations Tab**

3. **Expected Result**:
   - ✅ Empty state card displayed
   - ✅ Dollar sign icon
   - ✅ Message: "No valuations yet"
   - ✅ "Create First Valuation" button

---

### Test 7: Create Valuation (AI Extraction)

**Note**: This test requires documents uploaded to the data room.

1. **Upload Test Documents**:
   - Go to data room "Documents" tab
   - Upload a pitch deck or financial statement (PDF)

2. **Create Valuation - AI Extraction**:
   - Click "Create Valuation"
   - **Step 1**: Enter model name and company name
   - **Step 2**: Select **"AI Extraction"**
   - Select 1+ documents from list
   - Click "Next"
   - **Step 3**: Leave fields blank (AI will extract)
   - Click "Review" → "Create Valuation"

3. **Expected Result**:
   - ✅ Status changes: Draft → Extracting → Calculating → Complete
   - ✅ Progress shown on card (33% → 66% → 100%)
   - ✅ AI extracts financials from documents
   - ✅ Confidence scores displayed for extracted data
   - ✅ Takes ~5-30 seconds depending on document size

---

## 🧪 API Endpoint Testing

### Test with cURL (Requires Auth Token)

First, get your auth token from browser:
1. Login to http://localhost:3000
2. Open DevTools → Application → Cookies
3. Copy `sb-access-token` value

Then run these tests:

#### 1. Create Valuation

```bash
curl -X POST http://localhost:3000/api/data-room/valuations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "data_room_id": "YOUR_DATA_ROOM_ID",
    "model_name": "API Test Valuation",
    "company_name": "Test Company",
    "currency": "USD",
    "arr": 10000000,
    "revenue_growth_rate": 45,
    "gross_margin": 75,
    "net_revenue_retention": 110,
    "extraction_method": "manual"
  }'
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "valuation_model_id": "uuid-here",
  "valuation_range": "$75M-$120M",
  "valuation_low": 75000000,
  "valuation_mid": 95000000,
  "valuation_high": 120000000,
  "multiple_low": 7.5,
  "multiple_mid": 9.5,
  "multiple_high": 12.0,
  "confidence": 0.85,
  "data_quality_score": 0.90
}
```

---

#### 2. List Valuations

```bash
curl http://localhost:3000/api/data-room/valuations?data_room_id=YOUR_DATA_ROOM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "valuations": [
    {
      "id": "uuid",
      "model_name": "API Test Valuation",
      "company_name": "Test Company",
      "status": "complete",
      "estimated_valuation_low": 75000000,
      "estimated_valuation_mid": 95000000,
      "estimated_valuation_high": 120000000,
      "created_at": "2025-01-13T..."
    }
  ],
  "total": 1
}
```

---

#### 3. Get Specific Valuation

```bash
curl http://localhost:3000/api/data-room/valuations/VALUATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "valuation": {
    "id": "uuid",
    "model_name": "API Test Valuation",
    "arr": 10000000,
    "revenue_growth_rate": 45,
    "estimated_valuation_mid": 95000000,
    "valuation_confidence": 0.85,
    "status": "complete"
  },
  "valuation_range": "$75M-$120M",
  "scenarios": [],
  "comparables": []
}
```

---

#### 4. Recalculate Valuation

```bash
curl -X POST http://localhost:3000/api/data-room/valuations/VALUATION_ID/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "revenue_growth_rate": 60
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "valuation_range": "$80M-$130M",
  "valuation_mid": 100000000,
  "multiple_mid": 10.0,
  "confidence": 0.87
}
```

---

#### 5. Delete Valuation

```bash
curl -X DELETE http://localhost:3000/api/data-room/valuations/VALUATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Valuation deleted successfully"
}
```

---

## 🔐 Permission Testing

### Test 1: Viewer Permissions

1. **Create Test User with Viewer Role**:
   - Login as data room owner
   - Invite user with "Viewer" permission
   - Login as viewer

2. **Expected Results**:
   - ✅ Can view valuations list
   - ✅ Can view valuation details
   - ✅ Can export valuations
   - ❌ **Cannot** create new valuations (button disabled/hidden)
   - ❌ **Cannot** recalculate valuations
   - ❌ **Cannot** delete valuations

---

### Test 2: Editor Permissions

1. **Create Test User with Editor Role**:
   - Login as data room owner
   - Invite user with "Editor" permission
   - Login as editor

2. **Expected Results**:
   - ✅ Can view valuations
   - ✅ Can create new valuations
   - ✅ Can recalculate valuations
   - ✅ Can export valuations
   - ❌ **Cannot** delete valuations (owner only)

---

### Test 3: Owner Permissions

1. **Login as Data Room Owner**

2. **Expected Results**:
   - ✅ Full access to all features
   - ✅ Can create, view, edit, recalculate, export, delete

---

## 📊 Calculation Testing

### Test Scenario 1: High-Growth SaaS

**Input**:
- ARR: $10M
- Growth: 100%
- Gross Margin: 80%
- NRR: 120%
- EBITDA: Positive

**Expected Output**:
- Multiple: ~11-13x (high adjustments for strong metrics)
- Valuation: $110M-$130M
- Confidence: High (>70%)

---

### Test Scenario 2: Mature SaaS

**Input**:
- ARR: $50M
- Growth: 15%
- Gross Margin: 70%
- NRR: 105%
- EBITDA: Positive

**Expected Output**:
- Multiple: ~7-9x (moderate adjustments)
- Valuation: $350M-$450M
- Confidence: High

---

### Test Scenario 3: Early-Stage / High Burn

**Input**:
- ARR: $2M
- Growth: 150%
- Gross Margin: 60%
- NRR: 95%
- Burn Rate: $500K/month
- Runway: 6 months

**Expected Output**:
- Multiple: ~8-10x (growth boost, runway penalty)
- Valuation: $16M-$20M
- Confidence: Medium (40-70%) due to cash concerns

---

### Test Scenario 4: Incomplete Data

**Input**:
- ARR: $5M
- Growth: Not provided
- Gross Margin: Not provided
- NRR: Not provided

**Expected Output**:
- Multiple: ~8x (base multiple only, no adjustments)
- Valuation: $32M-$48M
- Confidence: Low (<40%)
- Warning message about missing data

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. ⚠️ **PDF Export**: Not yet implemented (shows "coming soon" toast)
2. ⚠️ **DCF Methodology**: Only revenue multiple currently supported
3. ⚠️ **External Comps**: No automatic comparable company data (manual only)
4. ⚠️ **Excel Export**: Not implemented
5. ⚠️ **Charts**: No visual charts yet (future enhancement)

### Edge Cases to Test
- [ ] Very large ARR (>$100M)
- [ ] Very small ARR (<$1M)
- [ ] Negative growth rate
- [ ] Zero gross margin
- [ ] Empty documents (AI extraction fails gracefully)
- [ ] Non-PDF documents (should reject or skip)
- [ ] Concurrent recalculations (should handle race conditions)

---

## ✅ Test Checklist

Use this checklist to track your testing progress:

### Database
- [ ] Tables created
- [ ] RLS policies enabled
- [ ] Triggers working
- [ ] Helper view accessible

### UI - Manual Entry
- [ ] Create valuation wizard (4 steps)
- [ ] Form validation works
- [ ] Valuations list view
- [ ] Valuation card display
- [ ] Recalculate button
- [ ] Delete with confirmation
- [ ] Empty state

### UI - AI Extraction
- [ ] Document selection
- [ ] AI extraction progress
- [ ] Confidence scores displayed
- [ ] Error handling for failures

### API Endpoints
- [ ] POST /api/data-room/valuations (create)
- [ ] GET /api/data-room/valuations (list)
- [ ] GET /api/data-room/valuations/[id] (get)
- [ ] PATCH /api/data-room/valuations/[id] (update)
- [ ] DELETE /api/data-room/valuations/[id] (delete)
- [ ] POST /api/data-room/valuations/[id]/calculate (recalculate)

### Permissions
- [ ] Viewer can view only
- [ ] Editor can create/edit
- [ ] Owner can delete
- [ ] Unauthorized users blocked

### Calculations
- [ ] High-growth scenario
- [ ] Mature SaaS scenario
- [ ] High burn scenario
- [ ] Incomplete data scenario

### Error Handling
- [ ] Missing required fields
- [ ] Invalid ARR (negative)
- [ ] Invalid margins (>100%)
- [ ] Unauthorized access
- [ ] Document extraction failure

---

## 📞 Troubleshooting

### Issue: "Valuation not calculating"
**Solution**:
- Check ARR is provided (required for revenue multiple)
- Check browser console for errors
- Check database logs for calculation errors

### Issue: "AI extraction failing"
**Solution**:
- Verify OPENROUTER_API_KEY is set in `.env.local`
- Check document has text content (not scanned images)
- Check document format is PDF
- Check OpenRouter API status

### Issue: "Permission denied"
**Solution**:
- User needs editor or owner role in data room
- Check RLS policies are correctly configured
- Verify user is authenticated

### Issue: "Tables not found"
**Solution**:
- Verify migration was applied successfully
- Check Supabase dashboard for errors
- Re-run migration SQL manually if needed

---

## 📈 Success Criteria

The feature is working correctly if:

✅ All database tables and policies created
✅ Users can create valuations (manual & AI)
✅ Valuation ranges display prominently
✅ Confidence scores are calculated
✅ Recalculation works
✅ Permissions enforced correctly
✅ No console errors
✅ Responsive on mobile
✅ Loading states display properly

---

## 🚀 Next Steps After Testing

1. **Report Issues**: Document any bugs found
2. **User Feedback**: Test with real users (PE associates, M&A advisors)
3. **Performance**: Monitor calculation times (target: <1s for manual, <30s for AI)
4. **Phase 2**: Plan DCF methodology, PDF export, external comps API

---

**Status**: Ready for Production Testing 🎉
**Version**: 1.0.0
**Last Updated**: January 13, 2025
