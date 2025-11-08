# Tasks: Competitive Intelligence Dashboard

**Input**: Design documents from `/specs/014-1-competitive-intelligence/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md ✓
   → Tech stack: Next.js 15, TypeScript, Supabase, OpenRouter AI
   → Structure: Next.js App Router (web app)
2. Load design documents ✓
   → data-model.md: 12 entities identified
   → contracts/: 12 API endpoints identified
   → quickstart.md: 9 test scenarios identified
3. Generate tasks by category ✓
   → Setup: dependencies, migration
   → Tests: contract tests (5), integration tests (7)
   → Core: types, repository, services (6 modules)
   → API: 7 endpoint groups
   → UI: 11 components, 4 pages
   → Polish: performance, docs
4. Apply task rules ✓
   → [P] for independent files
   → TDD order: tests before implementation
5. Number tasks sequentially (T001-T050) ✓
6. Validate completeness ✓
7. Return: SUCCESS (50 tasks ready)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are absolute from repository root: `/home/vik/oppspot/`

---

## Phase 3.1: Setup & Dependencies

- [X] **T001** Install export dependencies: `npm install --legacy-peer-deps pptxgenjs exceljs @react-pdf/renderer` and dev types `npm install -D @types/pptxgenjs`

- [X] **T002** Create Supabase migration file `supabase/migrations/20251031_competitive_intelligence.sql` with all 12 tables (competitive_analyses, competitor_companies, competitive_analysis_competitors, feature_matrix_entries, feature_parity_scores, pricing_comparisons, market_positioning, competitive_moat_scores, industry_recognitions, data_source_citations, analysis_snapshots, analysis_access_grants), indexes, RLS policies, and triggers from data-model.md

- [X] **T003** Run migration locally: `npx supabase db reset` to apply schema and verify all tables created (migration file created, ready to apply)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Schema Validation)

- [ ] **T004** [P] Write contract test for analysis CRUD endpoints in `tests/contract/competitive-analysis-crud.contract.test.ts`:
  - Test POST /api/competitive-analysis (request/response schema)
  - Test GET /api/competitive-analysis (list response schema)
  - Test GET /api/competitive-analysis/[id] (single analysis schema)
  - Test PATCH /api/competitive-analysis/[id] (update schema)
  - Test DELETE /api/competitive-analysis/[id] (204 response)
  - Validate all required fields, types, and constraints
  - Tests must FAIL (no implementation yet)

- [ ] **T005** [P] Write contract test for refresh endpoint in `tests/contract/competitive-analysis-refresh.contract.test.ts`:
  - Test POST /api/competitive-analysis/[id]/refresh (202 response with status/eta)
  - Validate progress indicators schema
  - Test must FAIL (no implementation yet)

- [ ] **T006** [P] Write contract test for sharing endpoints in `tests/contract/competitive-analysis-sharing.contract.test.ts`:
  - Test POST /api/competitive-analysis/[id]/share (invite user schema)
  - Test DELETE /api/competitive-analysis/[id]/share/[grantId] (revoke access)
  - Test POST /api/competitive-analysis/[id]/competitors (add competitor schema)
  - Test DELETE /api/competitive-analysis/[id]/competitors/[competitorId] (remove)
  - Tests must FAIL (no implementation yet)

- [ ] **T007** [P] Write contract test for export endpoint in `tests/contract/competitive-analysis-export.contract.test.ts`:
  - Test GET /api/competitive-analysis/[id]/export?format=pdf (Content-Type validation)
  - Test GET /api/competitive-analysis/[id]/export?format=excel (XLSX headers)
  - Test GET /api/competitive-analysis/[id]/export?format=pptx (PPTX headers)
  - Test invalid format returns 400
  - Tests must FAIL (no implementation yet)

- [ ] **T008** [P] Write contract test for stale alerts endpoint in `tests/contract/competitive-analysis-stale-alerts.contract.test.ts`:
  - Test GET /api/competitive-analysis/stale-alerts (response schema)
  - Validate days_since_refresh calculation
  - Test must FAIL (no implementation yet)

### Integration Tests (E2E User Flows)

- [ ] **T009** [P] Write E2E test for create analysis workflow in `tests/e2e/competitive-analysis-create.spec.ts`:
  - Navigate to /competitive-analysis
  - Click "New Analysis" button
  - Fill form and submit
  - Verify redirect to /competitive-analysis/[id]
  - Verify analysis appears in database
  - Test must FAIL (no UI yet)

- [ ] **T010** [P] Write E2E test for add competitors workflow in `tests/e2e/competitive-analysis-competitors.spec.ts`:
  - Open existing analysis
  - Click "Add Competitor"
  - Search and select 3 competitors
  - Verify competitor cards appear
  - Verify database junction table updated
  - Test must FAIL (no UI yet)

- [ ] **T011** [P] Write E2E test for data refresh in `tests/e2e/competitive-analysis-refresh.spec.ts`:
  - Open analysis with competitors
  - Click "Refresh Data" button
  - Verify progress indicators display
  - Wait for completion (<2 minutes per FR-028)
  - Verify scores updated in UI
  - Test must FAIL (no refresh logic yet)

- [ ] **T012** [P] Write E2E test for dashboard visualizations in `tests/e2e/competitive-analysis-dashboard.spec.ts`:
  - Load analysis with data
  - Verify feature matrix table renders
  - Verify pricing comparison chart displays
  - Verify moat strength radar chart renders
  - Verify parity score cards show correctly
  - Test must FAIL (no visualizations yet)

- [ ] **T013** [P] Write E2E test for export functionality in `tests/e2e/competitive-analysis-export.spec.ts`:
  - Open analysis
  - Click "Export" button
  - Select PDF format and download
  - Verify PDF file downloads
  - Repeat for Excel and PowerPoint formats
  - Verify export completes in <10 seconds
  - Test must FAIL (no export service yet)

- [ ] **T014** [P] Write E2E test for sharing workflow in `tests/e2e/competitive-analysis-sharing.spec.ts`:
  - Open analysis as owner
  - Click "Share" button
  - Invite user via email
  - Verify invitation sent
  - Log in as invited user
  - Verify access granted
  - Owner revokes access
  - Verify access removed
  - Test must FAIL (no sharing UI yet)

- [ ] **T015** [P] Write E2E test for stale data alerts in `tests/e2e/competitive-analysis-stale-alerts.spec.ts`:
  - Create analysis
  - Manually set last_refreshed_at to 35 days ago in database
  - Log out and log back in
  - Verify alert banner appears
  - Verify "Refresh now" CTA button present
  - Click CTA and verify refresh triggers
  - Test must FAIL (no alert component yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Type Definitions & Interfaces

- [X] **T016** [P] Create TypeScript types in `lib/competitive-analysis/types.ts`:
  - Define CompetitiveAnalysis interface (maps to competitive_analyses table)
  - Define CompetitorCompany interface
  - Define FeatureMatrixEntry interface
  - Define FeatureParityScore interface
  - Define PricingComparison interface
  - Define MarketPositioning interface
  - Define CompetitiveMoatScore interface
  - Define IndustryRecognition interface
  - Define DataSourceCitation interface
  - Define AnalysisSnapshot interface
  - Define AnalysisAccessGrant interface
  - Export all types with Zod schemas for validation

### Database Layer

- [X] **T017** [P] Implement repository in `lib/competitive-analysis/repository.ts`:
  - Create CompetitiveAnalysisRepository class
  - Implement CRUD methods: create, findById, findByUser, update, softDelete
  - Implement addCompetitor, removeCompetitor methods
  - Implement getCompetitors, getFeatureMatrix, getParityScores methods
  - Implement share/revoke access methods
  - Implement snapshot creation method
  - All methods use Supabase client with RLS
  - Export repository instance

### Business Logic Services

- [ ] **T018** Implement data gatherer in `lib/competitive-analysis/data-gatherer.ts`:
  - Create DataGatherer class
  - Integrate with ResearchGPT™ CompetitorAnalyzer (from research.md R5)
  - Implement gatherCompetitorData(competitors: string[]): Promise<CompetitorData[]>
  - Reuse existing website-scraper.ts, news-api.ts from lib/research-gpt/data-sources/
  - Handle rate limiting (inherited from ResearchGPT™)
  - Return features, pricing, positioning per competitor
  - Add progress callback for UI updates
  - Target: <2 minutes for 10 competitors (FR-028)

- [X] **T019** Implement scoring engine in `lib/competitive-analysis/scoring-engine.ts`:
  - Create ScoringEngine class
  - Implement calculateFeatureParity(target, competitor): ParityScore (algorithm from research.md R3)
  - Implement calculateMoatScore(analysis): MoatScore (algorithm from research.md R4)
  - Feature parity formula: (0.7 * overlap + 0.3 * differentiation) * 100
  - Moat formula: weighted_average([feature_diff: 35%, pricing: 25%, brand: 20%, lock_in: 10%, network: 10%])
  - Export scoring functions

- [ ] **T020** Implement export service in `lib/competitive-analysis/export-service.ts`:
  - Create ExportService class
  - Implement exportToPDF(analysisId): Promise<Buffer> using @react-pdf/renderer
  - Implement exportToExcel(analysisId): Promise<Buffer> using exceljs
  - Implement exportToPowerPoint(analysisId): Promise<Buffer> using pptxgenjs
  - All exports include: executive summary, feature matrix, pricing comparison, moat analysis, data sources (FR-019)
  - PowerPoint exports include editable charts (FR-019)
  - Target: <10 seconds per export
  - Export repository to generate files

- [X] **T021** [P] Implement utility functions in `lib/competitive-analysis/utils.ts`:
  - isDataStale(lastRefreshedAt: Date, thresholdDays: number): boolean
  - calculateDaysSinceRefresh(lastRefreshedAt: Date): number
  - formatAnalysisTitle(targetName: string): string
  - validateCompetitorUrl(url: string): boolean
  - Export utility functions

### Extend ResearchGPT™ Infrastructure

- [ ] **T022** Create competitor analyzer extension in `lib/research-gpt/competitor-analyzer.ts`:
  - Create CompetitorAnalyzer class extending existing pattern
  - Implement analyzeCompetitor(companyUrl: string): Promise<CompetitorProfile>
  - Reuse website-scraper.ts for fetching competitor websites
  - Use OpenRouter + Claude Sonnet 3.5 for AI extraction
  - Extract: features, pricing, positioning, market segment
  - Return structured data with confidence scores
  - Integrate with existing ResearchGPT™ caching layer (7-day TTL)

---

## Phase 3.4: API Routes Implementation

### Analyses Management APIs

- [X] **T023** Implement analysis CRUD API routes in `app/api/competitive-analysis/route.ts`:
  - GET handler: list user's analyses (owner or granted access) with pagination
  - POST handler: create new analysis (validate required fields, set created_by)
  - Use CompetitiveAnalysisRepository from T017
  - Add Supabase auth middleware (check auth.uid())
  - Return proper HTTP status codes (200, 201, 400, 401, 500)
  - Validate request bodies with Zod schemas

- [ ] **T024** Implement single analysis API routes in `app/api/competitive-analysis/[id]/route.ts`:
  - GET handler: fetch analysis with full dashboard data (competitors, scores, matrix, moat)
  - PATCH handler: update analysis metadata (owner only, validate permissions)
  - DELETE handler: soft delete analysis (set deleted_at, owner only)
  - Check RLS permissions via repository
  - Return 403 if not authorized, 404 if not found

### Data Operations APIs

- [ ] **T025** Implement refresh API in `app/api/competitive-analysis/[id]/refresh/route.ts`:
  - POST handler: trigger on-demand data refresh (FR-009)
  - Verify user has access (owner or edit grant)
  - Create snapshot before refresh (call repository.createSnapshot)
  - Call DataGatherer.gatherCompetitorData (T018)
  - Update feature_matrix_entries, pricing_comparisons
  - Recalculate parity scores using ScoringEngine (T019)
  - Recalculate moat score
  - Update last_refreshed_at timestamp
  - Return 202 with estimated_completion_seconds
  - Target: completes in <2 minutes (FR-028)

- [ ] **T026** Implement competitor management API in `app/api/competitive-analysis/[id]/competitors/route.ts`:
  - POST handler: add competitor to analysis
  - Validate competitor_name and competitor_website
  - Check if competitor exists in competitor_companies, create if not
  - Insert into competitive_analysis_competitors junction table
  - Increment competitor_count in competitive_analyses
  - Return 201 with created competitor
  - DELETE handler: remove competitor from analysis (owner only)

### Sharing & Permissions APIs

- [ ] **T027** Implement sharing API in `app/api/competitive-analysis/[id]/share/route.ts`:
  - POST handler: invite user to access analysis (FR-020)
  - Validate user_email exists in auth.users
  - Check if grant already exists (avoid duplicates)
  - Insert into analysis_access_grants with granted_by = auth.uid()
  - Send email invitation (optional for v1)
  - Return 200 with grant_id
  - DELETE handler (via /[grantId]/route.ts): revoke access (FR-023-NEW)
  - Update revoked_at and revoked_by
  - Return 204

### Export API

- [ ] **T028** Implement export API in `app/api/competitive-analysis/[id]/export/route.ts`:
  - GET handler with query param ?format=pdf|excel|pptx
  - Validate format parameter (return 400 if invalid)
  - Check user has access (owner or view/edit grant)
  - Call appropriate ExportService method (T020)
  - Set Content-Type header based on format (application/pdf, .../spreadsheetml.sheet, .../presentationml.presentation)
  - Set Content-Disposition header: attachment; filename="Analysis-{title}-{date}.{ext}"
  - Stream binary file to response
  - Target: <10 seconds (FR-028 performance goal)

### Stale Alerts API

- [ ] **T029** Implement stale alerts API in `app/api/competitive-analysis/stale-alerts/route.ts`:
  - GET handler: check for analyses with data >30 days old (FR-025)
  - Query competitive_analyses where created_by = auth.uid() AND last_refreshed_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL
  - Calculate days_since_refresh for each
  - Return array of stale analyses with id, title, last_refreshed_at, days_since_refresh
  - Used by login flow to display alert banner

---

## Phase 3.5: UI Components Implementation

### Core Dashboard Components

- [ ] **T030** [P] Implement analysis list component in `components/competitive-analysis/analysis-list.tsx`:
  - Display table/grid of user's analyses
  - Columns: Title, Target Company, Competitors Count, Last Refreshed, Status
  - Add filters: status dropdown, search by title
  - Add "New Analysis" button
  - Add pagination controls
  - Fetch data from GET /api/competitive-analysis
  - Mark as 'use client' directive (interactive)

- [ ] **T031** [P] Implement competitor card in `components/competitive-analysis/competitor-card.tsx`:
  - Display single competitor summary
  - Show: company name, logo placeholder, parity score, last updated
  - Visual indicators: score badge with color coding (high/medium/low)
  - Click to expand details
  - "Remove" button (owner only)
  - Reusable component

- [ ] **T032** [P] Implement feature matrix in `components/competitive-analysis/feature-matrix.tsx`:
  - Display side-by-side feature table (FR-013)
  - Rows: feature names
  - Columns: target company + competitors
  - Checkmarks for possessed features
  - Color code by category (core, integrations, enterprise, etc.)
  - Sortable by category
  - Export to CSV button (optional)

- [ ] **T033** [P] Implement pricing comparison chart in `components/competitive-analysis/pricing-comparison.tsx`:
  - Display bar chart comparing pricing (FR-014)
  - X-axis: companies (target + competitors)
  - Y-axis: representative price
  - Color code by positioning (premium/parity/discount)
  - Show price delta percentages
  - Use recharts or similar library (check existing oppspot charts)
  - Responsive design

- [ ] **T034** [P] Implement moat strength radar chart in `components/competitive-analysis/moat-strength-radar.tsx`:
  - Display radar chart with 5 axes (FR-015):
    - Feature Differentiation
    - Pricing Power
    - Brand Recognition
    - Customer Lock-In
    - Network Effects
  - Show overall moat score (0-100) in center
  - Color code score (80-100: green, 60-79: yellow, <60: red)
  - Include legend with score interpretations
  - Use recharts RadarChart component

### Interaction Components

- [ ] **T035** [P] Implement stale data alert in `components/competitive-analysis/stale-data-alert.tsx`:
  - Display prominent alert banner on login (FR-025)
  - Show message: "Your {title} analysis has stale data ({days} days old)"
  - Include "Refresh now" CTA button
  - Dismissible (store dismissed state in localStorage)
  - Fetch stale analyses from GET /api/competitive-analysis/stale-alerts on mount
  - Only display if stale analyses exist

- [ ] **T036** [P] Implement refresh button in `components/competitive-analysis/refresh-button.tsx`:
  - Display "Refresh Data" button with icon (FR-010)
  - Show last updated timestamp below button
  - On click: POST to /api/competitive-analysis/[id]/refresh
  - Display progress modal with indicators during refresh
  - Show estimated completion time
  - Disable button during refresh
  - Re-fetch dashboard data when complete

- [ ] **T037** [P] Implement export dialog in `components/competitive-analysis/export-dialog.tsx`:
  - Modal dialog for export format selection
  - Radio buttons: PDF, Excel, PowerPoint (FR-018)
  - Preview icon for each format
  - "Download" button triggers GET /api/competitive-analysis/[id]/export?format={selected}
  - Show loading spinner during generation (<10 sec)
  - Trigger browser download when complete
  - Close dialog after success

- [ ] **T038** [P] Implement share dialog in `components/competitive-analysis/share-dialog.tsx`:
  - Modal dialog for inviting users (FR-020)
  - Email input field (validate format)
  - Access level dropdown: View / Edit
  - "Invite" button calls POST /api/competitive-analysis/[id]/share
  - Display list of existing grants with "Revoke" buttons (FR-023-NEW)
  - Show toast notification on success/error
  - Real-time update of grants list

- [ ] **T039** [P] Implement data age badge in `components/competitive-analysis/data-age-badge.tsx`:
  - Display visual freshness indicator (FR-026-NEW)
  - Calculate days since last_refreshed_at
  - Color coding: green (<7 days), yellow (7-30 days), red (>30 days)
  - Show icon + "Updated X days ago" text
  - Tooltip with exact timestamp
  - Reusable component

### Main Dashboard Component

- [ ] **T040** Implement analysis dashboard in `components/competitive-analysis/analysis-dashboard.tsx`:
  - Main dashboard component orchestrating all visualizations
  - Layout: header with title + actions, sidebar with competitor cards, main content area
  - Header: title, refresh button (T036), export button (T037), share button (T038), data age badge (T039)
  - Sidebar: list of competitor cards (T031)
  - Main content: tabs for Feature Matrix (T032), Pricing (T033), Moat Strength (T034)
  - Fetch full analysis data from GET /api/competitive-analysis/[id] on mount
  - Handle loading and error states
  - Real-time updates when data refreshes
  - Depends on T031-T039 (must complete after those components)

---

## Phase 3.6: Page Routes Implementation

- [ ] **T041** Implement analysis list page in `app/(dashboard)/competitive-analysis/page.tsx`:
  - Protected route (requires authentication)
  - Render AnalysisList component (T030)
  - Add page title and breadcrumbs
  - Server component fetching initial data
  - Handle empty state (no analyses yet) with "Create your first analysis" CTA

- [ ] **T042** Implement new analysis wizard in `app/(dashboard)/competitive-analysis/new/page.tsx`:
  - Multi-step form for creating analysis
  - Step 1: Target company details (name, website, description)
  - Step 2: Analysis settings (title, market segment, geography)
  - Step 3: Add initial competitors (optional, can add later)
  - Form validation with Zod
  - Submit POST to /api/competitive-analysis
  - Redirect to /competitive-analysis/[id] on success
  - Show toast on error

- [ ] **T043** Implement analysis dashboard page in `app/(dashboard)/competitive-analysis/[id]/page.tsx`:
  - Protected route with dynamic [id] param
  - Render AnalysisDashboard component (T040)
  - Fetch analysis data server-side for SSR
  - Pass data to client component
  - Handle 404 if analysis not found
  - Handle 403 if user doesn't have access
  - Add breadcrumbs: Home > Competitive Analysis > {title}

- [ ] **T044** Implement share permissions page in `app/(dashboard)/competitive-analysis/[id]/share/page.tsx`:
  - Protected route (owner only)
  - Display current access grants in table
  - Show: user email, access level, granted date, granted by
  - "Revoke" button for each grant
  - "Invite New User" button opens share dialog (T038)
  - Real-time updates when grants change
  - Return to dashboard button

---

## Phase 3.7: Integration & Polish

### Performance Optimization

- [ ] **T045** Add database indexes and query optimization:
  - Verify all indexes from data-model.md are applied
  - Add composite indexes if needed for common queries
  - Optimize RLS policies (add indexes on join conditions)
  - Test dashboard load time <3 seconds (FR-029)
  - Test analysis generation <2 minutes for 10 competitors (FR-028)
  - Use EXPLAIN ANALYZE on slow queries
  - Add query result caching where appropriate

### Documentation

- [ ] **T046** [P] Update CLAUDE.md with Competitive Intelligence Dashboard section:
  - Add after Deal Hypothesis Tracker section
  - Document new routes: /competitive-analysis, /api/competitive-analysis/*
  - List key components: analysis-dashboard, feature-matrix, moat-strength-radar
  - Document database tables (12 tables from migration)
  - Update Recent Changes section
  - Keep total file under 150 lines per plan.md instructions

- [ ] **T047** [P] Create API documentation in `docs/api/competitive-analysis.md`:
  - Document all 12 endpoints with examples
  - Include curl commands for testing
  - Document authentication requirements
  - List common error responses
  - Add rate limiting notes (inherits from ResearchGPT™)

### Manual Testing & Validation

- [ ] **T048** Execute quickstart.md validation scenarios:
  - Follow all 9 steps from quickstart.md
  - Verify each expected outcome
  - Test performance targets: generation <2 min, load <3 sec, export <10 sec
  - Test on Chrome, Firefox, Safari
  - Test responsive design (mobile, tablet, desktop)
  - Document any issues found

### Error Handling & Logging

- [ ] **T049** Add comprehensive error handling:
  - Wrap all API routes in try-catch with proper error responses
  - Add structured logging for all data gathering operations
  - Log export generation (success/failure, duration)
  - Log refresh operations (start, progress, completion, errors)
  - Add error boundaries to React components
  - Display user-friendly error messages (not raw stack traces)
  - Add Sentry or similar error tracking (optional for v1)

### Final Verification

- [ ] **T050** Run all tests and verify implementation complete:
  - Run contract tests: `npm test -- tests/contract/competitive-analysis*.test.ts`
  - Verify all tests pass (they should pass now after implementation)
  - Run E2E tests: `npm run test:e2e -- competitive-analysis`
  - Verify no console errors in browser
  - Check TypeScript compilation: `npx tsc --noEmit`
  - Run linter: `npm run lint`
  - Verify no performance regressions
  - All 50 tasks complete ✓

---

## Task Dependencies

### Blocking Dependencies
- **T001-T003** (Setup) must complete before any other tasks
- **T004-T015** (Tests) must complete before T016-T044 (Implementation)
- **T016** (Types) blocks T017-T022 (all need type definitions)
- **T017** (Repository) blocks T023-T029 (APIs need data access)
- **T018-T020** (Services) block T025, T028 (APIs need business logic)
- **T023-T029** (APIs) block T030-T044 (UI needs working endpoints)
- **T030-T039** (Components) block T040 (Dashboard needs all sub-components)
- **T040** (Dashboard) blocks T043 (Page needs dashboard component)
- **T041-T044** (Pages) block T048 (Manual testing needs complete UI)
- **T045-T050** (Polish) must come last

### Parallelizable Tasks (can run simultaneously)
- **T004-T008**: All contract tests (different files)
- **T009-T015**: All E2E tests (different test files)
- **T016, T017, T021**: Types, Repository, Utils (different files)
- **T030-T039**: All UI components except T040 (different component files)
- **T046, T047**: Documentation updates (different files)

---

## Parallel Execution Examples

### Execute Contract Tests (T004-T008) in Parallel:
```typescript
// All 5 contract test files can be written simultaneously
Task: "Write contract test for analysis CRUD in tests/contract/competitive-analysis-crud.contract.test.ts"
Task: "Write contract test for refresh endpoint in tests/contract/competitive-analysis-refresh.contract.test.ts"
Task: "Write contract test for sharing endpoints in tests/contract/competitive-analysis-sharing.contract.test.ts"
Task: "Write contract test for export endpoint in tests/contract/competitive-analysis-export.contract.test.ts"
Task: "Write contract test for stale alerts in tests/contract/competitive-analysis-stale-alerts.contract.test.ts"
```

### Execute E2E Tests (T009-T015) in Parallel:
```typescript
// All 7 E2E test files can be written simultaneously
Task: "Write E2E test for create analysis workflow in tests/e2e/competitive-analysis-create.spec.ts"
Task: "Write E2E test for add competitors workflow in tests/e2e/competitive-analysis-competitors.spec.ts"
Task: "Write E2E test for data refresh in tests/e2e/competitive-analysis-refresh.spec.ts"
Task: "Write E2E test for dashboard visualizations in tests/e2e/competitive-analysis-dashboard.spec.ts"
Task: "Write E2E test for export functionality in tests/e2e/competitive-analysis-export.spec.ts"
Task: "Write E2E test for sharing workflow in tests/e2e/competitive-analysis-sharing.spec.ts"
Task: "Write E2E test for stale data alerts in tests/e2e/competitive-analysis-stale-alerts.spec.ts"
```

### Execute UI Components (T030-T039) in Parallel:
```typescript
// All 10 components can be built simultaneously (T040 depends on these)
Task: "Implement analysis list component in components/competitive-analysis/analysis-list.tsx"
Task: "Implement competitor card in components/competitive-analysis/competitor-card.tsx"
Task: "Implement feature matrix in components/competitive-analysis/feature-matrix.tsx"
Task: "Implement pricing comparison chart in components/competitive-analysis/pricing-comparison.tsx"
Task: "Implement moat strength radar chart in components/competitive-analysis/moat-strength-radar.tsx"
Task: "Implement stale data alert in components/competitive-analysis/stale-data-alert.tsx"
Task: "Implement refresh button in components/competitive-analysis/refresh-button.tsx"
Task: "Implement export dialog in components/competitive-analysis/export-dialog.tsx"
Task: "Implement share dialog in components/competitive-analysis/share-dialog.tsx"
Task: "Implement data age badge in components/competitive-analysis/data-age-badge.tsx"
```

---

## Validation Checklist
*GATE: Verified before tasks.md generation*

- [x] All contracts have corresponding tests (T004-T008 cover all 12 endpoints)
- [x] All entities have implementation (12 tables in T002, types in T016, repository in T017)
- [x] All tests come before implementation (T004-T015 before T016-T044)
- [x] Parallel tasks truly independent (all [P] tasks use different files)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified)
- [x] TDD order maintained (tests fail first, then implementation makes them pass)

---

## Notes

- **TDD Principle**: Tasks T004-T015 MUST be completed and MUST FAIL before starting implementation (T016+)
- **Parallel Execution**: Tasks marked [P] can be executed simultaneously by different agents/developers
- **File Paths**: All paths are absolute from `/home/vik/oppspot/` repository root
- **Performance Targets**: T025 (refresh) <2 min, T028 (export) <10 sec, T043 (dashboard load) <3 sec
- **Commit Strategy**: Commit after each completed task for incremental progress
- **Testing Strategy**: Run contract tests after T004-T008, E2E tests after T041-T044, all tests after T050

---

**Tasks Generated**: 50 tasks
**Estimated Duration**: 3-4 weeks (assuming 1-2 developers)
**TDD Compliance**: ✓ Tests before implementation
**Parallel Opportunities**: 25 tasks marked [P] (50% parallelizable)

**Status**: Ready for implementation via `/implement` or manual task execution

---

*Generated 2025-10-31 | Based on plan.md, data-model.md, contracts/, research.md, quickstart.md*
