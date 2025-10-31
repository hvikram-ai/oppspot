# Quickstart: Financial & Revenue Quality Analytics Validation

**Feature**: Financial & Revenue Quality Analytics
**Version**: 1.0
**Purpose**: Step-by-step validation workflow to verify feature implementation
**Last Updated**: 2025-10-30

---

## Overview

This quickstart guide provides a validation workflow for the Financial & Revenue Quality Analytics feature. Follow these scenarios in order to verify all functional requirements are implemented correctly.

**Estimated Time**: 45-60 minutes for complete validation

---

## Prerequisites

### 1. Test Account Setup

**Option A: Demo Account (Recommended)**
- Visit `/login` page
- Click "Try Demo (No Registration)"
- Demo account includes pre-loaded sample financial data

**Option B: Fresh Test Account**
- Create new test account: `financial-test-{timestamp}@oppspot.com`
- Use test company with UUID saved for API testing
- Requires manual data upload (see sample CSV files below)

### 2. Sample CSV Data

Download or create sample CSV files for testing. Templates available at:
- `/templates/subscriptions.csv`
- `/templates/invoices.csv`
- `/templates/payments.csv`
- `/templates/cogs.csv`
- `/templates/sales_marketing.csv`

**Minimal Test Dataset** (for quick validation):
- 50 customers across 12 months
- 150 subscription records (active and churned)
- 150 invoices (open and paid)
- 100 payment records
- 12 COGS entries (monthly)
- 24 sales/marketing cost entries (bi-weekly)

### 3. Required Permissions

Ensure test account has:
- [ ] Organization membership (automatic for new accounts)
- [ ] Financial Editor role (for upload scenarios)
- [ ] Financial Admin role (for role management scenarios)

### 4. Browser Developer Tools

Open browser DevTools (F12) to:
- Monitor network requests
- Verify API response times
- Check console for errors

---

## Validation Scenarios

### Scenario 1: CSV Data Upload - Happy Path

**Validates**: FR-029 to FR-037 (Data Ingestion), FR-038 (Auto Recalculation)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/upload`
2. Download `subscriptions.csv` template
3. Fill with 50 customer subscriptions (single currency: USD)
4. Upload file via drag-and-drop or file picker
5. Select data type: "Subscriptions"
6. Click "Upload"

**Expected Outcomes**:
- ✅ Upload completes in <2 seconds
- ✅ Success message: "50 rows processed, 50 inserted, 0 updated, 0 skipped"
- ✅ "Periods affected: 2024-01-01 to 2024-12-01" displayed
- ✅ "Automatic recalculation triggered" indicator shown
- ✅ Progress bar or spinner for recalculation
- ✅ Page refreshes to show newly calculated metrics within 5 seconds

**Success Criteria**:
- All 50 rows imported without errors
- No validation warnings
- Automatic recalculation completes in <5 seconds
- New KPI snapshots visible in dashboard

**Troubleshooting**:
- If upload fails: Check company reporting_currency is set (defaults to USD)
- If recalculation hangs: Check browser console for API errors
- If metrics don't appear: Manually navigate to dashboard page

---

### Scenario 2: Currency Validation - Mixed Currency Rejection

**Validates**: FR-037, FR-037a (Single Currency Enforcement)

**Steps**:
1. Edit `subscriptions.csv` to include mixed currencies:
   - Rows 1-40: USD
   - Row 41: GBP (£299.00)
   - Rows 42-50: EUR (€250.00)
2. Upload modified CSV

**Expected Outcomes**:
- ❌ Upload rejected with 400 error
- ✅ Error message: "Mixed currencies detected. Company reporting currency is USD, but row 41 contains GBP. Please convert all data to USD before uploading."
- ✅ Error details list all invalid rows:
  - Row 41: GBP
  - Rows 42-50: EUR
- ✅ Zero rows imported (atomic validation)

**Success Criteria**:
- Upload completely rejected (no partial import)
- Clear, actionable error message displayed
- Error message references template for correct format

**Troubleshooting**:
- If upload succeeds: Currency validation not implemented - BLOCKING BUG
- If unclear error: Check API response body in DevTools Network tab

---

### Scenario 3: Financial Summary API - Read Performance

**Validates**: FR-001 to FR-008 (Core KPI Tracking), FR-053 (Load Time Target)

**Steps**:
1. Open DevTools Network tab
2. Navigate to `/companies/{companyId}/financials/summary`
3. API endpoint: `GET /api/companies/{companyId}/financials/summary?start_date=2024-01-01&end_date=2024-12-31`
4. Record response time from Network tab

**Expected Outcomes**:
- ✅ API response time: <300ms (precomputed snapshots)
- ✅ Response includes 12 monthly KPI snapshots
- ✅ Each snapshot contains: ARR, MRR, GRR, NRR, CAC, LTV, gross_margin, ARPU, churn_rate
- ✅ Page renders in <1 second (FR-053 target)
- ✅ Trend indicators (↑↓) shown for period-over-period changes
- ✅ Tooltips available for metric definitions

**Success Criteria**:
- API < 300ms (95th percentile target)
- Full page load < 1 second
- All metrics display correctly with proper formatting (currency, percentages)
- Null values handled gracefully (e.g., "Insufficient data for CAC" message)

**Troubleshooting**:
- If API > 1 second: Check if snapshots were precomputed (query kpi_snapshots table)
- If missing metrics: Check data completeness flags in metadata
- If page load slow: Profile with Lighthouse/DevTools Performance tab

---

### Scenario 4: Cohort Retention Analysis - Heatmap Rendering

**Validates**: FR-009 to FR-013 (Cohort & Retention Analysis)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/cohorts`
2. API endpoint: `GET /api/companies/{companyId}/financials/cohorts?start_cohort=2024-01-01&end_cohort=2024-12-01`
3. View cohort retention heatmap visualization

**Expected Outcomes**:
- ✅ Heatmap displays 12 cohorts (Jan-Dec 2024)
- ✅ Each cohort shows retention rates for subsequent months (triangular matrix)
- ✅ Color gradient: Green (high retention) to Red (low retention)
- ✅ Hover tooltip shows: Cohort month, Period, Retention %, Revenue retention %
- ✅ Logo retention and revenue retention toggleable
- ✅ API response < 600ms for 576-cell grid (24×24 max)

**Expected Retention Patterns** (for healthy SaaS):
- Month 0: 100% (by definition)
- Month 1: 95-98%
- Month 6: 85-92%
- Month 12: 75-85%

**Success Criteria**:
- Heatmap renders without layout issues
- Colors accurately reflect retention rates
- Both logo and revenue retention data available
- Drill-down shows customer counts and MRR amounts

**Troubleshooting**:
- If heatmap blank: Check cohort_metrics table has data
- If colors incorrect: Verify retention_rate values are percentages (0-100), not decimals (0-1)
- If slow rendering: Check chart library performance (recharts or similar)

---

### Scenario 5: Revenue Concentration Risk - Detection & Flagging

**Validates**: FR-014 to FR-017 (Revenue Quality & Concentration), FR-016 (25% Threshold)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/concentration?period_date=2024-12-31`
2. Review revenue concentration metrics
3. Check for risk flag if top customer >25%

**Test Data Variations**:

**Variation A: Low Concentration (Healthy)**
- Top customer: 8% of revenue
- Top 3: 20%
- Top 10: 50%

**Variation B: High Concentration (Risk Flag)**
- Top customer: 36% of revenue (triggers flag)
- Top 3: 70%
- Top 10: 95%

**Expected Outcomes**:
- ✅ Concentration metrics displayed: Top 1, 3, 5, 10 percentages
- ✅ HHI (Herfindahl-Hirschman Index) calculated and displayed
- ✅ Concentration level label: "Low" (<1500 HHI), "Moderate" (1500-2500), "High" (>2500)
- ✅ Risk flag visible when top customer >25%
- ✅ Warning banner: "Revenue concentration risk: Largest customer represents 36% of revenue. Industry best practice is <25%."
- ✅ Top 10 customers list with drill-down

**Success Criteria**:
- HHI calculation accurate (verify against manual calculation)
- Risk flag triggered at exactly 25% threshold
- Clear visual distinction between risk levels (color-coded)
- Drill-down shows customer names and MRR amounts

**Troubleshooting**:
- If HHI incorrect: Check formula implementation (Σ(customer_mrr / total_mrr)² × 10,000)
- If risk flag not showing: Verify top_1_customer_pct > 25 in database
- If no customer details: Check RLS permissions on customers table

---

### Scenario 6: AR Aging Analysis - Anomaly Detection

**Validates**: FR-018 to FR-022 (AR/AP Analysis), FR-021 (50% Spike Threshold)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/ar-ap-aging?snapshot_date=2024-12-31`
2. Review aging buckets and DSO
3. Upload historical data to create month-over-month comparison

**Test Data for Anomaly**:
- **November 2024**: 90+ days AR = $10,000
- **December 2024**: 90+ days AR = $18,000 (80% increase - triggers anomaly)

**Expected Outcomes**:
- ✅ Aging buckets displayed: 0-30, 31-60, 61-90, 90+ days
- ✅ Percentages of total AR shown for each bucket
- ✅ DSO (Days Sales Outstanding) calculated: (Total AR / Revenue Last 90 Days) × 90
- ✅ Anomaly detected and flagged: "90+ day receivables increased 80% from previous month"
- ✅ Severity indicator: "High" (>50% threshold from FR-021)
- ✅ Stacked bar chart shows aging trends over time
- ✅ DPO (Days Payables Outstanding) shown if AP data uploaded

**Healthy Benchmarks**:
- 0-30 days: >80% of AR
- 90+ days: <5% of AR
- DSO: 30-45 days for SaaS

**Success Criteria**:
- Anomaly detection triggers at 50% increase threshold
- Severity levels assigned correctly (Medium: 50-100%, High: >100%)
- DSO calculation accurate
- Trend chart shows deterioration visually

**Troubleshooting**:
- If no anomaly shown: Check anomalies table for records
- If DSO incorrect: Verify revenue data for last 90 days exists
- If chart not rendering: Check ar_ap_aging table has multiple months

---

### Scenario 7: Benchmark Comparison - Sector Matching

**Validates**: FR-023 to FR-028 (Peer Benchmarking), FR-024 (Sector from companies table), FR-025 (ARR-based size bands)

**Steps**:
1. Ensure company has `sector` field set (e.g., "Software/SaaS")
2. Verify ARR calculated from latest snapshot (determines size band)
3. Navigate to `/companies/{companyId}/financials/benchmarks`
4. API endpoint: `GET /api/companies/{companyId}/financials/benchmarks`

**Test Company Profile**:
- Sector: "Software/SaaS" (from companies.sector)
- ARR: $5,000,000 (from latest kpi_snapshot)
- Expected Size Band: "$1M-$10M"

**Expected Outcomes**:
- ✅ Sector displayed: "Software/SaaS"
- ✅ Size band displayed: "$1M-$10M" (calculated from ARR)
- ✅ Benchmark metrics shown: NRR, gross margin, CAC, LTV:CAC ratio, ARR growth
- ✅ Company metrics vs. sector median comparison table
- ✅ Horizontal bar charts with peer position indicators
- ✅ Percentile indicators: 25th, 50th (median), 75th
- ✅ Color-coded comparison: Green (above median), Yellow (at median), Red (below median)
- ✅ Message if no benchmark: "No benchmark data available for [sector] companies in [size band]"

**Example Benchmark Data**:
| Metric | Company | Sector Median (p50) | Status |
|--------|---------|---------------------|--------|
| NRR | 115% | 108% | Above ✓ |
| Gross Margin | 78% | 80% | Below ↓ |
| CAC | $4,500 | $5,200 | Above ✓ |
| LTV:CAC | 11:1 | 8:1 | Above ✓ |

**Success Criteria**:
- Sector matches companies.sector exactly (case-sensitive)
- Size band determined by ARR ranges (not employee count)
- Benchmarks retrieved from benchmarks_sector_medians table
- Graceful message if no benchmark exists (no error)

**Troubleshooting**:
- If no benchmarks: Check benchmarks_sector_medians table has data for sector/size combination
- If wrong size band: Verify ARR value in kpi_snapshots table
- If sector mismatch: Check companies.sector is populated and matches benchmark data

---

### Scenario 8: Manual Recalculation - Performance Validation

**Validates**: FR-038 to FR-041 (Recomputation & Data Refresh), FR-040 (5-second target)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/settings`
2. Click "Recalculate Metrics" button
3. Select date range: 2024-01-01 to 2024-12-31 (12 months)
4. Click "Start Recalculation"
5. Monitor progress indicator and DevTools Network tab

**Expected Outcomes**:
- ✅ Progress indicator shows: "Recalculating January 2024... February 2024..." etc.
- ✅ API endpoint: `POST /api/companies/{companyId}/financials/recompute`
- ✅ Total recalculation time: <5 seconds for 12 months (FR-040 target)
- ✅ Response breakdown shows:
  - `kpi_snapshots_updated: 12`
  - `cohorts_updated: 144` (12 cohorts × 12 periods triangular)
  - `concentration_updated: 12`
  - `aging_updated: 12`
  - `total_time_ms: <5000`
- ✅ Success message: "Recalculation complete. 12 periods updated in 3.8 seconds."
- ✅ Dashboard auto-refreshes with updated data
- ✅ "Last calculated" timestamp updated

**Performance Breakdown Example**:
```json
{
  "total_time_ms": 3847,
  "performance_breakdown": {
    "kpi_snapshots_ms": 1250,
    "cohorts_ms": 1800,
    "concentration_ms": 450,
    "aging_ms": 347
  }
}
```

**Success Criteria**:
- 12 months: <5 seconds (target)
- 24 months: <10 seconds (max range)
- No database timeout errors
- All snapshots updated atomically (transaction-safe)

**Troubleshooting**:
- If >5 seconds: Check database indexes on subscriptions, invoices tables
- If timeout: Verify connection pooling is enabled (Supabase default: 15 connections)
- If partial update: Check for database constraint violations in logs

---

### Scenario 9: PDF Export - Board Report Generation

**Validates**: FR-042 to FR-046 (Exports & Reporting)

**Steps**:
1. Navigate to `/companies/{companyId}/financials/summary`
2. Click "Export PDF Report" button
3. Select options:
   - Period: 2024-01-01 to 2024-12-31
   - Include benchmarks: Yes
   - Include cohorts: Yes
4. Click "Generate Report"
5. Download PDF when complete

**Expected Outcomes**:
- ✅ PDF generation completes in 5-10 seconds
- ✅ File downloaded with name: `{CompanyName}_Financial_Report_2024-12-31.pdf`
- ✅ PDF contains 9 pages (per contract structure):
  1. Cover page
  2. Executive summary
  3. KPI overview with charts
  4. Cohort retention heatmap
  5. Revenue concentration analysis
  6. AR/AP aging tables
  7. Benchmark comparison
  8. Anomalies & alerts
  9. Appendix
- ✅ Charts embedded as SVG (high quality, not screenshots)
- ✅ Professional formatting (consistent fonts, colors, branding)
- ✅ All currency amounts formatted with $ symbol and commas
- ✅ Page numbers in footer

**Quality Checks**:
- Open PDF in Adobe Acrobat/Preview
- Verify all charts render correctly
- Check text is selectable (not rasterized)
- Confirm no layout overflow or truncation
- Review executive summary for accuracy

**Success Criteria**:
- PDF suitable for board presentation without editing
- All sections present per contract specification
- Charts clear and professional
- No Lorem Ipsum or placeholder text

**Troubleshooting**:
- If PDF generation fails: Check @react-pdf/renderer library installed
- If charts missing: Verify chart rendering to SVG before PDF generation
- If slow generation: Profile PDF rendering with Node.js profiler

---

### Scenario 10: Permission-Based Access Control

**Validates**: FR-047 to FR-049b (Permissions & Access Control)

**Setup**:
Create 3 test users:
- User A: Organization member (no financial role)
- User B: Financial Editor role
- User C: Financial Admin role

**Test Matrix**:

| Action | User A (Viewer) | User B (Editor) | User C (Admin) |
|--------|----------------|-----------------|----------------|
| View metrics/reports | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| Export PDF/CSV | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| Upload CSV data | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed |
| Trigger recalculation | ❌ 403 Forbidden | ✅ Allowed | ✅ Allowed |
| Delete uploaded data | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed |
| Grant/revoke roles | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Allowed |

**Steps for Each User**:
1. Log in as user
2. Navigate to `/companies/{companyId}/financials/upload`
3. Attempt CSV upload
4. Check for permission error or success

**Expected Error Messages**:
- **User A tries upload**: "Financial Editor role required to upload data. Contact your organization admin."
- **User B tries delete**: "Financial Admin role required to delete data."

**Success Criteria**:
- RLS policies enforce organization-level data isolation
- Financial Editor can upload but not manage roles
- Financial Admin has all permissions
- Clear error messages for insufficient permissions

**Troubleshooting**:
- If wrong permissions: Check financial_roles table for user assignments
- If RLS bypass: Verify RLS enabled on all tables
- If unclear errors: Check API response includes error code and message

---

## Performance Validation Checklist

Verify these performance targets across all scenarios:

- [ ] **API Read (Precomputed Snapshots)**: <300ms (95th percentile)
- [ ] **Dashboard Page Load**: <1 second (FR-053)
- [ ] **Recalculation (12 months)**: <5 seconds (FR-040)
- [ ] **Recalculation (24 months)**: <10 seconds
- [ ] **Cohort Grid Retrieval**: <600ms for 576 cells
- [ ] **PDF Generation**: 5-10 seconds
- [ ] **CSV Upload + Validation**: <2 seconds for 150 rows

**Performance Testing Tool**:
```bash
# Use DevTools Network tab or Lighthouse for automated testing
npm run lighthouse -- --url=http://localhost:3000/companies/{id}/financials/summary
```

---

## Data Quality Validation

### Metric Accuracy Spot-Check

Manually verify calculations for one month:

**January 2024 Test Data**:
- Active subscriptions: 50 customers, $100,000 MRR
- New customers: 10
- Churned customers: 2
- Expansion MRR: +$5,000
- Contraction MRR: -$1,000
- COGS: $20,000
- Sales/Marketing: $50,000

**Expected Calculations**:
```
ARR = MRR × 12 = $100,000 × 12 = $1,200,000

GRR = (Starting MRR - Churn MRR) / Starting MRR × 100
    = ($100,000 - $4,000) / $100,000 × 100 = 96%

NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR × 100
    = ($100,000 + $5,000 - $1,000 - $4,000) / $100,000 × 100 = 100%

CAC = Sales & Marketing / New Customers = $50,000 / 10 = $5,000

Gross Margin = (Revenue - COGS) / Revenue × 100
             = ($100,000 - $20,000) / $100,000 × 100 = 80%

ARPU = MRR / Total Customers = $100,000 / 50 = $2,000

Churn Rate = Churned Customers / Starting Customers × 100
           = 2 / 50 × 100 = 4%
```

**Validation Steps**:
1. Query `kpi_snapshots` table for 2024-01-31
2. Compare calculated values to expected values above
3. Verify all match within rounding tolerance (±0.01%)

---

## Edge Cases & Error Handling

### Test Insufficient Data Scenarios

**Scenario A: No COGS Data**
- Upload subscriptions and invoices only (no COGS CSV)
- Expected: gross_margin field is NULL
- Expected: UI shows "Gross margin unavailable - COGS data not uploaded"

**Scenario B: Only 2 Months of History**
- Upload subscriptions for Jan-Feb 2024 only
- Expected: Cohort heatmap shows warning "Minimum 6 months recommended for cohort analysis"
- Expected: GRR/NRR calculations not possible (NULL values)

**Scenario C: Single Active Customer**
- Upload data with only 1 customer
- Expected: Revenue concentration shows 100% for top customer
- Expected: Risk flag triggered (>25% threshold)
- Expected: No cohort analysis (insufficient data)

---

## Troubleshooting Guide

### Common Issues & Resolutions

| Issue | Likely Cause | Resolution |
|-------|--------------|------------|
| **Upload fails with "Invalid CSV"** | Wrong column names | Download template and compare headers |
| **Metrics showing NULL** | Insufficient historical data | Upload at least 3 months of data |
| **Performance >5s** | Missing database indexes | Run migration to create indexes |
| **No benchmarks visible** | Sector mismatch or empty benchmarks table | Seed benchmarks_sector_medians table |
| **403 Forbidden errors** | Missing financial_roles assignment | Grant Financial Editor role to user |
| **Cohort heatmap blank** | cohort_metrics not calculated | Trigger manual recalculation |
| **PDF export fails** | @react-pdf/renderer not installed | Run `npm install @react-pdf/renderer` |

---

## Success Criteria Summary

### Feature is considered validated when:

1. ✅ **Data Ingestion**: CSV uploads succeed with currency validation
2. ✅ **Performance**: <5s recalculation, <300ms API reads, <1s page loads
3. ✅ **Calculations**: KPIs match manual calculations (±0.01%)
4. ✅ **Visualizations**: Cohort heatmap, charts render correctly
5. ✅ **Risk Detection**: Concentration >25% and AR spikes >50% flagged
6. ✅ **Benchmarks**: Sector/size-based comparison displays accurately
7. ✅ **Permissions**: RLS enforces org isolation, roles work correctly
8. ✅ **Exports**: PDF report generates with all 9 sections
9. ✅ **Error Handling**: Validation errors clear and actionable
10. ✅ **Edge Cases**: Insufficient data handled gracefully

---

## Validation Completion Report

After completing all scenarios, fill out:

**Date Validated**: ___________
**Validated By**: ___________
**Environment**: [ ] Local [ ] Staging [ ] Production

**Scenario Results**:
- [ ] Scenario 1: CSV Upload (Pass/Fail)
- [ ] Scenario 2: Currency Validation (Pass/Fail)
- [ ] Scenario 3: Financial Summary API (Pass/Fail)
- [ ] Scenario 4: Cohort Analysis (Pass/Fail)
- [ ] Scenario 5: Revenue Concentration (Pass/Fail)
- [ ] Scenario 6: AR Aging Anomaly (Pass/Fail)
- [ ] Scenario 7: Benchmark Comparison (Pass/Fail)
- [ ] Scenario 8: Manual Recalculation (Pass/Fail)
- [ ] Scenario 9: PDF Export (Pass/Fail)
- [ ] Scenario 10: Permissions (Pass/Fail)

**Performance Metrics**:
- Dashboard load time: _______ ms (target: <1000ms)
- API read time: _______ ms (target: <300ms)
- 12-month recalculation: _______ ms (target: <5000ms)

**Blocking Issues Found**: ___________
**Non-Blocking Issues Found**: ___________

**Overall Status**: [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

---

## Next Steps

**If All Scenarios Pass**:
1. Tag release: `v1.0.0-financial-analytics`
2. Deploy to staging for user acceptance testing (UAT)
3. Prepare user documentation and training materials
4. Schedule production rollout

**If Critical Issues Found**:
1. Document bugs in GitHub Issues with screenshots
2. Prioritize P0/P1 issues for immediate fix
3. Re-run failed scenarios after fixes
4. Hold production deployment until validation passes

**Post-Launch Monitoring**:
- Set up alerts for API latency >1s
- Monitor recalculation times (target: P95 <5s)
- Track user feedback on accuracy and usability
- Review anomaly detection false positive rate

---

**End of Quickstart Validation Workflow**
