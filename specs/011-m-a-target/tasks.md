# Tasks: M&A Target Prediction Algorithm

**Input**: Design documents from `/home/vik/oppspot/specs/011-m-a-target/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript/Next.js 15, Supabase, OpenRouter API
   → Structure: Web app (Next.js full-stack)
2. Load optional design documents ✅
   → data-model.md: 7 entities identified
   → contracts/: 3 API contract files
   → research.md: 10 technical decisions
   → quickstart.md: 10 test scenarios
3. Generate tasks by category ✅
   → 43 total tasks across 5 phases
4. Apply task rules ✅
   → Different files = marked [P]
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T043) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → All 3 contracts have tests
   → All 7 entities have schema tasks
   → All endpoints implemented
9. Return: SUCCESS (tasks ready for execution) ✅
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- All paths are absolute from repository root `/home/vik/oppspot/`

---

## Phase 3.1: Setup & Environment (Duration: 2-3 hours)

- [ ] **T001** Create feature directory structure for M&A prediction module
  - Create: `lib/ma-prediction/`, `lib/ma-prediction/analyzers/`, `lib/ma-prediction/scoring/`, `lib/ma-prediction/valuation/`, `lib/ma-prediction/repository/`, `lib/ma-prediction/batch/`, `lib/ma-prediction/export/`
  - Create: `components/ma-prediction/`
  - Create: `lib/types/ma-prediction.ts`
  - Create: `lib/stores/ma-prediction-store.ts`

- [ ] **T002** Add environment variables and configuration
  - Update `.env.example` with: `CRON_SECRET`, `MA_PREDICTION_BATCH_SIZE`, `MA_PREDICTION_ENABLED`
  - Document in README or CLAUDE.md

- [ ] **T003** Configure Vercel Cron Job for nightly batch processing
  - Update `vercel.json` with cron schedule: `"0 2 * * *"` (2 AM daily)
  - Path: `/api/cron/ma-predictions`
  - Verify deployment configuration

---

## Phase 3.2: Database Schema (Duration: 3-4 hours)

**CRITICAL: Database must be created before any API or service implementation**

- [ ] **T004** Create database migration file `supabase/migrations/20251030_ma_predictions.sql`
  - Create all 7 tables from data-model.md:
    - `ma_predictions`
    - `ma_prediction_factors`
    - `ma_valuation_estimates`
    - `ma_acquirer_profiles`
    - `ma_historical_deals`
    - `ma_prediction_queue`
    - `ma_prediction_audit_log`
  - Include all indexes, constraints, and CHECK clauses
  - Add table comments for documentation

- [ ] **T005** Create Row Level Security (RLS) policies for all tables
  - Add to same migration file `20251030_ma_predictions.sql`
  - Policies:
    - `ma_predictions`: SELECT for authenticated, INSERT/UPDATE for service_role
    - `ma_prediction_factors`: SELECT for authenticated, INSERT for service_role
    - `ma_valuation_estimates`: SELECT for authenticated, INSERT for service_role
    - `ma_acquirer_profiles`: SELECT for authenticated, INSERT for service_role
    - `ma_historical_deals`: SELECT for authenticated, INSERT for admins
    - `ma_prediction_queue`: All operations for service_role only
    - `ma_prediction_audit_log`: SELECT for own user or admins, INSERT for service_role, no UPDATE/DELETE

- [ ] **T006** Create database trigger for real-time recalculation
  - Add to migration file `20251030_ma_predictions.sql`
  - Function: `trigger_ma_recalculation()` - inserts into `ma_prediction_queue` when businesses.revenue, profitability, or employees change
  - Trigger: `businesses_update_trigger` on businesses table AFTER UPDATE

- [ ] **T007** Apply migration locally and verify schema
  - Run: `psql $DATABASE_URL -f supabase/migrations/20251030_ma_predictions.sql`
  - Verify: `psql $DATABASE_URL -c "\dt ma_*"` shows 7 tables
  - Test: Insert dummy data and verify constraints work

- [ ] **T008** Create seed dataset `supabase/seeds/ma_historical_deals.sql`
  - Manually curate 100-200 UK/Ireland M&A deals from public sources
  - Include: target/acquirer names, deal dates, values, SIC codes, deal rationales
  - Mark as verified: `verified = TRUE`
  - Apply seed: `psql $DATABASE_URL -f supabase/seeds/ma_historical_deals.sql`

---

## Phase 3.3: TypeScript Types & Interfaces (Duration: 1-2 hours)

**Run in parallel after T001 completes**

- [ ] **T009 [P]** Create TypeScript types in `lib/types/ma-prediction.ts`
  - Export interfaces from data-model.md:
    - `MAPrediction`, `MAPredictionFactor`, `MAValuationEstimate`, `MAAcquirerProfile`, `MAHistoricalDeal`
    - Type unions: `LikelihoodCategory`, `ConfidenceLevel`, `FactorType`, `StrategicRationale`
    - Composite type: `MAPredictionDetail` (prediction + factors + valuation + acquirers + company)
  - Export to `types/database.ts` if using Supabase type generation

---

## Phase 3.4: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3.5

**CRITICAL: These tests MUST be written and MUST FAIL before ANY API implementation**
**Duration: 4-5 hours**

- [ ] **T010 [P]** Contract test for prediction retrieval API in `tests/contract/ma-prediction-api.contract.test.ts`
  - Test `GET /api/ma-predictions/[companyId]`
  - Test `GET /api/ma-predictions/[companyId]/history`
  - Assert response schemas match `api-predict.yaml`
  - Test query parameters: `?include=factors`, `?include=valuation`, `?include=acquirers`, `?include=all`
  - Test error responses: 401 Unauthorized, 404 Not Found, 500 Internal Server Error
  - Test performance: Response time <5 seconds
  - Verify tests FAIL (no implementation yet)

- [ ] **T011 [P]** Contract test for batch processing API in `tests/contract/ma-batch-api.contract.test.ts`
  - Test `POST /api/ma-predictions/batch` with authentication
  - Test `GET /api/ma-predictions/batch/[batchId]/status`
  - Test `GET /api/cron/ma-predictions` with CRON_SECRET auth
  - Test `GET /api/ma-predictions/queue/status`
  - Assert response schemas match `api-batch.yaml`
  - Test authorization: Only service_role can trigger batch
  - Verify tests FAIL (no implementation yet)

- [ ] **T012 [P]** Contract test for export API in `tests/contract/ma-export-api.contract.test.ts`
  - Test `POST /api/ma-predictions/export` with all formats: PDF, Excel, CSV
  - Test `GET /api/ma-predictions/export/[exportId]/status`
  - Test `GET /api/ma-predictions/export/watchlist` with format parameter
  - Assert response schemas match `api-export.yaml`
  - Test file downloads: Content-Type headers, file integrity
  - Test bulk export limits (max 1000 companies)
  - Verify tests FAIL (no implementation yet)

---

## Phase 3.5: Core Services Implementation (Duration: 2-3 days)

**ONLY proceed after contract tests are failing (T010-T012 complete)**

### Analyzer Services (Can run in parallel)

- [ ] **T013 [P]** Implement Financial Analyzer in `lib/ma-prediction/analyzers/financial-analyzer.ts`
  - Analyze: Revenue trends (YoY growth/decline), profitability changes, cash flow patterns, debt levels
  - Input: Company financial data from `businesses` table
  - Output: Financial score (0-100), key factors (e.g., "declining_revenue", "increasing_debt")
  - Export `analyzeFinancials(companyId: string): Promise<AnalysisResult>`

- [ ] **T014 [P]** Implement Operational Analyzer in `lib/ma-prediction/analyzers/operational-analyzer.ts`
  - Analyze: Employee count trends, director changes (via Companies House API), filing punctuality, registered office relocations
  - Input: Company operational data from `businesses` table + Companies House API
  - Output: Operational score (0-100), key factors (e.g., "frequent_director_changes", "late_filings")
  - Export `analyzeOperations(companyId: string): Promise<AnalysisResult>`

- [ ] **T015 [P]** Implement Market Analyzer in `lib/ma-prediction/analyzers/market-analyzer.ts`
  - Analyze: Industry consolidation rate (M&A activity in SIC code), company age, geographic clustering, sector maturity
  - Input: Company market data + `ma_historical_deals` patterns
  - Output: Market score (0-100), key factors (e.g., "industry_consolidation", "target_age_range")
  - Export `analyzeMarket(companyId: string): Promise<AnalysisResult>`

- [ ] **T016 [P]** Implement Historical Pattern Matcher in `lib/ma-prediction/analyzers/pattern-matcher.ts`
  - Match company characteristics against `ma_historical_deals` dataset
  - Find similar past M&A transactions by: SIC code, size, age, deal rationale
  - Output: Historical score (0-100), comparable deals, pattern insights
  - Export `matchHistoricalPatterns(companyId: string): Promise<PatternMatchResult>`

### Scoring & Confidence

- [ ] **T017** Implement Prediction Scorer in `lib/ma-prediction/scoring/prediction-scorer.ts`
  - Combine analyzer outputs (T013-T016) with AI-powered analysis
  - Rule-based scoring (50% weight): Combine financial (30%), operational (10%), market (10%)
  - AI-powered scoring (50% weight): Call OpenRouter API (Claude 3.5 Sonnet) with company data
  - Hybrid final score: `(rule_score * 0.5) + (ai_score * 0.5)`
  - Categorize: Low (0-25), Medium (26-50), High (51-75), Very High (76-100)
  - Export `calculatePredictionScore(companyId: string): Promise<PredictionScore>`
  - Dependency: Requires T013-T016 complete

- [ ] **T018 [P]** Implement Confidence Calculator in `lib/ma-prediction/scoring/confidence-calculator.ts`
  - Assess data completeness: Years of financial history, required fields present, data recency
  - Calculate confidence: High (2+ years recent data), Medium (partial data), Low (<2 years or stale)
  - Export `calculateConfidence(companyId: string): Promise<ConfidenceLevel>`

### Valuation & Acquirer Profiling

- [ ] **T019 [P]** Implement Valuation Estimator in `lib/ma-prediction/valuation/valuation-estimator.ts`
  - Calculate valuation ranges using revenue multiples, EBITDA multiples, comparable deals
  - Input: Company financials + historical M&A deal values
  - Output: Min/max valuation (GBP), valuation method, confidence level, key assumptions
  - Only generate for Medium+ likelihood predictions
  - Export `estimateValuation(companyId: string, predictionScore: number): Promise<ValuationEstimate | null>`

- [ ] **T020** Implement Acquirer Profile Generator in `lib/ma-prediction/analyzers/acquirer-profiler.ts`
  - Generate potential acquirer profiles for High/Very High predictions
  - Rule-based matching: Same/adjacent SIC codes, 3-10x size ratio, geographic proximity
  - Rank by match score: Industry fit, size ratio, strategic rationale
  - Output: Top 5-10 acquirer profiles with explanations
  - Export `generateAcquirerProfiles(companyId: string, predictionScore: number): Promise<AcquirerProfile[]>`
  - Dependency: Requires database query access to `businesses` table

### Repository & Orchestration

- [ ] **T021** Implement Prediction Repository in `lib/ma-prediction/repository/prediction-repository.ts`
  - CRUD operations for all M&A prediction tables
  - Methods:
    - `savePrediction(prediction: MAPrediction): Promise<void>`
    - `saveFactors(factors: MAPredictionFactor[]): Promise<void>`
    - `saveValuation(valuation: MAValuationEstimate): Promise<void>`
    - `saveAcquirerProfiles(profiles: MAAcquirerProfile[]): Promise<void>`
    - `getActivePrediction(companyId: string): Promise<MAPredictionDetail | null>`
    - `getPredictionHistory(companyId: string, limit: number): Promise<MAPrediction[]>`
    - `logAuditTrail(userId: string, companyId: string, action: string): Promise<void>`
  - Use Supabase service role client for writes
  - Dependency: Requires T004-T007 (database schema)

- [ ] **T022** Implement M&A Prediction Service (Main Orchestrator) in `lib/ma-prediction/ma-prediction-service.ts`
  - Orchestrate entire prediction pipeline:
    1. Fetch company data
    2. Run analyzers in parallel (T013-T016)
    3. Calculate prediction score (T017)
    4. Calculate confidence (T018)
    5. Generate valuation if Medium+ (T019)
    6. Generate acquirer profiles if High+ (T020)
    7. Save results via repository (T021)
    8. Return `MAPredictionDetail`
  - Export `generatePrediction(companyId: string): Promise<MAPredictionDetail>`
  - Handle errors: Insufficient data, API timeouts, database failures
  - Dependency: Requires T013-T021 complete

### Batch Processing

- [ ] **T023** Implement Batch Processor in `lib/ma-prediction/batch/batch-processor.ts`
  - Process companies in batches of 100 (parallel execution)
  - Track progress: Batch ID, total/processed/success/failed counts
  - Error handling: Retry failed predictions once, log errors
  - Methods:
    - `processBatch(companyIds: string[], batchSize: number): Promise<BatchResult>`
    - `processAllCompanies(): Promise<BatchResult>` - fetch all active companies
    - `getBatchStatus(batchId: string): Promise<BatchStatus>`
  - Use queue for large batches to avoid timeouts
  - Export to API routes
  - Dependency: Requires T022 (MA Prediction Service)

---

## Phase 3.6: API Routes Implementation (Duration: 1-2 days)

**ONLY proceed after services are complete (T013-T023) and contract tests exist (T010-T012)**

### Prediction Retrieval API

- [ ] **T024** Implement `GET /api/ma-predictions/[companyId]/route.ts`
  - Query parameter support: `?include=factors|valuation|acquirers|all`
  - Call `prediction-repository.getActivePrediction(companyId)`
  - Conditionally include related data based on `include` parameter
  - Return 404 if no prediction or insufficient data
  - Log to audit trail via `prediction-repository.logAuditTrail()`
  - Authentication: Require Supabase JWT (all authenticated users)
  - Must make contract test T010 PASS
  - Dependency: Requires T021, T022

- [ ] **T025** Implement `GET /api/ma-predictions/[companyId]/history/route.ts`
  - Query parameter: `?limit=10` (default 10, max 100)
  - Call `prediction-repository.getPredictionHistory(companyId, limit)`
  - Return historical predictions ordered by `created_at DESC`
  - Authentication: Require Supabase JWT
  - Must make contract test T010 PASS
  - Dependency: Requires T021

### Batch Processing API

- [ ] **T026** Implement `POST /api/ma-predictions/batch/route.ts`
  - Request body: `{ company_ids?: string[], force_recalculate?: boolean, batch_size?: number }`
  - Authorization: Check if user has admin role OR valid service_role token
  - Call `batch-processor.processBatch()` or `processAllCompanies()`
  - Return 202 Accepted with batch_id and status_url
  - Must make contract test T011 PASS
  - Dependency: Requires T023

- [ ] **T027** Implement `GET /api/ma-predictions/batch/[batchId]/status/route.ts`
  - Call `batch-processor.getBatchStatus(batchId)`
  - Return batch progress: status, processed_count, success_count, failed_count, progress_percentage
  - Must make contract test T011 PASS
  - Dependency: Requires T023

- [ ] **T028** Implement `GET /api/cron/ma-predictions/route.ts` (Vercel Cron endpoint)
  - Verify authorization header: `Bearer ${CRON_SECRET}`
  - Return 401 if CRON_SECRET doesn't match
  - Call `batch-processor.processAllCompanies()`
  - Return execution summary: processed_count, execution_time_seconds
  - Must make contract test T011 PASS
  - Dependency: Requires T023, T003

- [ ] **T029** Implement `GET /api/ma-predictions/queue/status/route.ts`
  - Query `ma_prediction_queue` table for pending/processing counts
  - Return: `{ pending_count, processing_count, oldest_pending, average_processing_time_seconds }`
  - Authentication: Require Supabase JWT
  - Must make contract test T011 PASS
  - Dependency: Requires T004 (database schema)

### Export API

- [ ] **T030** Implement PDF Generator in `lib/ma-prediction/export/pdf-generator.ts`
  - Reuse Puppeteer setup from ResearchGPT™
  - Input: `MAPredictionDetail` object(s)
  - Generate HTML template with: Company header, prediction score, valuation table, factors, acquirers, disclaimer
  - Convert HTML to PDF using Puppeteer
  - Export `generatePDF(predictions: MAPredictionDetail[]): Promise<Buffer>`
  - Target: <5 seconds for single company report

- [ ] **T031 [P]** Implement Excel Generator in `lib/ma-prediction/export/excel-generator.ts`
  - Use ExcelJS library (existing dependency)
  - Input: `MAPredictionDetail[]` array
  - Create workbook with 3 sheets: "Predictions", "Factors", "Acquirer Profiles"
  - Format: Column headers, number formatting, auto-width columns
  - Export `generateExcel(predictions: MAPredictionDetail[]): Promise<Buffer>`
  - Target: <3 seconds for 100 companies

- [ ] **T032 [P]** Implement CSV Generator in `lib/ma-prediction/export/csv-generator.ts`
  - Simple CSV serialization
  - Input: `MAPredictionDetail[]` array
  - Format: Flatten nested data (one row per prediction)
  - Columns: company_name, company_number, prediction_score, likelihood_category, confidence_level, min_valuation, max_valuation
  - Export `generateCSV(predictions: MAPredictionDetail[]): Promise<string>`
  - Target: <1 second

- [ ] **T033** Implement `POST /api/ma-predictions/export/route.ts`
  - Request body: `{ format: 'pdf'|'excel'|'csv', company_ids: string[], filters?: {...}, include_fields?: {...} }`
  - Validate: Max 1000 company_ids
  - Fetch predictions via `prediction-repository.getActivePrediction()` for each company
  - Call appropriate generator: T030 (PDF), T031 (Excel), or T032 (CSV)
  - Return file download with proper Content-Type and Content-Disposition headers
  - For >100 companies: Return 202 Accepted with export_id (async processing)
  - Log to audit trail: `action_type = 'export_pdf'|'export_excel'|'export_csv'`
  - Must make contract test T012 PASS
  - Dependency: Requires T021, T030, T031, T032

- [ ] **T034** Implement `GET /api/ma-predictions/export/[exportId]/status/route.ts`
  - For async exports (>100 companies)
  - Track export progress in database or in-memory cache
  - Return status: queued, processing, completed, failed
  - If completed: Return download_url (Supabase Storage link) with expiry
  - Must make contract test T012 PASS

- [ ] **T035** Implement `GET /api/ma-predictions/export/watchlist/route.ts`
  - Query parameter: `?format=pdf|excel|csv&list_id={optional}`
  - Fetch user's saved companies or specific business_lists
  - Filter: Only High/Very High likelihood predictions
  - Call export generators (T030-T032) based on format
  - Return file download
  - Must make contract test T012 PASS
  - Dependency: Requires existing `saved_businesses` or `business_lists` tables

---

## Phase 3.7: Queue Processor for Real-Time Updates (Duration: 3-4 hours)

- [ ] **T036** Implement Queue Processor in `lib/ma-prediction/batch/queue-processor.ts`
  - Poll `ma_prediction_queue` every 60 seconds for pending jobs
  - Process queued recalculations in batches of 10
  - Update job status: pending → processing → completed/failed
  - Call `ma-prediction-service.generatePrediction()` for each queued company
  - Retry logic: Retry once if failed, then mark as permanently failed
  - Export `startQueueProcessor(): void` (background process)
  - Dependency: Requires T022 (MA Prediction Service), T006 (database trigger)

- [ ] **T037** Integrate Queue Processor into Next.js runtime
  - Option 1: Run in API route with setInterval (development)
  - Option 2: Separate Node.js process (production)
  - Start processor on server initialization
  - Ensure graceful shutdown on server stop
  - Test: Trigger recalculation by updating company data in database

---

## Phase 3.8: State Management (Zustand Store) (Duration: 1-2 hours)

- [ ] **T038** Implement Zustand store in `lib/stores/ma-prediction-store.ts`
  - State:
    - `currentPrediction: MAPredictionDetail | null`
    - `predictionHistory: MAPrediction[]`
    - `filters: { likelihood_categories: string[], min_score: number, max_score: number }`
    - `isLoading: boolean`
    - `error: string | null`
  - Actions:
    - `fetchPrediction(companyId: string): Promise<void>`
    - `fetchHistory(companyId: string): Promise<void>`
    - `setFilters(filters: Filters): void`
    - `reset(): void`
  - Export `useMAPredictionStore()`

---

## Phase 3.9: UI Components (Duration: 2-3 days)

**Can run in parallel after T009 (types) and T038 (store) complete**

- [ ] **T039 [P]** Create Prediction Score Badge in `components/ma-prediction/prediction-score-badge.tsx`
  - Props: `score: number, size?: 'sm' | 'md' | 'lg'`
  - Display: Circular badge with score 0-100, color-coded by likelihood (green=Low, yellow=Medium, orange=High, red=Very High)
  - Use shadcn/ui `Badge` component
  - Export default component

- [ ] **T040 [P]** Create Prediction Card in `components/ma-prediction/prediction-card.tsx`
  - Props: `prediction: MAPrediction, compact?: boolean`
  - Display: Score badge, likelihood category pill, confidence indicator, last updated timestamp, "View Details" button
  - Use shadcn/ui `Card`, `Badge` components
  - Click handler: Navigate to detailed view or expand inline
  - Export default component

- [ ] **T041 [P]** Create Factor List in `components/ma-prediction/factor-list.tsx`
  - Props: `factors: MAPredictionFactor[]`
  - Display: Top 5 factors as expandable list items
  - Show: Rank, factor type icon, description, impact weight (progress bar), impact direction (↑↓)
  - Use shadcn/ui `Accordion` or `Collapsible` for expansion
  - Export default component

- [ ] **T042 [P]** Create Valuation Range Display in `components/ma-prediction/valuation-range.tsx`
  - Props: `valuation: MAValuationEstimate | null`
  - Display: Min-max range as horizontal bar chart, valuation method, confidence level
  - Format currency: GBP with commas (e.g., "£5,000,000 - £12,000,000")
  - Show "N/A" if valuation is null (Low likelihood predictions)
  - Use shadcn/ui `Card` component
  - Export default component

- [ ] **T043 [P]** Create Acquirer Profiles Table in `components/ma-prediction/acquirer-profiles.tsx`
  - Props: `acquirerProfiles: MAAcquirerProfile[]`
  - Display: Table with columns: Rank, Acquirer Name (if specific), Industry Match, Size Ratio, Geographic Proximity, Strategic Rationale, Match Score
  - Sortable by match score (default sort)
  - Use shadcn/ui `Table` component
  - Export default component

- [ ] **T044 [P]** Create Prediction History Chart in `components/ma-prediction/prediction-history.tsx`
  - Props: `history: MAPrediction[]`
  - Display: Line chart showing prediction score trends over time
  - X-axis: Date, Y-axis: Score (0-100)
  - Highlight likelihood category changes
  - Use Recharts or similar charting library (check existing dependencies)
  - Export default component

- [ ] **T045 [P]** Create Export Controls in `components/ma-prediction/export-controls.tsx`
  - Props: `companyIds: string[], onExportStart?: () => void, onExportComplete?: () => void`
  - Display: Dropdown with "Export as PDF", "Export as Excel", "Export as CSV" options
  - Click handler: Call `/api/ma-predictions/export` with selected format
  - Show loading spinner during export
  - Trigger download on completion
  - Use shadcn/ui `DropdownMenu`, `Button` components
  - Export default component

---

## Phase 3.10: Page Integration (Duration: 1-2 days)

**Can only proceed after T039-T045 (UI components) are complete**

- [ ] **T046** Add M&A Prediction Section to Company Profile Page in `app/business/[id]/page.tsx`
  - Import components: `PredictionCard`, `FactorList`, `ValuationRange`, `AcquirerProfiles`, `ExportControls`
  - Fetch prediction on page load: `useMAPredictionStore().fetchPrediction(companyId)`
  - Display: Collapsible section with "M&A Target Prediction" heading
  - Show "Insufficient Data" message if prediction doesn't exist (404 from API)
  - Include financial disclaimer (FR-027 compliance)
  - Dependency: Requires T039-T045, T024

- [ ] **T047** Create Dedicated M&A Targets Dashboard Page in `app/(dashboard)/ma-targets/page.tsx`
  - Server component: Fetch all High/Very High predictions from database
  - Display: Grid or list of `PredictionCard` components
  - Filters: Likelihood categories, score range, industry (SIC code)
  - Sorting: By score (default), by company name, by valuation
  - Pagination: 50 companies per page
  - Bulk actions: "Export Selected" button (uses T045)
  - Use shadcn/ui `Select`, `Slider` for filters
  - Dependency: Requires T040, T045

- [ ] **T048** Add M&A Likelihood Filter to Search/Dashboard
  - Update search page filters panel
  - Add: "M&A Target Likelihood" multi-select checkbox (Low, Medium, High, Very High)
  - Backend: Update search query to join `ma_predictions` table
  - Display: Show prediction score badge on search result cards
  - Dependency: Requires T039

---

## Phase 3.11: End-to-End (E2E) Tests (Duration: 1-2 days)

**Can run in parallel, but require APIs and UI to be deployed/running**

- [ ] **T049 [P]** E2E test: View M&A prediction on company profile in `tests/e2e/ma-prediction-view.spec.ts`
  - Playwright test following quickstart.md Scenario 1
  - Navigate to `/business/[company-id]`
  - Assert: Prediction score badge visible
  - Assert: Likelihood category displayed
  - Assert: "View Details" button exists
  - Click "View Details", assert expanded view shows factors, valuation, acquirers
  - Assert: Response time <5 seconds
  - Dependency: Requires T046, T024

- [ ] **T050 [P]** E2E test: Filter companies by M&A likelihood in `tests/e2e/ma-prediction-filter.spec.ts`
  - Playwright test following quickstart.md Scenario 3
  - Navigate to `/dashboard` or M&A targets page
  - Open filters panel
  - Select "High" and "Very High" likelihood
  - Apply filter
  - Assert: Results show only High/Very High companies
  - Assert: Results sorted by score descending
  - Dependency: Requires T047 or T048

- [ ] **T051 [P]** E2E test: Export M&A predictions in `tests/e2e/ma-prediction-export.spec.ts`
  - Playwright test following quickstart.md Scenarios 4 & 5
  - Navigate to company profile
  - Click "Export" → Select "PDF"
  - Assert: PDF downloads successfully
  - Verify: PDF file exists and is valid (not corrupted)
  - Repeat for Excel and CSV formats
  - Assert: All downloads complete in <5 seconds
  - Dependency: Requires T033, T046

---

## Phase 3.12: Integration & Deployment (Duration: 1 day)

- [ ] **T052** Update `.env.example` with all new environment variables
  - Add: `CRON_SECRET`, `MA_PREDICTION_BATCH_SIZE`, `MA_PREDICTION_ENABLED`
  - Document purpose and example values

- [ ] **T053** Deploy database migration to Supabase production
  - Run migration on production database
  - Verify: All tables created, RLS policies active
  - Apply seed data: `ma_historical_deals`
  - Test: Insert/query operations work

- [ ] **T054** Configure production environment variables in Vercel
  - Set `CRON_SECRET` to secure random value
  - Set `MA_PREDICTION_BATCH_SIZE=100`
  - Set `MA_PREDICTION_ENABLED=true`
  - Verify Vercel Cron Job is scheduled (check Vercel dashboard)

- [ ] **T055** Run manual quickstart validation (quickstart.md Scenarios 1-10)
  - Execute all 10 test scenarios manually
  - Document any issues found
  - Fix critical bugs before marking complete

---

## Phase 3.13: Polish & Documentation (Duration: 1-2 days)

- [ ] **T056 [P]** Add unit tests for scorer and analyzers
  - Test: `financial-analyzer.ts` with mock company data
  - Test: `prediction-scorer.ts` with mock analyzer outputs
  - Test: `confidence-calculator.ts` with various data completeness scenarios
  - Use Jest or Vitest (check existing test setup)
  - Target: >80% code coverage for core logic

- [ ] **T057** Performance testing and optimization
  - Run k6 load test (quickstart.md performance validation)
  - Target: <5s p95 latency, >20 RPS, <1% error rate
  - Optimize slow queries: Add indexes if needed
  - Optimize API responses: Enable caching for predictions

- [ ] **T058 [P]** Update project documentation
  - Update CLAUDE.md with M&A prediction feature overview (already done by plan)
  - Add API documentation to README or separate docs/ma-predictions.md
  - Document batch processing schedule and monitoring
  - Document troubleshooting steps (from quickstart.md)

- [ ] **T059** Code cleanup and refactoring
  - Remove any `console.log` statements
  - Replace `any` types with proper TypeScript interfaces
  - Remove unused imports
  - Run linter: `npm run lint` and fix all errors
  - Ensure TypeScript build succeeds: `npm run build`

- [ ] **T060** Final review and PR preparation
  - Review all files changed in feature branch `011-m-a-target`
  - Verify all contract tests pass: `npm run test:contract`
  - Verify all E2E tests pass: `npm run test:e2e`
  - Ensure no sensitive data (API keys, secrets) committed
  - Prepare PR description with: Summary, testing steps, screenshots
  - Ready for code review

---

## Dependencies

### Critical Path (Sequential)
1. **Setup** (T001-T003) → Database (T004-T008) → Types (T009)
2. **Contract Tests** (T010-T012) MUST complete before API implementation
3. **Database** (T004-T008) → Repository (T021) → All API routes
4. **Analyzers** (T013-T016) → Scorer (T017) → Service (T022) → APIs (T024-T035)
5. **Services** (T013-T023) → APIs (T024-T035) → UI (T046-T048) → E2E Tests (T049-T051)

### Parallel Execution Opportunities
- **After T001**: T009 (types)
- **Phase 3.4**: T010, T011, T012 (contract tests) - different files
- **Phase 3.5**: T013, T014, T015, T016 (analyzers) - independent logic
- **Phase 3.5**: T018, T019 (confidence, valuation) - different files
- **Phase 3.6**: T030, T031, T032 (export generators) - different files
- **Phase 3.9**: T039, T040, T041, T042, T043, T044, T045 (UI components) - different files
- **Phase 3.11**: T049, T050, T051 (E2E tests) - different files
- **Phase 3.13**: T056, T058 (unit tests, docs) - different files

### Blocking Dependencies (No Parallelization)
- T017 (scorer) depends on T013-T016 (analyzers)
- T022 (service) depends on T013-T021 (all analyzers, scorers, repository)
- T023 (batch processor) depends on T022 (service)
- T024-T029 (API routes) depend on T021-T023 (services)
- T033 (export API) depends on T030-T032 (generators)
- T046-T048 (pages) depend on T039-T045 (UI components)
- T049-T051 (E2E) depend on T024-T048 (full stack)

---

## Parallel Example

```bash
# Launch contract tests together (Phase 3.4):
Task: "Contract test for prediction retrieval API in tests/contract/ma-prediction-api.contract.test.ts"
Task: "Contract test for batch processing API in tests/contract/ma-batch-api.contract.test.ts"
Task: "Contract test for export API in tests/contract/ma-export-api.contract.test.ts"

# Launch analyzer services together (Phase 3.5):
Task: "Implement Financial Analyzer in lib/ma-prediction/analyzers/financial-analyzer.ts"
Task: "Implement Operational Analyzer in lib/ma-prediction/analyzers/operational-analyzer.ts"
Task: "Implement Market Analyzer in lib/ma-prediction/analyzers/market-analyzer.ts"
Task: "Implement Historical Pattern Matcher in lib/ma-prediction/analyzers/pattern-matcher.ts"

# Launch UI components together (Phase 3.9):
Task: "Create Prediction Score Badge in components/ma-prediction/prediction-score-badge.tsx"
Task: "Create Prediction Card in components/ma-prediction/prediction-card.tsx"
Task: "Create Factor List in components/ma-prediction/factor-list.tsx"
Task: "Create Valuation Range Display in components/ma-prediction/valuation-range.tsx"
Task: "Create Acquirer Profiles Table in components/ma-prediction/acquirer-profiles.tsx"
Task: "Create Prediction History Chart in components/ma-prediction/prediction-history.tsx"
Task: "Create Export Controls in components/ma-prediction/export-controls.tsx"
```

---

## Validation Checklist

*GATE: Verify before marking feature as complete*

- [x] All 3 contracts have corresponding tests (T010-T012)
- [x] All 7 entities have database schema (T004)
- [x] All contract tests come before API implementation (T010-T012 → T024-T035)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [ ] All tests pass (contract + E2E)
- [ ] Performance targets met (<5s p95 latency)
- [ ] Code review completed
- [ ] Deployed to production

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **TDD enforced**: Contract tests (T010-T012) MUST fail before implementation (T024-T035)
- **Database first**: T004-T008 MUST complete before any service/API work
- **Commit strategy**: Commit after each completed task
- **Avoid**: Vague tasks, modifying same file in parallel tasks, skipping tests

---

**Total Tasks**: 60
**Estimated Duration**: 2-3 weeks (1 developer, TDD workflow)
**Critical Path**: Setup → Database → Contract Tests → Services → APIs → UI → E2E → Deploy

**Status**: ✅ Tasks ready for execution. Proceed to implementation phase.
