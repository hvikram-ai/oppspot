# Quickstart: Competitive Intelligence Dashboard

**Purpose**: Quick validation guide for testing the Competitive Intelligence Dashboard after implementation.

## Prerequisites

- oppspot running locally (`npm run dev`)
- Authenticated user account
- At least 2 competitor companies in database

## Test Scenario: Create & View Competitive Analysis

### Step 1: Create New Analysis
1. Navigate to `/competitive-analysis`
2. Click "New Analysis" button
3. Fill in form:
   - Target Company: "ITONICS Innovation"
   - Title: "ITONICS M&A Analysis"
   - Market Segment: "Enterprise SaaS"
4. Click "Create Analysis"

**Expected**: Redirected to `/competitive-analysis/[id]` dashboard page

### Step 2: Add Competitors
1. Click "Add Competitor" button
2. Search or enter: "Miro"
3. Select from dropdown
4. Repeat for: "Monday.com", "Aha!"

**Expected**: 3 competitor cards appear in dashboard

### Step 3: Trigger Data Refresh
1. Click "Refresh Data" button (top right)
2. Observe progress indicators

**Expected**:
- Progress bar shows "Gathering data... 1/3 competitors"
- Completes in <2 minutes (FR-028)
- Dashboard updates with scores

### Step 4: View Feature Matrix
1. Scroll to "Feature Matrix" section
2. Verify side-by-side table shows:
   - Feature names in rows
   - Target + 3 competitors in columns
   - Checkmarks for possessed features

**Expected**: At least 10 features listed

### Step 5: View Feature Parity Scores
1. Locate "Feature Parity Scores" cards
2. Verify each competitor has:
   - Score (0-100)
   - Confidence level indicator
   - Last calculated timestamp

**Expected**: Scores display correctly, e.g., "Miro: 87/100"

### Step 6: View Moat Strength
1. Locate "Competitive Moat Strength" section
2. Verify radar chart displays with 5 axes:
   - Feature Differentiation
   - Pricing Power
   - Brand Recognition
   - Customer Lock-In
   - Network Effects

**Expected**: Radar chart renders, overall score displayed

### Step 7: Export to PDF
1. Click "Export" button
2. Select "PDF" format
3. Click "Download"

**Expected**: PDF downloads in <10 seconds, contains all dashboard data

### Step 8: Share Analysis
1. Click "Share" button
2. Enter colleague email
3. Select "View" permission
4. Click "Invite"

**Expected**: Toast notification "Invitation sent"

### Step 9: Stale Data Alert (Future)
1. Manually set `last_refreshed_at` to 35 days ago in database
2. Log out and log back in

**Expected**: Alert banner appears: "Your ITONICS M&A Analysis has stale data (35 days old). Refresh now?"

## Performance Validation

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Analysis generation | <2 min | Time from "Refresh" click to completion |
| Dashboard load | <3 sec | Network tab: Time to interactive |
| Export generation | <10 sec | Time from "Download" to file received |

## Success Criteria

✅ All 9 steps complete without errors
✅ Performance targets met
✅ Data persists after page refresh
✅ Sharing permissions work correctly

## Troubleshooting

**Issue**: "Refresh Data" times out after 2 minutes
- **Solution**: Check ResearchGPT™ service is running, verify OpenRouter API key

**Issue**: Feature matrix is empty
- **Solution**: Verify `feature_matrix_entries` table has data, check RLS policies

**Issue**: Export fails with 500 error
- **Solution**: Check export service logs, verify `pptxgenjs` dependency installed

---

**Quickstart Complete** | If all steps pass, feature is ready for production
