# Quickstart: M&A Target Prediction Algorithm

**Purpose**: Validate M&A prediction feature end-to-end before production release
**Estimated Time**: 15-20 minutes
**Prerequisites**:
- oppSpot running locally or deployed
- Test account with authentication
- At least 10 test companies in database with 2+ years financial data

---

## Setup

### 1. Environment Configuration

Ensure these environment variables are set:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
CRON_SECRET=your_cron_secret

# Optional (for testing)
SKIP_AUTH_FOR_TESTS=true  # Only in test environment
```

### 2. Database Migration

Apply M&A prediction schema:

```bash
# Run migration
psql $DATABASE_URL -f supabase/migrations/20251030_ma_predictions.sql

# Verify tables created
psql $DATABASE_URL -c "\dt ma_*"
```

Expected output:
```
 ma_predictions
 ma_prediction_factors
 ma_valuation_estimates
 ma_acquirer_profiles
 ma_historical_deals
 ma_prediction_queue
 ma_prediction_audit_log
```

### 3. Seed Historical M&A Data

```bash
# Load seed dataset (100-200 curated UK/Ireland M&A deals)
psql $DATABASE_URL -f supabase/seeds/ma_historical_deals.sql
```

---

## Test Scenarios

### Scenario 1: View M&A Prediction on Company Profile

**User Story**: As a user viewing a company profile, I want to see its M&A likelihood prediction.

**Steps**:
1. Navigate to `/business/[company-id]` (use any company with 2+ years data)
2. Scroll to "M&A Target Prediction" section
3. Verify displayed elements:
   - ✅ Prediction score badge (0-100)
   - ✅ Likelihood category pill (Low/Medium/High/Very High)
   - ✅ Confidence level indicator
   - ✅ Last updated timestamp
   - ✅ "View Details" button

**Expected Result**: Prediction section loads within 5 seconds, displays score and category clearly.

**API Call**:
```bash
curl -X GET "http://localhost:3000/api/ma-predictions/{company-id}" \
  -H "Authorization: Bearer $SUPABASE_JWT"
```

**Expected Response** (200 OK):
```json
{
  "prediction": {
    "prediction_score": 68,
    "likelihood_category": "High",
    "confidence_level": "Medium",
    "data_last_refreshed": "2025-10-29T18:00:00Z"
  }
}
```

---

### Scenario 2: View Detailed Prediction Analysis

**User Story**: As a user, I want to understand WHY a company is predicted as an M&A target.

**Steps**:
1. From company profile, click "View M&A Analysis Details"
2. Verify expanded view shows:
   - ✅ Top 5 contributing factors with impact weights
   - ✅ Factor descriptions (human-readable)
   - ✅ Supporting data values
   - ✅ Valuation range (if Medium+ likelihood)
   - ✅ Potential acquirer profiles (if High+ likelihood)

**Expected Result**: Detailed analysis displays within 2 seconds, factors are clear and actionable.

**API Call**:
```bash
curl -X GET "http://localhost:3000/api/ma-predictions/{company-id}?include=all" \
  -H "Authorization: Bearer $SUPABASE_JWT"
```

**Expected Response** (200 OK with factors, valuation, acquirers).

---

### Scenario 3: Filter Companies by M&A Likelihood

**User Story**: As a user, I want to find all High/Very High M&A targets to prioritize outreach.

**Steps**:
1. Navigate to `/dashboard` or search page
2. Open filters panel
3. Select "M&A Target Likelihood" filter
4. Check "High" and "Very High" checkboxes
5. Apply filter
6. Verify:
   - ✅ Results show only High/Very High targets
   - ✅ Results sorted by prediction score (highest first)
   - ✅ Score badge displayed on each card
   - ✅ Pagination works (if >50 results)

**Expected Result**: Filtered list displays within 3 seconds, sorting is accurate.

**Database Query**:
```sql
SELECT b.id, b.name, p.prediction_score, p.likelihood_category
FROM businesses b
JOIN ma_predictions p ON b.id = p.company_id
WHERE p.is_active = TRUE
  AND p.likelihood_category IN ('High', 'Very High')
ORDER BY p.prediction_score DESC
LIMIT 50;
```

---

### Scenario 4: Export M&A Predictions (PDF)

**User Story**: As a user, I want to export a professional PDF report of M&A predictions for a client meeting.

**Steps**:
1. From company profile M&A section, click "Export Report"
2. Select "PDF" format
3. Click "Generate Report"
4. Wait for download (should complete in <5 seconds)
5. Open PDF and verify:
   - ✅ Company header with logo/name
   - ✅ Prediction score and category prominently displayed
   - ✅ Valuation range table
   - ✅ Contributing factors section
   - ✅ Potential acquirers table (if applicable)
   - ✅ Disclaimer text (FR-027 compliance)
   - ✅ oppSpot branding footer

**Expected Result**: PDF downloads successfully, professional formatting, includes all required sections.

**API Call**:
```bash
curl -X POST "http://localhost:3000/api/ma-predictions/export" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "company_ids": ["123e4567-e89b-12d3-a456-426614174000"]
  }' \
  --output ma-prediction-report.pdf
```

**Verify**: `file ma-prediction-report.pdf` shows PDF document.

---

### Scenario 5: Export Bulk Predictions (Excel)

**User Story**: As a user, I want to export a spreadsheet of 50+ M&A targets for analysis in Excel.

**Steps**:
1. Navigate to M&A Targets dashboard page
2. Select multiple companies (or use "Select All High Targets")
3. Click "Export Selected" → Choose "Excel"
4. Download .xlsx file (should complete in <3 seconds for 50 companies)
5. Open in Excel and verify:
   - ✅ Sheet 1: "Predictions" with columns: Company Name, Score, Category, Valuation Min/Max
   - ✅ Sheet 2: "Contributing Factors" (if included)
   - ✅ Sheet 3: "Acquirer Profiles" (if included)
   - ✅ Proper formatting (number formats, column widths)

**Expected Result**: Excel file opens without errors, data is clean and sortable.

**API Call**:
```bash
curl -X POST "http://localhost:3000/api/ma-predictions/export" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "company_ids": [...50 company IDs...],
    "filters": {
      "likelihood_categories": ["High", "Very High"]
    }
  }' \
  --output ma-targets.xlsx
```

---

### Scenario 6: Real-Time Recalculation Trigger

**User Story**: As a system, when company financial data is updated, predictions should automatically recalculate.

**Steps**:
1. Manually update a company's revenue in the database:
   ```sql
   UPDATE businesses
   SET revenue = revenue * 0.85  -- Simulate 15% decline
   WHERE id = 'test-company-uuid';
   ```
2. Verify trigger fires:
   ```sql
   SELECT * FROM ma_prediction_queue
   WHERE company_id = 'test-company-uuid'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - ✅ Row exists with `status = 'pending'`
   - ✅ `trigger_type = 'data_update'`
   - ✅ `trigger_metadata` contains `{"updated_fields": ["revenue"]}`
3. Wait 60 seconds (queue processor polling interval)
4. Check queue status updated to `'processing'` then `'completed'`
5. Verify new prediction created:
   ```sql
   SELECT prediction_score, updated_at
   FROM ma_predictions
   WHERE company_id = 'test-company-uuid'
   ORDER BY updated_at DESC
   LIMIT 2;
   ```
   - ✅ Latest prediction has newer `updated_at`
   - ✅ Prediction score changed (should be higher due to revenue decline)

**Expected Result**: Recalculation completes within 120 seconds of data update.

---

### Scenario 7: Nightly Batch Processing

**User Story**: As a system, all company predictions should be refreshed nightly.

**Steps** (Manual Testing):
1. Trigger batch processing manually:
   ```bash
   curl -X POST "http://localhost:3000/api/ma-predictions/batch" \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{
       "batch_size": 100,
       "force_recalculate": false
     }'
   ```
2. Capture `batch_id` from response
3. Poll status every 30 seconds:
   ```bash
   curl "http://localhost:3000/api/ma-predictions/batch/{batch-id}/status" \
     -H "Authorization: Bearer $SUPABASE_JWT"
   ```
4. Verify:
   - ✅ `status` progresses: `queued` → `processing` → `completed`
   - ✅ `progress_percentage` increases
   - ✅ `processed_count` matches `total_companies` when complete
   - ✅ `failed_count` is low (<5%)
5. Check database:
   ```sql
   SELECT COUNT(*), MAX(updated_at)
   FROM ma_predictions
   WHERE is_active = TRUE;
   ```
   - ✅ All predictions have recent `updated_at` timestamp

**Expected Result**: Batch completes in <10 minutes for 10,000 companies, >95% success rate.

---

### Scenario 8: Insufficient Data Handling

**User Story**: As a system, when a company lacks sufficient data, display a clear message instead of unreliable prediction.

**Steps**:
1. Create a test company with <2 years financial data:
   ```sql
   INSERT INTO businesses (id, name, company_number, incorporation_date)
   VALUES (gen_random_uuid(), 'Test New Company', 'TEST12345', CURRENT_DATE - INTERVAL '6 months');
   ```
2. Request prediction:
   ```bash
   curl "http://localhost:3000/api/ma-predictions/{new-company-id}" \
     -H "Authorization: Bearer $SUPABASE_JWT"
   ```
3. Verify response:
   - ✅ Status: 404 Not Found
   - ✅ Error message: "Insufficient data (require 2+ years financial history)"
   - ✅ Suggestion: "Trigger ResearchGPT™ to gather more data"
4. On UI, verify:
   - ✅ Prediction section shows "Insufficient Data" badge
   - ✅ Explanation text: "This company requires more financial history..."
   - ✅ "Run ResearchGPT™" button displayed

**Expected Result**: Clear, actionable messaging when data is insufficient.

---

### Scenario 9: Access Control (All Authenticated Users)

**User Story**: As any authenticated user, I should be able to view M&A predictions (FR-026).

**Steps**:
1. Create two test users:
   - User A: Free tier account
   - User B: Premium account
2. Authenticate as User A, request prediction:
   ```bash
   curl "http://localhost:3000/api/ma-predictions/{company-id}" \
     -H "Authorization: Bearer $USER_A_JWT"
   ```
   - ✅ Status: 200 OK (access granted)
3. Authenticate as User B, same request:
   - ✅ Status: 200 OK (access granted)
4. Attempt without authentication:
   ```bash
   curl "http://localhost:3000/api/ma-predictions/{company-id}"
   ```
   - ✅ Status: 401 Unauthorized

**Expected Result**: All authenticated users have equal access, unauthenticated requests blocked.

---

### Scenario 10: Audit Trail Logging

**User Story**: As a system admin, all M&A prediction requests should be logged for compliance (FR-028).

**Steps**:
1. View a prediction as authenticated user
2. Export a PDF report
3. Check audit log:
   ```sql
   SELECT action_type, created_at
   FROM ma_prediction_audit_log
   WHERE user_id = 'test-user-uuid'
     AND company_id = 'test-company-uuid'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
4. Verify log entries:
   - ✅ `action_type = 'view_prediction'` (from step 1)
   - ✅ `action_type = 'export_pdf'` (from step 2)
   - ✅ `created_at` timestamps are accurate
   - ✅ `request_ip` and `user_agent` captured
5. Attempt to modify audit log:
   ```sql
   UPDATE ma_prediction_audit_log
   SET action_type = 'modified'
   WHERE id = 'log-entry-uuid';
   ```
   - ✅ Query fails (RLS policy prevents updates)

**Expected Result**: All actions logged, audit trail is immutable.

---

## Performance Validation

### Load Testing (Optional)

Test concurrent prediction requests:

```bash
# Install k6 if not already installed
brew install k6  # macOS
# or: apt-get install k6  # Linux

# Run load test
k6 run tests/load/ma-predictions-load-test.js
```

**Expected Thresholds**:
- 95th percentile latency: <5 seconds (FR-029)
- Requests per second: >20
- Error rate: <1%

---

## Acceptance Criteria Checklist

Before marking feature as complete, verify:

- [ ] All 10 test scenarios pass
- [ ] Performance targets met (<5s p95 latency)
- [ ] PDF/Excel/CSV exports work correctly
- [ ] Real-time recalculation triggers work
- [ ] Nightly batch processing completes successfully
- [ ] Insufficient data handled gracefully
- [ ] Access control enforced correctly (all authenticated users)
- [ ] Audit trail logging works and is immutable
- [ ] Financial disclaimer displayed on all pages (FR-027)
- [ ] E2E Playwright tests pass (see tests/e2e/ma-prediction-*.spec.ts)
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Code reviewed and approved

---

## Troubleshooting

### Prediction Not Generating

**Issue**: API returns 500 error or prediction is stuck in queue.

**Checks**:
1. Verify OpenRouter API key is valid:
   ```bash
   curl -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     -d '{"model": "anthropic/claude-3.5-sonnet", "messages": [{"role": "user", "content": "Test"}]}'
   ```
2. Check database trigger is enabled:
   ```sql
   SELECT tgenabled FROM pg_trigger WHERE tgname = 'businesses_update_trigger';
   ```
   - Should return `true`
3. Check queue processor logs:
   ```bash
   # In Next.js dev logs, search for:
   grep "ma-prediction-queue" .next/server/app-paths-manifest.json
   ```

### Export Fails

**Issue**: Export times out or returns corrupt file.

**Checks**:
1. Verify Puppeteer installation:
   ```bash
   npm ls puppeteer
   ```
2. Check Supabase Storage permissions (for large exports)
3. Reduce company count (if >500, use async export)

### Batch Processing Slow

**Issue**: Nightly batch takes >15 minutes.

**Optimizations**:
1. Increase `batch_size` parameter (try 200)
2. Check OpenRouter API rate limits
3. Consider caching historical M&A patterns

---

**Next Steps**: Once quickstart validation passes, proceed to `/tasks` command to generate implementation task list.
