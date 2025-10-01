# Quickstart: ResearchGPT™

**Feature**: ResearchGPT™ - Deep Company Intelligence
**Date**: 2025-10-01
**Purpose**: Step-by-step validation and testing guide

---

## Prerequisites

1. **Database Migration Applied**:
   ```bash
   supabase db push
   # Verify tables exist
   supabase db list-tables | grep research
   ```

2. **Environment Variables**:
   ```bash
   # Required
   NEXT_PUBLIC_SUPABASE_URL=https://fuqdbewftdthbjfcecrz.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<secret>
   OPENROUTER_API_KEY=<secret>
   NEWS_API_KEY=<secret>

   # Verify
   env | grep -E '(SUPABASE|OPENROUTER|NEWS)'
   ```

3. **Test Company**:
   - Company: Monzo Bank
   - Companies House Number: 09446231
   - Expected: Rich data (founded 2014, fintech, well-documented)

---

## Quick Start (5 minutes)

### Step 1: Navigate to Business Profile

1. Start dev server:
   ```bash
   cd /home/vik/oppspot
   npm run dev
   ```

2. Open browser: `http://localhost:3000`

3. Login with demo credentials:
   ```
   Email: demo@oppspot.com
   Password: Demo123456!
   ```

4. Search for "Monzo Bank" or navigate to:
   ```
   http://localhost:3000/business/[monzo-business-id]
   ```

**Expected**: Business profile page loads with company information

---

### Step 2: Initiate Research

1. Click **"Research with AI"** button in sidebar

2. **Expected**:
   - Modal/dialog opens
   - Shows quota remaining: "87 researches remaining this month"
   - "Generate Research" button enabled

3. Click **"Generate Research"**

4. **Expected**:
   - Button shows loading state
   - Progress bar appears
   - Real-time updates: "Fetching Companies House data..."

**Validation**:
- HTTP POST to `/api/research/[companyId]`
- Response 202 with `report_id`
- Database: New row in `research_reports` with status='generating'

---

### Step 3: Watch Real-Time Progress (30 seconds)

**Expected Progress Sequence**:
```
[0-5s]   "Fetching Companies House data..." (20%)
[5-10s]  "Gathering news and press releases..." (40%)
[10-15s] "Detecting buying signals..." (60%)
[15-20s] "Identifying decision makers..." (75%)
[20-25s] "Analyzing revenue signals..." (85%)
[25-30s] "Generating recommendations..." (95%)
[30s]    "Research complete!" (100%)
```

**Validation**:
- Progress bar increments
- No frontend errors in console
- Status polling: GET `/api/research/[companyId]/status` every 2s

---

### Step 4: View Research Report

**Expected Sections** (all visible):

#### 1. Company Snapshot ✅
- Founded: 2014
- Type: Private limited company
- Status: Active
- Employees: ~2,500 with YoY growth
- Tech Stack: AWS, React, Python
- Funding: Series H, £450M+ total

#### 2. Buying Signals ✅
- At least 3 signals detected
- HIGH priority: Hiring signals (50+ job postings)
- MEDIUM priority: Expansion (new office locations)
- Signal age: Within last 30 days

#### 3. Key Decision Makers ✅
- 3-5 people listed
- At least 1 C-level executive
- LinkedIn URLs present
- Background summaries provided
- Contact source: "Company website"

#### 4. Revenue Signals ✅
- Customer growth metrics
- Market position: "Leading UK digital bank"
- Funding announcements
- At least 2 signals with HIGH confidence

#### 5. Recommended Approach ✅
- Recommended contact identified
- Approach summary (2-3 paragraphs)
- 3-5 key talking points
- Timing: "Immediate" or "Within week"
- 2-3 conversation starters

#### 6. Sources ✅
- At least 10 sources cited
- Source types: Companies House, press releases, news
- URLs clickable
- Published dates visible
- Reliability scores shown

**Validation**:
- HTTP GET `/api/research/[companyId]` returns 200
- `status: 'complete'`
- `sections_complete: 6`
- `confidence_score >= 0.7`

---

### Step 5: Test Smart Caching

1. Navigate back to business profile
2. Click **"Research with AI"** again

**Expected**:
- Message: "Cached research available (generated 2 minutes ago)"
- Option: "View cached report" or "Force refresh"

3. Click **"View cached report"**

**Expected**:
- Report loads instantly (<1 second)
- Banner: "Data as of 2 minutes ago"
- All 6 sections display

**Validation**:
- HTTP GET returns cached data
- No OpenRouter API calls made
- `research_reports.cached_until` not expired

---

### Step 6: Test Force Refresh

1. In cached report, click **"Force Refresh"** button

**Expected**:
- Confirmation dialog: "This will consume 1 research credit"
- If confirmed: New research generation starts
- Progress bar appears again

**Validation**:
- HTTP POST with `?force_refresh=true`
- New `report_id` created
- `user_research_quotas.researches_used` increments

---

### Step 7: Test Quota Limiting

1. Check current quota: Click profile → "Research Quota"

**Expected Display**:
```
Research Quota
━━━━━━━━━━━━━━━━━━━━━━━━━━
Used: 87 / 100
Remaining: 13
Period: Oct 1 - Oct 31, 2025
```

2. Manually set quota to limit (testing):
   ```sql
   UPDATE user_research_quotas
   SET researches_used = 100
   WHERE user_id = '<demo-user-id>';
   ```

3. Try to generate research

**Expected**:
- Error message: "Monthly research quota exceeded"
- Shows: "100 / 100 researches used"
- Button: "Upgrade Plan" (links to pricing)
- Research button disabled

**Validation**:
- HTTP POST returns 403
- Error response includes quota details
- No new research_report created

---

### Step 8: Test Export & Share

1. In completed research report, click **"Export PDF"**

**Expected**:
- PDF downloads: `Monzo_Bank_Research_2025-10-01.pdf`
- PDF contains all 6 sections with formatting
- Sources included as footer/appendix

2. Click **"Share with Team"**

**Expected**:
- Modal: "Share Research Report"
- Email input for team members
- Permission options: "View only"

3. Click **"Save to CRM"**

**Expected**:
- If integrated: Sync to CRM (future feature)
- If not: Copy to clipboard or download

---

## Integration Tests (Playwright)

**File**: `tests/e2e/research-gpt.spec.ts`

### Test 1: Happy Path - Generate Research

```typescript
test('should generate research report for valid company', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'demo@oppspot.com');
  await page.fill('[name="password"]', 'Demo123456!');
  await page.click('button[type="submit"]');

  // Navigate to business profile
  await page.goto('/business/mock-monzo');

  // Click Research button
  await page.click('button:has-text("Research with AI")');

  // Verify quota displayed
  await expect(page.locator('text=researches remaining')).toBeVisible();

  // Start research
  await page.click('button:has-text("Generate Research")');

  // Wait for progress
  await expect(page.locator('[role="progressbar"]')).toBeVisible();

  // Wait for completion (max 35 seconds)
  await expect(page.locator('text=Research complete')).toBeVisible({ timeout: 35000 });

  // Verify all 6 sections present
  await expect(page.locator('h2:has-text("Company Snapshot")')).toBeVisible();
  await expect(page.locator('h2:has-text("Buying Signals")')).toBeVisible();
  await expect(page.locator('h2:has-text("Decision Makers")')).toBeVisible();
  await expect(page.locator('h2:has-text("Revenue Signals")')).toBeVisible();
  await expect(page.locator('h2:has-text("Recommended Approach")')).toBeVisible();
  await expect(page.locator('h2:has-text("Sources")')).toBeVisible();

  // Verify confidence score
  const confidence = await page.locator('[data-testid="confidence-score"]').textContent();
  expect(parseFloat(confidence!)).toBeGreaterThan(0.5);
});
```

### Test 2: Cached Report

```typescript
test('should display cached report instantly', async ({ page }) => {
  // Assume report already generated in previous test
  await page.goto('/business/mock-monzo');
  await page.click('button:has-text("Research with AI")');

  // Should show cached option
  await expect(page.locator('text=Cached research available')).toBeVisible();

  await page.click('button:has-text("View cached report")');

  // Should load instantly
  await expect(page.locator('h2:has-text("Company Snapshot")')).toBeVisible({ timeout: 2000 });

  // Verify cache age displayed
  await expect(page.locator('text=Data as of')).toBeVisible();
});
```

### Test 3: Force Refresh

```typescript
test('should allow force refresh of cached report', async ({ page }) => {
  await page.goto('/business/mock-monzo');
  await page.click('button:has-text("Research with AI")');
  await page.click('button:has-text("View cached report")');

  // Click force refresh
  await page.click('button:has-text("Force Refresh")');

  // Confirm dialog
  await page.click('button:has-text("Confirm")');

  // Should see progress again
  await expect(page.locator('[role="progressbar"]')).toBeVisible();
  await expect(page.locator('text=Research complete')).toBeVisible({ timeout: 35000 });
});
```

### Test 4: Quota Exceeded

```typescript
test('should block research when quota exceeded', async ({ page, request }) => {
  // Set quota to limit via API
  await request.post('/api/test/set-quota', {
    data: { user_id: 'demo-user-id', researches_used: 100 }
  });

  await page.goto('/business/mock-monzo');
  await page.click('button:has-text("Research with AI")');

  // Should show error
  await expect(page.locator('text=quota exceeded')).toBeVisible();
  await expect(page.locator('button:has-text("Generate Research")')).toBeDisabled();

  // Verify upgrade prompt
  await expect(page.locator('a:has-text("Upgrade Plan")')).toBeVisible();
});
```

### Test 5: Invalid Company

```typescript
test('should handle invalid company gracefully', async ({ page }) => {
  await page.goto('/business/invalid-company-id');

  // Should show 404 or error
  await expect(page.locator('text=not found')).toBeVisible();
});
```

### Test 6: Export PDF

```typescript
test('should export research report as PDF', async ({ page }) => {
  await page.goto('/business/mock-monzo');
  await page.click('button:has-text("Research with AI")');
  await page.click('button:has-text("View cached report")');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export PDF")')
  ]);

  expect(download.suggestedFilename()).toMatch(/Monzo.*\.pdf/);
});
```

---

## Manual Testing Checklist

### Functionality Tests
- [ ] Can generate research for known company
- [ ] Research completes in <30 seconds
- [ ] All 6 sections display correctly
- [ ] Cached report loads instantly
- [ ] Force refresh works
- [ ] Quota tracking accurate
- [ ] Quota exceeded blocks new research
- [ ] Export PDF works
- [ ] Sources are clickable
- [ ] Confidence scores displayed

### Performance Tests
- [ ] 95% of requests complete in <30s
- [ ] Page load time <2s
- [ ] No memory leaks during generation
- [ ] 5 concurrent requests don't crash server

### GDPR Tests
- [ ] No personal emails displayed (only business)
- [ ] Contact source attribution present
- [ ] Removal request form accessible
- [ ] 6-month anonymization scheduled

### Error Handling Tests
- [ ] Invalid company ID → clear error
- [ ] Companies House API down → graceful degradation
- [ ] News API rate limit → skip section, continue
- [ ] OpenRouter timeout → retry, then fallback

### UI/UX Tests
- [ ] Progress updates are smooth
- [ ] Sections are collapsible
- [ ] Mobile responsive
- [ ] Loading states clear
- [ ] Error messages helpful

---

## Performance Validation

### Target Metrics (from NFR-001 to NFR-003)

```bash
# Run performance test
npm run test:e2e:perf

# Expected results:
# - p50: <20 seconds
# - p95: <30 seconds  ✅ (NFR-001)
# - p99: <35 seconds
# - Success rate: >95%
```

### Database Query Performance

```sql
-- Should use index, <10ms
EXPLAIN ANALYZE
SELECT * FROM research_reports
WHERE user_id = '<uuid>'
ORDER BY generated_at DESC
LIMIT 20;

-- Should use index, <5ms
EXPLAIN ANALYZE
SELECT * FROM research_sections
WHERE report_id = '<uuid>';
```

---

## Common Issues & Troubleshooting

### Issue: "Research taking >30 seconds"

**Debug Steps**:
1. Check OpenRouter API latency: `curl -w "%{time_total}" https://openrouter.ai/api/v1/health`
2. Check Companies House API: `curl https://api.company-information.service.gov.uk/`
3. Review logs: `tail -f logs/research-gpt.log | grep "generation_time"`

**Fix**:
- Increase concurrent data source fetching
- Review API timeout settings
- Check database query performance

### Issue: "Quota not incrementing"

**Debug Steps**:
1. Check database trigger: `SELECT * FROM user_research_quotas WHERE user_id = '<id>';`
2. Verify API route increments quota: Add logging

**Fix**:
- Ensure quota check happens before research starts
- Add transaction to prevent race conditions

### Issue: "GDPR concerns"

**Validation**:
1. All contact info has `contact_source` field
2. No LinkedIn scraping (only public profile URLs)
3. Removal mechanism tested
4. 6-month anonymization cron job running

---

## Success Criteria Validation

| Metric | Target | Validation Method |
|--------|---------|-------------------|
| Research time | <30s (95%) | Playwright perf tests |
| Data accuracy | 90%+ | Manual fact-checking (sample 20 reports) |
| Error rate | <5% | Monitor failed/partial reports ratio |
| Quota compliance | 100/month enforced | Attempt 101st research → blocked |
| Cache hit rate | >60% | Query `metadata.cache_hit` ratio |
| User satisfaction | NPS 8+ | Post-research survey (post-launch) |

---

## Next Steps After Quickstart

1. **Review Research Quality**: Manually verify 5-10 research reports for accuracy
2. **Performance Tuning**: If >30s, optimize parallel fetching
3. **GDPR Legal Review**: Have legal team verify compliance
4. **Beta Test**: 10 real users for 1 week
5. **Monitor Costs**: Track OpenRouter + News API spend
6. **Launch**: Enable for all £99/month tier users

---

**Quickstart Status**: ✅ COMPLETE - Ready for implementation and testing
