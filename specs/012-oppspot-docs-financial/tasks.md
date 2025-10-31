# Tasks: Financial & Revenue Quality Analytics

**Feature**: Financial & Revenue Quality Analytics (012-oppspot-docs-financial)
**Input**: Design documents from `/home/vik/oppspot/specs/012-oppspot-docs-financial/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Next.js 15, TypeScript, Supabase, React 19
   → Structure: Web application (App Router + API routes)
2. Load optional design documents ✓:
   → data-model.md: 13 entities identified
   → contracts/: 7 API contracts defined
   → research.md: 7 technical decisions documented
3. Generate tasks by category:
   → Setup: migration, dependencies, types
   → Tests: 7 contract tests, 4 E2E tests
   → Core: calculators, ingestion, validation
   → API: 7 route implementations
   → UI: 9 components, 2 pages
   → Integration: roles, PDF export
   → Polish: templates, benchmarks, performance
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T046)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All 7 contracts have tests ✓
   → All 13 entities in migration ✓
   → All 7 endpoints implemented ✓
9. Return: SUCCESS (46 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All paths relative to repository root `/home/vik/oppspot/`

---

## Phase A: Foundation & Database Schema

### A.1 Database Migration

- [x] **T001** Create Supabase migration `supabase/migrations/20251030_financial_analytics.sql` with:
  - 13 tables: companies extension (reporting_currency), customers, subscriptions, invoices, payments, cogs_entries, sales_marketing_costs, kpi_snapshots, cohort_metrics, revenue_concentration, ar_ap_aging, anomalies, benchmarks_sector_medians, financial_roles
  - 23 indexes for performance (company_id, period_date, customer_id, date ranges)
  - 15 RLS policies (org-level read, role-based write)
  - NUMERIC types for all currency amounts
  - Idempotency constraints (external_ref unique per company, checksum unique)
  - CHECK constraints (currency = 3 chars, dates valid, amounts positive)
  - File: `supabase/migrations/20251030_financial_analytics.sql`

### A.2 TypeScript Type Definitions

- [x] **T002** [P] Create financial types in `lib/financials/types.ts` with:
  - Entity types for all 13 tables (Customer, Subscription, Invoice, Payment, COGSEntry, SalesMarketingCost, KPISnapshot, CohortMetric, RevenueConcentration, ARAPAging, Anomaly, SectorBenchmark, FinancialRole)
  - API request/response types for 7 endpoints
  - CSV row types for 5 upload formats (SubscriptionRow, InvoiceRow, PaymentRow, COGSRow, SalesMarketingRow)
  - Enum types (Currency, InvoiceStatus, PaymentMethod, AnomalySeverity, FinancialRole, SizeBand)
  - Validation schema types (Zod inferred types)
  - File: `lib/financials/types.ts`

---

## Phase B: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE PHASE C

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T003** [P] Contract test for POST /api/companies/[id]/financials/upload in `tests/contract/financials-upload.contract.test.ts`:
  - Test multipart/form-data CSV upload (subscriptions, invoices, payments, cogs, sales_marketing)
  - Validate 201 response with upload_id and affected_months
  - Test 400 error for mixed currencies
  - Test 400 error for invalid CSV format
  - Test 403 error for missing Financial Editor role
  - Assert auto-recalculation triggered
  - File: `tests/contract/financials-upload.contract.test.ts`

- [ ] **T004** [P] Contract test for GET /api/companies/[id]/financials/summary in `tests/contract/financials-summary.contract.test.ts`:
  - Test query params (start_date, end_date, window)
  - Validate 200 response with KPI metrics (arr, mrr, nrr, grr, cac, ltv, gross_margin, arpu, churn_rate, expansion_rate, contraction_rate)
  - Assert trend data (previous_period comparison)
  - Test 404 error for non-existent company
  - Test <300ms response time (cached snapshots)
  - File: `tests/contract/financials-summary.contract.test.ts`

- [ ] **T005** [P] Contract test for GET /api/companies/[id]/financials/cohorts in `tests/contract/financials-cohorts.contract.test.ts`:
  - Test query param (window=24m)
  - Validate 200 response with nested cohort structure
  - Assert logo_retention and revenue_retention arrays
  - Test max 24x24 grid limit
  - Test <600ms response time
  - File: `tests/contract/financials-cohorts.contract.test.ts`

- [ ] **T006** [P] Contract test for GET /api/companies/[id]/financials/concentration in `tests/contract/financials-concentration.contract.test.ts`:
  - Test query param (period=YYYY-MM-DD)
  - Validate 200 response with HHI, top1/3/5/10_pct, risk_flag
  - Assert top_customers array (max 10)
  - Test 25% threshold risk flagging
  - File: `tests/contract/financials-concentration.contract.test.ts`

- [ ] **T007** [P] Contract test for GET /api/companies/[id]/financials/ar-ap-aging in `tests/contract/financials-ar-ap.contract.test.ts`:
  - Test query param (date=YYYY-MM-DD)
  - Validate 200 response with aging buckets (0-30, 31-60, 61-90, 90+)
  - Assert DSO and DPO calculations
  - Test anomaly detection (50% spike in 90+ days)
  - File: `tests/contract/financials-ar-ap.contract.test.ts`

- [ ] **T008** [P] Contract test for POST /api/companies/[id]/financials/recompute in `tests/contract/financials-recompute.contract.test.ts`:
  - Test request body (start_month, end_month, force flag)
  - Validate 200 response with recalculated_periods and performance metrics
  - Test <5s for 24 months (FR-040 requirement)
  - Test 403 error for missing Financial Editor role
  - Test 400 error for invalid date range
  - File: `tests/contract/financials-recompute.contract.test.ts`

- [ ] **T009** [P] Contract test for GET /api/companies/[id]/financials/export/pdf in `tests/contract/financials-export.contract.test.ts`:
  - Test query params (start_date, end_date)
  - Validate 200 response with application/pdf content-type
  - Assert PDF filename format (CompanyName_Financial_Report_YYYY-MM-DD.pdf)
  - Test PDF contains required sections (summary, KPIs, cohorts, concentration, aging, benchmarks)
  - File: `tests/contract/financials-export.contract.test.ts`

---

## Phase C: Calculator Unit Tests (TDD) ⚠️ MUST COMPLETE BEFORE PHASE D

- [ ] **T010** [P] Unit tests for KPI calculator in `tests/unit/financials/kpi-calculator.test.ts`:
  - Test MRR calculation (sum of active subscriptions)
  - Test ARR calculation (12 × MRR)
  - Test GRR calculation (retention without expansion)
  - Test NRR calculation (retention with expansion/contraction)
  - Test CAC calculation (S&M costs / new customers)
  - Test LTV calculation (ARPU × GM / churn rate)
  - Test gross margin calculation (revenue - COGS) / revenue
  - Test ARPU calculation (MRR / active customers)
  - Test edge cases (no data, zero division)
  - File: `tests/unit/financials/kpi-calculator.test.ts`

- [ ] **T011** [P] Unit tests for cohort calculator in `tests/unit/financials/cohort-calculator.test.ts`:
  - Test cohort assignment (first subscription start month)
  - Test logo retention rate (retained customers / cohort size)
  - Test revenue retention rate (retained MRR / cohort MRR)
  - Test churn calculation (churned / cohort size)
  - Test reactivation handling (winback scenarios)
  - File: `tests/unit/financials/cohort-calculator.test.ts`

- [ ] **T012** [P] Unit tests for concentration calculator in `tests/unit/financials/concentration-calculator.test.ts`:
  - Test HHI calculation (sum of squared market shares)
  - Test top-N percentage calculation (1, 3, 5, 10 customers)
  - Test 25% threshold risk detection
  - Test edge cases (single customer, equal distribution)
  - File: `tests/unit/financials/concentration-calculator.test.ts`

- [ ] **T013** [P] Unit tests for AR/AP calculator in `tests/unit/financials/ar-ap-calculator.test.ts`:
  - Test aging bucket categorization (0-30, 31-60, 61-90, 90+ days)
  - Test DSO calculation (average AR / daily revenue)
  - Test DPO calculation (average AP / daily costs)
  - Test 50% spike anomaly detection
  - File: `tests/unit/financials/ar-ap-calculator.test.ts`

---

## Phase D: CSV Ingestion & Validation (Make T003 Pass)

- [ ] **T014** Implement CSV parser and validator in `lib/financials/ingestion/csv-parser.ts` and `lib/financials/ingestion/validator.ts`:
  - Parse CSV using papaparse with header detection
  - Define Zod schemas for 5 CSV types (subscriptions, invoices, payments, cogs, sales_marketing)
  - Validate required fields (customer_id, dates, amounts, currency)
  - Enforce single currency per company (check against companies.reporting_currency)
  - Validate date formats (ISO 8601 YYYY-MM-DD)
  - Validate positive amounts (except negative COGS allowed)
  - Generate SHA-256 checksums for idempotency
  - Return structured validation errors with row numbers
  - Files: `lib/financials/ingestion/csv-parser.ts`, `lib/financials/ingestion/validator.ts`

- [ ] **T015** Implement database upserter in `lib/financials/ingestion/upserter.ts`:
  - Batch insert customers (upsert by company_id + external_ref)
  - Batch insert subscriptions (upsert by company_id + external_ref)
  - Batch insert invoices (upsert by company_id + external_ref)
  - Batch insert payments (upsert by company_id + invoice_id)
  - Batch insert cogs_entries (upsert by company_id + occurred_at + checksum)
  - Batch insert sales_marketing_costs (upsert by company_id + occurred_at + checksum)
  - Use Supabase .upsert() with onConflict for idempotency
  - Return affected_months date range
  - File: `lib/financials/ingestion/upserter.ts`

---

## Phase E: Calculator Implementations (Make T010-T013 Pass)

- [ ] **T016** Implement KPI calculator in `lib/financials/calculators/kpi-calculator.ts`:
  - calculateMRR(companyId, periodDate): sum active subscriptions
  - calculateARR(mrr): multiply by 12
  - calculateGRR(companyId, periodDate): retention without expansion
  - calculateNRR(companyId, periodDate): retention with expansion/contraction
  - calculateCAC(companyId, periodDate): S&M costs / new customers
  - calculateLTV(arpu, grossMargin, churnRate): ARPU × GM / churn
  - calculateGrossMargin(companyId, periodDate): (revenue - COGS) / revenue
  - calculateARPU(mrr, activeCustomers): MRR / customers
  - Use Postgres aggregate functions (SUM, COUNT, AVG)
  - Handle edge cases (zero division → null)
  - File: `lib/financials/calculators/kpi-calculator.ts`

- [ ] **T017** Implement cohort calculator in `lib/financials/calculators/cohort-calculator.ts`:
  - assignCohort(customerId): get first subscription start_date month
  - calculateRetention(companyId, cohortMonth, periodMonth): logo and revenue retention
  - calculateChurnRate(companyId, cohortMonth, periodMonth): churned / cohort size
  - Build 24x24 matrix for heatmap visualization
  - Return nested structure: cohorts[cohortMonth][periodMonth] = { logo_retention, revenue_retention }
  - File: `lib/financials/calculators/cohort-calculator.ts`

- [ ] **T018** Implement concentration calculator in `lib/financials/calculators/concentration-calculator.ts`:
  - calculateHHI(companyId, periodDate): sum((customer_revenue / total_revenue)^2)
  - calculateTopN(companyId, periodDate, n): top 1/3/5/10 customer percentages
  - detectRisk(top1Pct): flag if >25% (FR-016 threshold)
  - Return top 10 customers with revenue details for drill-down
  - File: `lib/financials/calculators/concentration-calculator.ts`

- [ ] **T019** Implement AR/AP calculator in `lib/financials/calculators/ar-ap-calculator.ts`:
  - categorizeAging(invoices): group by 0-30, 31-60, 61-90, 90+ day buckets
  - calculateDSO(companyId, periodDate): (average AR / daily revenue) × days
  - calculateDPO(companyId, periodDate): (average AP / daily costs) × days
  - detectAnomalies(current, previous): flag if 90+ days AR increased >50%
  - File: `lib/financials/calculators/ar-ap-calculator.ts`

---

## Phase F: API Route Implementations (Make T004-T009 Pass)

- [ ] **T020** Implement POST /api/companies/[id]/financials/upload/route.ts:
  - Parse multipart/form-data (5 CSV file types)
  - Check Financial Editor role via hasFinancialRole() helper
  - Call csv-parser and validator for each file
  - Return 400 with validation errors if mixed currencies or invalid format
  - Call upserter to insert data (idempotent)
  - Trigger recalculation for affected_months
  - Return 201 with upload_id and affected_months
  - File: `app/api/companies/[id]/financials/upload/route.ts`

- [ ] **T021** Implement GET /api/companies/[id]/financials/summary/route.ts:
  - Parse query params (start_date, end_date, window)
  - Fetch kpi_snapshots for date range
  - Calculate trends (period-over-period change percentages)
  - Return 200 with KPI metrics array + meta (last_calculated_at)
  - Return 404 if company not found
  - File: `app/api/companies/[id]/financials/summary/route.ts`

- [ ] **T022** Implement GET /api/companies/[id]/financials/cohorts/route.ts:
  - Parse query param (window=12m or 24m)
  - Fetch cohort_metrics for date range
  - Build nested structure: cohorts[cohortMonth][periodMonth]
  - Return 200 with cohort grid
  - File: `app/api/companies/[id]/financials/cohorts/route.ts`

- [ ] **T023** Implement GET /api/companies/[id]/financials/concentration/route.ts:
  - Parse query param (period=YYYY-MM-DD)
  - Fetch revenue_concentration for period
  - Call calculateTopN() for drill-down customers
  - Return 200 with HHI, top-N percentages, risk_flag, top_customers array
  - File: `app/api/companies/[id]/financials/concentration/route.ts`

- [ ] **T024** Implement GET /api/companies/[id]/financials/ar-ap-aging/route.ts:
  - Parse query param (date=YYYY-MM-DD)
  - Fetch ar_ap_aging for date
  - Fetch previous period for anomaly detection
  - Return 200 with aging buckets, DSO, DPO, anomalies
  - File: `app/api/companies/[id]/financials/ar-ap-aging/route.ts`

- [ ] **T025** Implement POST /api/companies/[id]/financials/recompute/route.ts:
  - Parse request body (start_month, end_month, force flag)
  - Check Financial Editor role
  - Validate date range (max 24 months, no future dates)
  - Call calculators for each month in range
  - Upsert kpi_snapshots, cohort_metrics, revenue_concentration, ar_ap_aging
  - Track performance (start time, end time, breakdowns)
  - Return 200 with recalculated_periods and performance metrics
  - Assert <5s for 24 months (log warning if exceeded)
  - File: `app/api/companies/[id]/financials/recompute/route.ts`

---

## Phase G: UI Components (Can Run Parallel to Phase F)

- [ ] **T026** [P] Create KPI overview component in `components/financials/kpi-overview.tsx`:
  - Display 8 metric cards (ARR, MRR, NRR, GRR, CAC, LTV, Gross Margin, ARPU)
  - Show period-over-period trend indicators (↑ ↓ →)
  - Include formula tooltips using FormulaTooltip component
  - Use shadcn/ui Card component
  - File: `components/financials/kpi-overview.tsx`

- [ ] **T027** [P] Create NRR waterfall chart component in `components/financials/nrr-waterfall.tsx`:
  - Use recharts BarChart with stacked bars
  - Show Start MRR → Expansion → Contraction → Churn → End MRR
  - Color-coded bars (green expansion, red churn/contraction)
  - File: `components/financials/nrr-waterfall.tsx`

- [ ] **T028** [P] Create cohort heatmap component in `components/financials/cohort-heatmap.tsx`:
  - Render 24x24 grid using recharts or custom div grid
  - Color scale: green (high retention) to red (low retention)
  - Tooltips showing exact retention percentages
  - Support both logo and revenue retention views (toggle)
  - File: `components/financials/cohort-heatmap.tsx`

- [ ] **T029** [P] Create concentration chart component in `components/financials/concentration-chart.tsx`:
  - Use recharts BarChart for top 10 customers
  - Display HHI index value
  - Show risk banner if >25% threshold
  - Clickable bars for customer drill-down
  - File: `components/financials/concentration-chart.tsx`

- [ ] **T030** [P] Create AR/AP aging table component in `components/financials/ar-ap-aging-table.tsx`:
  - shadcn/ui Table component
  - Rows: 0-30, 31-60, 61-90, 90+ day buckets
  - Columns: AR Amount, AP Amount (if available)
  - Display DSO and DPO below table
  - Highlight anomalies (90+ day spikes)
  - File: `components/financials/ar-ap-aging-table.tsx`

- [ ] **T031** [P] Create benchmark comparison component in `components/financials/benchmark-comparison.tsx`:
  - Display 5 metrics vs. sector medians (NRR, Gross Margin, CAC, LTV:CAC, ARR Growth)
  - Traffic light indicators (green above median, yellow at median, red below)
  - Show quartile positions (P25, P50, P75)
  - Handle missing benchmarks gracefully (FR-028)
  - File: `components/financials/benchmark-comparison.tsx`

- [ ] **T032** [P] Create formula tooltip component in `components/financials/formula-tooltip.tsx`:
  - shadcn/ui Tooltip component wrapper
  - Display metric name, formula, example calculation
  - Support 8 KPI formulas (ARR, MRR, NRR, GRR, CAC, LTV, GM, ARPU)
  - File: `components/financials/formula-tooltip.tsx`

- [ ] **T033** [P] Create anomaly banner component in `components/financials/anomaly-banner.tsx`:
  - shadcn/ui Alert component
  - Display anomaly type (concentration_risk, ar_aging_spike)
  - Severity indicator (low/medium/high)
  - Actionable message with context
  - File: `components/financials/anomaly-banner.tsx`

- [ ] **T034** [P] Create CSV upload zone component in `components/financials/csv-upload-zone.tsx`:
  - Drag-and-drop file upload (5 file types)
  - File validation (CSV only, max 10MB per file)
  - Upload progress indicators
  - Links to downloadable CSV templates
  - Display validation errors with row numbers
  - File: `components/financials/csv-upload-zone.tsx`

---

## Phase H: Dashboard Pages

- [ ] **T035** Create financials dashboard page in `app/(dashboard)/companies/[id]/financials/page.tsx`:
  - Server component fetching initial data
  - Layout: KPI Overview → NRR Waterfall → Anomaly Banners
  - Use Next.js 15 async params pattern
  - Check org membership via RLS
  - Display empty state if no data uploaded yet
  - File: `app/(dashboard)/companies/[id]/financials/page.tsx`

- [ ] **T036** Create CSV upload page in `app/(dashboard)/companies/[id]/financials/upload/page.tsx`:
  - Check Financial Editor role, show permission error if not granted
  - Render CSVUploadZone component
  - Display upload history (previous uploads with timestamps)
  - Show affected date ranges after successful upload
  - Redirect to dashboard after successful recalculation
  - File: `app/(dashboard)/companies/[id]/financials/upload/page.tsx`

- [ ] **T037** Create cohorts analysis page in `app/(dashboard)/companies/[id]/financials/cohorts/page.tsx`:
  - Render CohortHeatmap component
  - Toggle between logo and revenue retention views
  - Window selector (12m, 18m, 24m)
  - Export to CSV button
  - File: `app/(dashboard)/companies/[id]/financials/cohorts/page.tsx`

---

## Phase I: PDF Export & Roles

- [ ] **T038** Implement PDF generator in `lib/financials/exports/pdf-generator.tsx`:
  - Use @react-pdf/renderer Document, Page, View, Text components
  - 9-page structure: Cover, Executive Summary, KPI Overview, NRR Waterfall, Cohorts, Concentration, AR/AP Aging, Benchmarks, Anomalies, Appendix
  - Embed SVG charts (convert recharts to SVG strings)
  - Professional styling (company logo, header/footer, page numbers)
  - Filename: {CompanyName}_Financial_Report_{YYYY-MM-DD}.pdf
  - File: `lib/financials/exports/pdf-generator.tsx`

- [ ] **T039** Implement GET /api/companies/[id]/financials/export/pdf/route.ts:
  - Parse query params (start_date, end_date)
  - Fetch all required data (KPIs, cohorts, concentration, aging, benchmarks)
  - Call pdf-generator with data
  - Return PDF with application/pdf content-type and attachment header
  - File: `app/api/companies/[id]/financials/export/pdf/route.ts`

- [ ] **T040** Create financial_roles migration in migration file (extend T001 if not yet applied):
  - Add financial_roles table to migration
  - Add RLS policies for role management
  - Seed initial admin role for current user (optional)
  - File: Update `supabase/migrations/20251030_financial_analytics.sql` or create new migration

- [ ] **T041** Implement role check helper in `lib/financials/auth/role-helper.ts`:
  - hasFinancialRole(userId, companyId, roles): check if user has Financial Editor or Admin role
  - getFinancialRoles(userId, companyId): return user's roles for company
  - grantFinancialRole(userId, companyId, role, grantedBy): Admin-only function to assign roles
  - revokeFinancialRole(userId, companyId, role): Admin-only function to remove roles
  - File: `lib/financials/auth/role-helper.ts`

- [ ] **T042** Add role check middleware to API routes:
  - Wrap T020 (upload), T025 (recompute), T039 (export) with role checks
  - Return 403 Forbidden if user lacks Financial Editor role
  - Log role check failures for audit
  - Files: Update `app/api/companies/[id]/financials/upload/route.ts`, `recompute/route.ts`, `export/pdf/route.ts`

---

## Phase J: E2E Validation Tests

- [ ] **T043** [P] E2E test for CSV upload with validation in `tests/e2e/financials-upload-csv.spec.ts`:
  - Scenario 1: Upload valid single-currency CSV → success + auto-recalculation
  - Scenario 2: Upload mixed-currency CSV → rejected with clear error
  - Scenario 3: Upload with missing required fields → validation errors with row numbers
  - Scenario 4: Re-upload same data → idempotent (no duplicates)
  - Scenario 5: Upload without Financial Editor role → permission denied
  - Use Playwright test fixtures
  - File: `tests/e2e/financials-upload-csv.spec.ts`

- [ ] **T044** [P] E2E test for dashboard metrics display in `tests/e2e/financials-dashboard.spec.ts`:
  - Scenario 1: View dashboard with uploaded data → KPIs displayed with formulas
  - Scenario 2: Hover formula tooltip → explanation shown
  - Scenario 3: Check benchmark comparison → sector median deltas visible
  - Scenario 4: View anomaly banner → concentration risk flagged (>25%)
  - Scenario 5: Dashboard load time <1 second (FR-053)
  - File: `tests/e2e/financials-dashboard.spec.ts`

- [ ] **T045** [P] E2E test for cohort analysis view in `tests/e2e/financials-cohorts.spec.ts`:
  - Scenario 1: View 24-month cohort heatmap → retention percentages displayed
  - Scenario 2: Toggle logo vs. revenue retention → data updates
  - Scenario 3: Hover cell → tooltip shows exact values
  - Scenario 4: Export to CSV → file downloaded with correct data
  - File: `tests/e2e/financials-cohorts.spec.ts`

- [ ] **T046** [P] E2E test for PDF export download in `tests/e2e/financials-export.spec.ts`:
  - Scenario 1: Click export button → PDF downloads with correct filename
  - Scenario 2: Open PDF → all 9 sections present
  - Scenario 3: Verify charts in PDF → SVG visualizations rendered
  - Scenario 4: Check formatting → board-ready quality (no errors)
  - File: `tests/e2e/financials-export.spec.ts`

---

## Phase K: Polish & Documentation

- [ ] **T047** Create CSV templates in `public/templates/`:
  - subscriptions.csv with header row and example data
  - invoices.csv with header row and example data
  - payments.csv with header row and example data
  - cogs.csv with header row and example data
  - sales_marketing.csv with header row and example data
  - Add download links in CSVUploadZone component
  - Files: `public/templates/subscriptions.csv`, `invoices.csv`, `payments.csv`, `cogs.csv`, `sales_marketing.csv`

- [ ] **T048** Seed benchmark data in `supabase/seeds/benchmark_data.sql`:
  - Insert sector medians for common sectors (SaaS, FinTech, Healthcare, E-commerce)
  - 4 size bands per sector (<$1M, $1M-$10M, $10M-$50M, $50M+)
  - 5 metrics per band (NRR, Gross Margin, CAC, LTV:CAC, ARR Growth)
  - P25, P50, P75 values for each metric
  - File: `supabase/seeds/benchmark_data.sql`

- [ ] **T049** Implement default anomaly thresholds in `lib/financials/anomaly/rules.ts`:
  - CONCENTRATION_SINGLE_CUSTOMER_PCT = 25 (FR-016 resolved)
  - AR_AGING_90_PLUS_SPIKE_PCT = 50 (FR-021 resolved)
  - DASHBOARD_LOAD_TARGET_MS = 1000 (FR-053 resolved)
  - Functions: detectConcentrationRisk(), detectARAgingAnomaly()
  - File: `lib/financials/anomaly/rules.ts`

- [ ] **T050** Add metric formula tooltips to KPI cards:
  - Define formulas in constants: ARR_FORMULA = "12 × MRR", NRR_FORMULA = "(Start MRR + Expansion - Contraction - Churn) / Start MRR", etc.
  - Add FormulaTooltip to each KPI card in KPIOverview component
  - Include example calculation for clarity
  - File: Update `components/financials/kpi-overview.tsx`

- [ ] **T051** Performance testing for 24-month recalculation:
  - Create test fixture with 50K invoices, 10K customers, 24 months of data
  - Run POST /recompute endpoint
  - Assert response time <5 seconds (FR-040)
  - Log breakdown: retrieval, calculation, insert times
  - If exceeds 5s, investigate slow queries and add indexes
  - File: `tests/performance/financials-recalc.perf.test.ts`

---

## Dependencies

### Sequential Dependencies
- **T001 (migration)** blocks T003-T009 (contract tests need database)
- **T002 (types)** blocks T010-T013, T014-T019, T020-T025 (all need types)
- **T003-T009 (contract tests)** MUST fail before T020-T025 (TDD principle)
- **T010-T013 (unit tests)** MUST fail before T016-T019 (TDD principle)
- **T014-T015 (ingestion)** blocks T020 (upload route needs parser/upserter)
- **T016-T019 (calculators)** block T021-T025 (API routes need calculators)
- **T020-T025 (API routes)** block T035-T037 (pages need API endpoints)
- **T026-T034 (components)** block T035-T037 (pages need components)
- **T038 (PDF generator)** blocks T039 (export route needs generator)
- **T041 (role helper)** blocks T042 (middleware needs helper)
- **T001-T042** block T043-T046 (E2E tests need full implementation)

### Parallel Groups

**Group 1: Contract Tests [P]** (T003-T009)
```bash
# All 7 can run in parallel (different files)
Task: "Contract test POST /upload in tests/contract/financials-upload.contract.test.ts"
Task: "Contract test GET /summary in tests/contract/financials-summary.contract.test.ts"
Task: "Contract test GET /cohorts in tests/contract/financials-cohorts.contract.test.ts"
Task: "Contract test GET /concentration in tests/contract/financials-concentration.contract.test.ts"
Task: "Contract test GET /ar-ap-aging in tests/contract/financials-ar-ap.contract.test.ts"
Task: "Contract test POST /recompute in tests/contract/financials-recompute.contract.test.ts"
Task: "Contract test GET /export/pdf in tests/contract/financials-export.contract.test.ts"
```

**Group 2: Calculator Unit Tests [P]** (T010-T013)
```bash
# All 4 can run in parallel (different files)
Task: "Unit tests for KPI calculator in tests/unit/financials/kpi-calculator.test.ts"
Task: "Unit tests for cohort calculator in tests/unit/financials/cohort-calculator.test.ts"
Task: "Unit tests for concentration calculator in tests/unit/financials/concentration-calculator.test.ts"
Task: "Unit tests for AR/AP calculator in tests/unit/financials/ar-ap-calculator.test.ts"
```

**Group 3: UI Components [P]** (T026-T034)
```bash
# All 9 can run in parallel (different files)
Task: "KPI overview component in components/financials/kpi-overview.tsx"
Task: "NRR waterfall component in components/financials/nrr-waterfall.tsx"
Task: "Cohort heatmap component in components/financials/cohort-heatmap.tsx"
Task: "Concentration chart component in components/financials/concentration-chart.tsx"
Task: "AR/AP aging table component in components/financials/ar-ap-aging-table.tsx"
Task: "Benchmark comparison component in components/financials/benchmark-comparison.tsx"
Task: "Formula tooltip component in components/financials/formula-tooltip.tsx"
Task: "Anomaly banner component in components/financials/anomaly-banner.tsx"
Task: "CSV upload zone component in components/financials/csv-upload-zone.tsx"
```

**Group 4: E2E Tests [P]** (T043-T046)
```bash
# All 4 can run in parallel (different files)
Task: "E2E CSV upload test in tests/e2e/financials-upload-csv.spec.ts"
Task: "E2E dashboard test in tests/e2e/financials-dashboard.spec.ts"
Task: "E2E cohorts test in tests/e2e/financials-cohorts.spec.ts"
Task: "E2E export test in tests/e2e/financials-export.spec.ts"
```

---

## Validation Checklist

### Completeness
- [x] All 7 contracts have corresponding tests (T003-T009)
- [x] All 13 entities in migration (T001)
- [x] All 7 API endpoints implemented (T020-T025, T039)
- [x] All tests come before implementation (TDD order maintained)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task

### Coverage
- [x] Setup phase complete (T001-T002)
- [x] TDD test phase complete (T003-T013)
- [x] Core implementation complete (T014-T025)
- [x] UI components complete (T026-T034)
- [x] Pages complete (T035-T037)
- [x] Integration complete (T038-T042)
- [x] E2E validation complete (T043-T046)
- [x] Polish complete (T047-T051)

### Requirements Traceability
- [x] FR-001-008: KPI tracking → T016 (KPI calculator)
- [x] FR-009-013: Cohort analysis → T017 (cohort calculator)
- [x] FR-014-017: Concentration → T018 (concentration calculator)
- [x] FR-018-022: AR/AP aging → T019 (AR/AP calculator)
- [x] FR-023-028: Benchmarking → T031 (benchmark component)
- [x] FR-029-037: Data ingestion → T014-T015 (parser/validator/upserter)
- [x] FR-038-041: Recomputation → T025 (recompute route)
- [x] FR-042-046: Exports → T038-T039 (PDF generator/route)
- [x] FR-047-049b: Permissions → T040-T042 (roles table/helper/middleware)
- [x] FR-050-054: UX → T026-T034 (UI components)

---

## Notes

- **TDD Mandatory**: Contract tests (T003-T009) and unit tests (T010-T013) MUST fail before proceeding to implementation
- **[P] Marker**: Indicates tasks can run in parallel (different files, no dependencies)
- **Performance Gates**: T025 must complete in <5s for 24 months (FR-040), T044 must verify <1s dashboard load (FR-053)
- **Security**: All API routes check org membership via RLS, upload/recompute require Financial Editor role
- **Idempotency**: CSV re-uploads handled by checksum validation (T015)
- **Commit Strategy**: Commit after each task completion for incremental progress tracking

---

## Execution Status

**Phase Status**:
- [ ] Phase A: Foundation & Database Schema (T001-T002)
- [ ] Phase B: Contract Tests (T003-T009) ⚠️ TDD
- [ ] Phase C: Calculator Unit Tests (T010-T013) ⚠️ TDD
- [ ] Phase D: CSV Ingestion (T014-T015)
- [ ] Phase E: Calculators (T016-T019)
- [ ] Phase F: API Routes (T020-T025)
- [ ] Phase G: UI Components (T026-T034)
- [ ] Phase H: Pages (T035-T037)
- [ ] Phase I: PDF & Roles (T038-T042)
- [ ] Phase J: E2E Tests (T043-T046)
- [ ] Phase K: Polish (T047-T051)

**Total Tasks**: 51 (T001-T051)
**Parallel Tasks**: 24 (marked with [P])
**Sequential Tasks**: 27

---

**Ready for implementation following TDD principles. Begin with T001 (migration), then T002 (types), then T003-T009 (contract tests).**
