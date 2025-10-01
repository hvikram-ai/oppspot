# Tasks: ResearchGPT™ - Deep Company Intelligence

**Feature**: ResearchGPT™ - AI-powered company research in <30 seconds
**Branch**: `003-researchgpt™-deep-company`
**Input**: Design documents from `/home/vik/oppspot/specs/003-researchgpt™-deep-company/`

---

## Execution Flow Summary

This document contains **52 implementation tasks** organized into 6 phases:
1. **Setup & Foundation** (T001-T006): Database, types, dependencies
2. **Tests First (TDD)** (T007-T016): Contract & integration tests (MUST FAIL before implementation)
3. **Data Layer** (T017-T022): Data source integrations
4. **Service Layer** (T023-T028): AI analyzers and orchestration
5. **API & UI** (T029-T046): Endpoints and React components
6. **Polish & Validation** (T047-T052): E2E tests, performance, GDPR compliance

**Estimated Total Time**: 40-50 hours
**Parallel Execution**: ~20 tasks marked [P] can run concurrently

---

## Path Conventions

Based on Next.js 15 App Router structure:
- **API Routes**: `/home/vik/oppspot/app/api/research/`
- **Components**: `/home/vik/oppspot/components/research/`
- **Services**: `/home/vik/oppspot/lib/research-gpt/`
- **Database**: `/home/vik/oppspot/supabase/migrations/`
- **Tests**: `/home/vik/oppspot/tests/e2e/`
- **Types**: `/home/vik/oppspot/types/`

---

## Phase 3.1: Setup & Foundation

### T001: ✅ Create Database Migration
**Type**: Database
**Time**: 45 minutes
**Dependencies**: None
**Files Created**:
- `/home/vik/oppspot/supabase/migrations/20251001000000_research_gpt_schema.sql`

**Description**:
Create PostgreSQL migration with all ResearchGPT tables from data-model.md:
1. `research_reports` table (13 columns, status enum, metadata jsonb)
2. `research_sections` table (10 columns, section_type enum, content jsonb)
3. `research_sources` table (9 columns, source_type enum)
4. `user_research_quotas` table (8 columns)
5. All indexes (12 total) for performance
6. RLS policies for multi-tenant isolation
7. Triggers for cache invalidation
8. Function for quota enforcement

**Acceptance Criteria**:
- Migration applies cleanly: `supabase db push`
- All 4 tables created with correct schema
- RLS policies enforce user_id isolation
- Indexes created for all foreign keys
- Verify with: `supabase db list-tables | grep research`

---

### T002: ✅ [P] Create TypeScript Type Definitions
**Type**: Types
**Time**: 30 minutes
**Dependencies**: None
**Files Created**:
- `/home/vik/oppspot/types/research-gpt.ts`

**Description**:
Create TypeScript interfaces for all 9 entities from data-model.md:
1. `ResearchReport` interface
2. `ResearchSection` interface
3. `CompanySnapshot` interface
4. `BuyingSignal` interface with union type for details
5. `DecisionMaker` interface
6. `RevenueSignal` interface
7. `RecommendedApproach` interface
8. `Source` interface
9. `UserResearchQuota` interface
10. All enum types (ReportStatus, SectionType, SignalType, ConfidenceLevel, etc.)

**Acceptance Criteria**:
- All interfaces match data-model.md exactly
- No `any` types used
- Enum types for all constrained strings
- Exported from file for reuse
- TypeScript compiles without errors: `npm run build`

---

### T003: ✅ [P] Create Zod Validation Schemas
**Type**: Validation
**Time**: 45 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/validation/schemas.ts`

**Description**:
Create Zod runtime validation schemas matching TypeScript types:
1. `researchReportSchema` with nested section validation
2. `buyingSignalSchema` with discriminated union for details
3. `decisionMakerSchema` with GDPR field validation
4. `revenueSignalSchema`
5. `recommendedApproachSchema`
6. Request/response schemas for API endpoints

**Acceptance Criteria**:
- Schemas validate example data from data-model.md
- Error messages are user-friendly
- GDPR rules enforced (no personal emails)
- Use `.safeParse()` for testing
- All tests pass

---

### T004: ✅ [P] Install Required Dependencies
**Type**: Setup
**Time**: 15 minutes
**Dependencies**: None
**Files Modified**:
- `/home/vik/oppspot/package.json`

**Description**:
Add new npm packages for ResearchGPT:
```bash
npm install --legacy-peer-deps \
  cheerio \           # Website scraping
  newsapi \           # News API client
  pdf-lib \           # PDF generation
  react-markdown \    # Markdown rendering
  remark-gfm          # GitHub Flavored Markdown
```

**Acceptance Criteria**:
- All packages installed successfully
- No peer dependency errors
- `package-lock.json` updated
- Dev server still runs: `npm run dev`

---

### T005: ✅ [P] Create Environment Variables Template
**Type**: Configuration
**Time**: 10 minutes
**Dependencies**: None
**Files Created**:
- `/home/vik/oppspot/.env.example`

**Description**:
Add required environment variables to `.env.example`:
```bash
# ResearchGPT API Keys
NEWS_API_KEY=your_newsapi_key_here
COMPANIES_HOUSE_API_KEY=your_companies_house_key_here

# Optional
REED_API_KEY=your_reed_jobs_api_key_here
```

Update project documentation with API key signup instructions.

**Acceptance Criteria**:
- `.env.example` updated
- Instructions in CLAUDE.md
- No secrets committed to git

---

### T006: ✅ [P] Create Smart Cache Manager Utility
**Type**: Utility
**Time**: 30 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/cache/smart-cache-manager.ts`

**Description**:
Implement smart caching logic with differential TTLs:
- Helper functions to calculate cache expiration (7d for snapshot, 6h for signals)
- Cache lookup by company_id and section_type
- Cache invalidation helpers
- Cache hit/miss tracking for metrics

**Acceptance Criteria**:
- `getCacheExpiration(sectionType)` returns correct TTL
- `isCacheValid(cachedAt, expiresAt)` checks expiration
- `invalidateCache(companyId)` marks all sections as expired
- Unit tests pass

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: All tests in this phase MUST be written and MUST FAIL before ANY implementation tasks (T017+) begin.

### T007: [P] Contract Test: POST /api/research/[companyId]
**Type**: Test (Contract)
**Time**: 30 minutes
**Dependencies**: T002, T003
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-api-post.spec.ts`

**Description**:
Write Playwright test for research generation endpoint:
1. POST to `/api/research/mock-monzo` with auth
2. Assert 202 response
3. Assert response schema: `{ report_id, status: 'pending', estimated_completion_seconds }`
4. Assert database: new row in `research_reports` with status='pending'
5. Test quota check: Set quota to 100, assert 403 response
6. Test invalid company: Assert 404 response

**Acceptance Criteria**:
- Test FAILS (endpoint doesn't exist yet)
- All assertions based on contracts/research-api.yaml
- Uses demo user for auth
- Verifies database state changes

---

### T008: [P] Contract Test: GET /api/research/[companyId]
**Type**: Test (Contract)
**Time**: 20 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-api-get.spec.ts`

**Description**:
Write test for fetching research report:
1. GET `/api/research/mock-monzo` with auth
2. If status='complete': Assert 200 with full report structure
3. If status='generating': Assert 202 with progress
4. Assert all 6 sections present when complete
5. Assert confidence_score >= 0.5
6. Assert sources count >= 10

**Acceptance Criteria**:
- Test FAILS (endpoint doesn't exist)
- Validates full response schema from OpenAPI spec
- Tests both cached and fresh report scenarios

---

### T009: [P] Contract Test: GET /api/research/[companyId]/status
**Type**: Test (Contract)
**Time**: 15 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-api-status.spec.ts`

**Description**:
Write test for status polling endpoint:
1. GET `/api/research/[companyId]/status`
2. Assert response: `{ report_id, status, progress: { current_step, percent_complete, sections_complete } }`
3. Test all status values: pending, generating, complete, partial, failed

**Acceptance Criteria**:
- Test FAILS
- Progress updates tracked correctly
- Status transitions validated

---

### T010: [P] Contract Test: GET /api/research/quota
**Type**: Test (Contract)
**Time**: 15 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-quota.spec.ts`

**Description**:
Write test for quota endpoint:
1. GET `/api/research/quota`
2. Assert response: `{ researches_used, researches_limit, researches_remaining, period_start, period_end }`
3. Verify quota decrements after research generation
4. Test monthly reset logic

**Acceptance Criteria**:
- Test FAILS
- Quota calculations correct
- Period boundaries validated

---

### T011: [P] Integration Test: Happy Path (Generate Research)
**Type**: Test (Integration)
**Time**: 45 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-happy-path.spec.ts`

**Description**:
Full user journey test from quickstart.md:
1. Login as demo user
2. Navigate to `/business/mock-monzo`
3. Click "Research with AI" button
4. Verify quota displayed
5. Click "Generate Research"
6. Wait for progress bar (max 35s timeout)
7. Verify all 6 sections display
8. Verify sources section has 10+ sources
9. Click "Export PDF" and verify download

**Acceptance Criteria**:
- Test FAILS (UI doesn't exist)
- Follows exact steps from quickstart.md
- Uses page object pattern for maintainability
- Screenshots on failure

---

### T012: [P] Integration Test: Cached Report
**Type**: Test (Integration)
**Time**: 20 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-cached.spec.ts`

**Description**:
Test smart caching behavior:
1. Generate research for company (from T011)
2. Navigate away and back
3. Click "Research with AI" again
4. Verify "Cached research available" message
5. Click "View cached report"
6. Assert loads in <2 seconds
7. Verify cache age displayed: "Data as of X minutes ago"

**Acceptance Criteria**:
- Test FAILS
- Cache hit tracked in database metadata
- No duplicate API calls to external services

---

### T013: [P] Integration Test: Force Refresh
**Type**: Test (Integration)
**Time**: 20 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-force-refresh.spec.ts`

**Description**:
Test cache bypass functionality:
1. View cached report
2. Click "Force Refresh" button
3. Confirm dialog
4. Verify new research generation starts
5. Verify quota decremented
6. Verify new report_id created (not reusing old one)

**Acceptance Criteria**:
- Test FAILS
- Force refresh query parameter tested: `?force_refresh=true`
- User confirmation required before consuming quota

---

### T014: [P] Integration Test: Quota Exceeded
**Type**: Test (Integration)
**Time**: 20 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-quota-exceeded.spec.ts`

**Description**:
Test quota limit enforcement:
1. Set user quota to 100/100 via database
2. Navigate to business profile
3. Click "Research with AI"
4. Verify error: "Monthly research quota exceeded"
5. Verify "Generate Research" button disabled
6. Verify "Upgrade Plan" link displayed

**Acceptance Criteria**:
- Test FAILS
- 403 response when quota exceeded
- Clear upgrade path shown to user

---

### T015: [P] Integration Test: Invalid Company
**Type**: Test (Integration)
**Time**: 15 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-invalid-company.spec.ts`

**Description**:
Test error handling for invalid companies:
1. Navigate to `/business/invalid-uuid-here`
2. Verify 404 page or error message
3. Try to generate research for non-existent company
4. Assert 404 response with helpful error message

**Acceptance Criteria**:
- Test FAILS
- Graceful error handling
- User-friendly error messages

---

### T016: [P] Integration Test: GDPR Compliance
**Type**: Test (Integration)
**Time**: 30 minutes
**Dependencies**: T002
**Files Created**:
- `/home/vik/oppspot/tests/e2e/research-gdpr.spec.ts`

**Description**:
Validate GDPR compliance from NFR-006, NFR-007, NFR-008:
1. Generate research report
2. Check decision makers section
3. Assert no personal emails (only business emails)
4. Assert contact_source field present
5. Assert no LinkedIn scraping (only profile URLs)
6. Verify removal request form accessible
7. Test 6-month anonymization (mock date)

**Acceptance Criteria**:
- Test FAILS
- GDPR rules enforced in code
- Removal mechanism tested
- Personal data properly attributed

---

## Phase 3.3: Data Layer (ONLY after tests T007-T016 are failing)

### T017: [P] Companies House Data Source
**Type**: Service (Data Source)
**Time**: 1 hour
**Dependencies**: T002, T006, Tests failing
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/data-sources/companies-house-source.ts`

**Description**:
Implement Companies House API integration:
1. Extend existing `/lib/services/companies-house.ts`
2. Fetch company profile (already implemented)
3. Add: Fetch officers (directors)
4. Add: Fetch filing history
5. Add: Fetch company charges
6. Rate limit handling: 600 req/5min
7. Error handling with retries
8. Cache responses using SmartCacheManager

**Acceptance Criteria**:
- Respects API rate limits
- Returns structured CompanySnapshot data
- Handles API errors gracefully (404, 429, 500)
- Unit tests for rate limiting

---

### T018: [P] News API Data Source
**Type**: Service (Data Source)
**Time**: 1 hour
**Dependencies**: T002, T004
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/data-sources/news-source.ts`

**Description**:
Implement News API integration for press releases:
1. Use newsapi npm package
2. Search for company name + funding/expansion/revenue keywords
3. Filter by date (last 90 days)
4. Extract: title, URL, published_date, source
5. Rate limit: 100 requests/day (free) or 1000/day (paid)
6. Map to BuyingSignal and RevenueSignal formats

**Acceptance Criteria**:
- Returns array of press releases
- Filters irrelevant news
- Handles API quota errors gracefully
- Confidence scoring based on source reliability

---

### T019: [P] Job Board Scraper (Reed.co.uk)
**Type**: Service (Data Source)
**Time**: 1.5 hours
**Dependencies**: T002, T004
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/data-sources/jobs-source.ts`

**Description**:
Implement job board scraping for hiring signals:
1. Use Reed.co.uk API (free tier)
2. Search for jobs by company name
3. Extract: job_title, department, seniority_level, posted_date
4. Aggregate by department for insights
5. Detect tech stack from job requirements
6. Map to HiringSignal format

**Acceptance Criteria**:
- Returns hiring signals with department breakdown
- Detects technology requirements
- Respects robots.txt
- Graceful degradation if API unavailable

---

### T020: [P] Website Scraper
**Type**: Service (Data Source)
**Time**: 1.5 hours
**Dependencies**: T002, T004
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/data-sources/website-scraper.ts`

**Description**:
Implement company website scraping:
1. Use Cheerio for HTML parsing
2. Scrape /about, /team, /contact pages
3. Extract: company description, team member names/titles
4. Extract: business email/phone from contact page
5. Respect robots.txt
6. Timeout after 10 seconds per page
7. Map to DecisionMaker and contact info

**Acceptance Criteria**:
- Respects robots.txt directives
- Handles malformed HTML gracefully
- Only extracts GDPR-compliant contact info
- User-agent identifies as oppSpot

---

### T021: [P] Data Source Factory
**Type**: Service (Factory)
**Time**: 30 minutes
**Dependencies**: T017, T018, T019, T020
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/data-sources/data-source-factory.ts`

**Description**:
Create factory to orchestrate all data sources:
1. Initialize all data sources
2. Parallel fetch from all sources
3. Aggregate results
4. Handle partial failures (some sources down)
5. Return combined data with source attribution

**Acceptance Criteria**:
- Fetches from all sources concurrently
- Continues if 1-2 sources fail
- Tracks which sources succeeded/failed
- Returns within 15 seconds for 95% of requests

---

### T022: Database Repository Layer
**Type**: Service (Repository)
**Time**: 1 hour
**Dependencies**: T001, T002
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/repository/research-repository.ts`

**Description**:
Create database access layer for research entities:
1. `createResearchReport()` - Insert new report
2. `getResearchReport(companyId, userId)` - Fetch with RLS
3. `updateReportStatus(reportId, status)` - Update state
4. `saveSections(reportId, sections[])` - Bulk insert sections
5. `getCachedReport(companyId)` - Check cache validity
6. `incrementQuota(userId)` - Update quota usage
7. `getQuota(userId)` - Fetch current quota

**Acceptance Criteria**:
- All queries use Supabase client
- RLS policies enforced (user can only see own reports)
- Error handling for constraint violations
- Transactions for atomic updates

---

## Phase 3.4: Service Layer (AI Analyzers)

### T023: [P] Company Snapshot Analyzer
**Type**: Service (Analyzer)
**Time**: 1 hour
**Dependencies**: T002, T021
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/analyzers/snapshot-analyzer.ts`

**Description**:
Analyze company fundamentals (FR-006 to FR-010):
1. Process Companies House data → founding year, type, status
2. Estimate employee count from officers + LinkedIn hints
3. Calculate YoY growth if historical data available
4. Extract funding rounds from news sources
5. Detect tech stack from job postings
6. Return CompanySnapshot interface

**Acceptance Criteria**:
- All FR-006 to FR-010 requirements met
- Confidence scoring based on data availability
- Handles missing data gracefully
- Returns valid CompanySnapshot object

---

### T024: [P] Buying Signals Analyzer
**Type**: Service (Analyzer)
**Time**: 1.5 hours
**Dependencies**: T002, T021
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/analyzers/signals-analyzer.ts`

**Description**:
Detect buying signals (FR-011 to FR-016):
1. Hiring signals from job postings (count, departments)
2. Expansion signals from news (new offices, market entry)
3. Leadership signals from news (C-level hires/departures)
4. Tech change signals from job requirements
5. Priority scoring: HIGH/MEDIUM/LOW based on recency and volume
6. Return BuyingSignal[] array

**Acceptance Criteria**:
- All FR-011 to FR-016 requirements met
- Signals prioritized correctly
- Recency considered (30-day threshold for HIGH)
- Source attribution for each signal

---

### T025: [P] Decision Maker Analyzer
**Type**: Service (Analyzer)
**Time**: 1.5 hours
**Dependencies**: T002, T021
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/analyzers/decision-maker-analyzer.ts`

**Description**:
Identify key decision makers (FR-017 to FR-021):
1. Extract from Companies House officers
2. Supplement from website team pages
3. Identify top 3-5 based on relevance to sales
4. LinkedIn profile URL detection (no scraping)
5. Business email/phone ONLY from official sources
6. GDPR compliance: source attribution required
7. Champion identification heuristics
8. Return DecisionMaker[] array

**Acceptance Criteria**:
- FR-017 to FR-021 requirements met
- GDPR-compliant (FR-021a, FR-021b, FR-021c)
- No personal data from LinkedIn
- Contact source always attributed

---

### T026: [P] Revenue Signals Analyzer
**Type**: Service (Analyzer)
**Time**: 1 hour
**Dependencies**: T002, T021
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/analyzers/revenue-analyzer.ts`

**Description**:
Analyze financial performance (FR-022 to FR-025):
1. Extract from Companies House accounts if public
2. Parse press releases for revenue announcements
3. Customer growth mentions from news
4. Market share / competitive position from industry reports
5. Confidence scoring based on source type
6. Return RevenueSignal[] array

**Acceptance Criteria**:
- FR-022 to FR-025 requirements met
- Handles missing financial data gracefully
- Confidence based on source reliability
- Benchmark comparison if data available (FR-024)

---

### T027: AI Recommendation Generator
**Type**: Service (AI)
**Time**: 2 hours
**Dependencies**: T002, T023, T024, T025, T026
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/analyzers/recommendation-generator.ts`

**Description**:
Generate personalized outreach strategy using OpenRouter AI (FR-026 to FR-029):
1. Use existing `/lib/ai/openrouter.ts` client
2. Prompt: Synthesize all signals + decision makers → recommendations
3. Select best contact person from DecisionMaker[] with rationale
4. Generate approach summary (2-3 paragraphs)
5. Key talking points (3-5 bullets)
6. Timing suggestion based on signal urgency
7. Conversation starters referencing specific signals
8. Return RecommendedApproach object

**Acceptance Criteria**:
- FR-026 to FR-029 requirements met
- Uses GPT-4 via OpenRouter
- Recommendations reference actual signals from report
- Timing aligned with signal recency
- Handles AI API timeout gracefully

---

### T028: ResearchGPT Orchestration Service
**Type**: Service (Orchestrator)
**Time**: 2 hours
**Dependencies**: T022, T023, T024, T025, T026, T027
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/research-gpt-service.ts`

**Description**:
Main service that orchestrates entire research generation:
1. Check user quota (fail fast if exceeded)
2. Check cache (return if valid, unless force_refresh)
3. Fetch data from all sources (parallel)
4. Generate 6 sections (parallel where possible):
   - Snapshot (blocks nothing)
   - Buying Signals (independent)
   - Decision Makers (independent)
   - Revenue Signals (independent)
   - Recommended Approach (needs Signals + Decision Makers)
   - Sources (aggregate from all)
5. Save to database with proper cache TTLs
6. Update quota
7. Return complete ResearchReport
8. Target: <30 seconds for 95% of requests (FR-039)

**Acceptance Criteria**:
- Parallel execution optimized
- Progress updates via callback for real-time UI
- Graceful degradation (partial report if some sections fail)
- Performance target met: p95 < 30s
- All tests T007-T016 now PASS

---

## Phase 3.5: API Routes & UI

### T029: API Route: POST /api/research/[companyId]
**Type**: API Route
**Time**: 1 hour
**Dependencies**: T028
**Files Created**:
- `/home/vik/oppspot/app/api/research/[companyId]/route.ts`

**Description**:
Implement research generation endpoint:
1. Parse companyId from path params
2. Authenticate user (Supabase auth)
3. Check quota via ResearchRepository
4. If quota exceeded: return 403 with QuotaExceededResponse
5. Parse query param: `force_refresh`
6. Initiate ResearchGPTService.generateResearch()
7. Return 202 with report_id immediately
8. Research continues in background (async)

**Acceptance Criteria**:
- Contract test T007 now PASSES
- Quota checked before starting
- Response within 500ms (research async)
- Proper error handling (404, 403, 500)

---

### T030: API Route: GET /api/research/[companyId]
**Type**: API Route
**Time**: 45 minutes
**Dependencies**: T028
**Files Created**:
- `/home/vik/oppspot/app/api/research/[companyId]/route.ts` (same file as T029)

**Description**:
Implement GET method for fetching research:
1. Authenticate user
2. Fetch from ResearchRepository by companyId + userId (RLS)
3. If status='complete': return 200 with full report
4. If status='generating': return 202 with progress
5. If not found: return 404
6. Include cache metadata: cached_until, cache_age

**Acceptance Criteria**:
- Contract test T008 now PASSES
- Returns different responses based on status
- Cache age displayed in human-readable format
- Proper RLS (user can't see other users' reports)

---

### T031: API Route: GET /api/research/[companyId]/status
**Type**: API Route
**Time**: 30 minutes
**Dependencies**: T028
**Files Created**:
- `/home/vik/oppspot/app/api/research/[companyId]/status/route.ts`

**Description**:
Implement status polling endpoint:
1. Fetch report by companyId
2. Return ResearchStatusResponse:
   - status
   - progress { current_step, percent_complete, sections_complete }
   - elapsed_time_ms
3. Calculate percent_complete: (sections_complete / 6) * 100

**Acceptance Criteria**:
- Contract test T009 now PASSES
- Lightweight (no full report data)
- Used for real-time progress updates
- Returns quickly (<100ms)

---

### T032: API Route: GET /api/research/quota
**Type**: API Route
**Time**: 30 minutes
**Dependencies**: T022
**Files Created**:
- `/home/vik/oppspot/app/api/research/quota/route.ts`

**Description**:
Implement quota check endpoint:
1. Authenticate user
2. Fetch from ResearchRepository.getQuota(userId)
3. Calculate researches_remaining
4. Return QuotaResponse

**Acceptance Criteria**:
- Contract test T010 now PASSES
- Returns current month's quota
- Handles new users (no quota row yet)
- Auto-creates quota row with defaults

---

### T033: [P] UI Component: Research Button
**Type**: Component
**Time**: 1 hour
**Dependencies**: T029, T032
**Files Created**:
- `/home/vik/oppspot/components/research/research-button.tsx`

**Description**:
Create "Research with AI" button component:
1. 'use client' directive (interactive)
2. Fetch quota on mount: GET `/api/research/quota`
3. Display remaining researches
4. onClick: Check if cached report exists
5. If cached: Show "View Cached" vs "Force Refresh" dialog
6. If not cached: POST `/api/research/[companyId]`
7. Show loading state during generation
8. Disabled state if quota exceeded

**Acceptance Criteria**:
- Uses shadcn/ui Button component
- Quota displayed clearly
- Handles all states: idle, loading, cached, quota_exceeded
- Responsive design (mobile-friendly)

---

### T034: [P] UI Component: Research Progress Indicator
**Type**: Component
**Time**: 1 hour
**Dependencies**: T031
**Files Created**:
- `/home/vik/oppspot/components/research/research-progress.tsx`

**Description**:
Real-time progress bar component (FR-038):
1. Poll GET `/api/research/[companyId]/status` every 2 seconds
2. Display progress bar (0-100%)
3. Show current step text: "Analyzing buying signals..."
4. Stop polling when status='complete'
5. Animation for smooth progress updates

**Acceptance Criteria**:
- Uses shadcn/ui Progress component
- Real-time updates via polling
- Shows current step descriptions
- Handles timeout (>35 seconds)
- Accessibility: screen reader announcements

---

### T035: [P] UI Component: Company Snapshot Section
**Type**: Component
**Time**: 1 hour
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-snapshot.tsx`

**Description**:
Display company fundamentals section:
1. Props: `snapshot: CompanySnapshot`, `confidence: ConfidenceLevel`
2. Display: founded year, type, status, employees, revenue, tech stack, funding
3. Collapsible section (default: expanded)
4. Confidence indicator badge
5. Visual hierarchy: key metrics larger/bold

**Acceptance Criteria**:
- Matches design from quickstart.md
- All FR-006 to FR-010 data displayed
- Confidence badge color-coded (high=green, medium=yellow, low=red)
- Mobile responsive
- Uses Tailwind CSS + shadcn/ui Card

---

### T036: [P] UI Component: Buying Signals Section
**Type**: Component
**Time**: 1.5 hours
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-signals.tsx`

**Description**:
Display buying signals with priority badges:
1. Props: `signals: BuyingSignal[]`, `confidence: ConfidenceLevel`
2. Group by priority: HIGH signals first
3. Each signal: icon, description, detected_date, priority badge
4. Expandable details for HiringSignal (show job postings count, departments)
5. Collapsible section (default: collapsed)

**Acceptance Criteria**:
- Signals sorted by priority then recency
- Priority badges: HIGH (red), MEDIUM (yellow), LOW (gray)
- Icons for signal types (hiring, expansion, leadership, tech)
- Source links clickable
- Mobile responsive

---

### T037: [P] UI Component: Decision Makers Section
**Type**: Component
**Time**: 1.5 hours
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-decision-makers.tsx`

**Description**:
Display key decision makers (GDPR-compliant):
1. Props: `decisionMakers: DecisionMaker[]`, `confidence: ConfidenceLevel`
2. Display: name, title, department, LinkedIn link, background summary
3. Champion/influencer badge
4. Business email/phone ONLY if from official source
5. Contact source attribution visible
6. Collapsible section

**Acceptance Criteria**:
- FR-017 to FR-021 requirements met
- GDPR compliance: source attribution for all contact info
- LinkedIn URLs open in new tab
- Champion badge highlighted
- Avatars placeholder (initials)

---

### T038: [P] UI Component: Revenue Signals Section
**Type**: Component
**Time**: 1 hour
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-revenue.tsx`

**Description**:
Display financial performance signals:
1. Props: `signals: RevenueSignal[]`, `confidence: ConfidenceLevel`
2. Display: metric type, value, time period, source
3. Visual indicators: growth arrows (↑ positive, ↓ negative)
4. Benchmark comparison if available
5. Collapsible section

**Acceptance Criteria**:
- FR-022 to FR-025 data displayed
- Charts for quantitative metrics (optional)
- Source links clickable
- Confidence indicators

---

### T039: [P] UI Component: Recommended Approach Section
**Type**: Component
**Time**: 1 hour
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-approach.tsx`

**Description**:
Display AI-generated outreach strategy:
1. Props: `approach: RecommendedApproach`, `confidence: ConfidenceLevel`
2. Recommended contact highlighted (with link to decision maker section)
3. Approach summary rendered as formatted text
4. Key talking points as bullet list
5. Timing badge: color-coded urgency
6. Conversation starters as copyable cards
7. Collapsible section (default: expanded)

**Acceptance Criteria**:
- FR-026 to FR-029 data displayed
- Contact rationale visible
- Timing badge: immediate (red), within_week (orange), within_month (yellow), monitor (gray)
- Copy to clipboard for conversation starters

---

### T040: [P] UI Component: Sources Section
**Type**: Component
**Time**: 1 hour
**Dependencies**: T002, T030
**Files Created**:
- `/home/vik/oppspot/components/research/research-sources.tsx`

**Description**:
Display source verification (FR-030 to FR-033):
1. Props: `sources: Source[]`, `totalSources: number`
2. Group by source_type
3. Each source: title, URL (clickable), published_date, reliability_score
4. Reliability visualization: star rating or color bar
5. Collapsible section (default: collapsed)
6. Assert: totalSources >= 10 (FR-030)

**Acceptance Criteria**:
- At least 10 sources displayed
- Sources grouped by type
- Clickable URLs open in new tab
- Published dates formatted nicely
- Reliability scores visualized

---

### T041: UI Component: Research Report Container
**Type**: Component
**Time**: 1.5 hours
**Dependencies**: T035, T036, T037, T038, T039, T040
**Files Created**:
- `/home/vik/oppspot/components/research/research-report.tsx`

**Description**:
Main container that orchestrates all 6 sections:
1. Props: `reportId: string` or `report: ResearchReportResponse`
2. If reportId: Fetch from GET `/api/research/[companyId]`
3. Display metadata: generated_at, cache_age, confidence_score
4. Render all 6 section components
5. Actions toolbar: Export PDF, Force Refresh, Share
6. Handle partial reports (some sections missing)

**Acceptance Criteria**:
- All 6 sections rendered in correct order
- Overall confidence score displayed prominently
- Cache age banner: "Data as of X hours ago"
- Graceful handling of failed sections
- Loading states for async fetch

---

### T042: UI Component: Export PDF Functionality
**Type**: Feature
**Time**: 2 hours
**Dependencies**: T041
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/export/pdf-generator.ts`
- `/home/vik/oppspot/app/api/research/[companyId]/export/route.ts`

**Description**:
PDF export functionality (FR-036):
1. API Route: GET `/api/research/[companyId]/export`
2. Use pdf-lib to generate PDF from report data
3. Include all 6 sections with formatting
4. Sources as appendix
5. Company logo/branding
6. Filename: `{CompanyName}_Research_{Date}.pdf`
7. Download via browser

**Acceptance Criteria**:
- Integration test T011 (Export PDF) now PASSES
- PDF includes all sections
- Proper formatting and page breaks
- File size <5 MB
- Works on all browsers

---

### T043: UI Integration: Add Research Button to Business Profile Page
**Type**: Integration
**Time**: 30 minutes
**Dependencies**: T033
**Files Modified**:
- `/home/vik/oppspot/app/business/[id]/page.tsx`

**Description**:
Integrate Research button into existing business profile sidebar:
1. Import ResearchButton component
2. Add to sidebar actions section (after BusinessActions)
3. Pass companyId prop
4. Conditional rendering: only for logged-in users
5. Test with mock-monzo company

**Acceptance Criteria**:
- Button visible on business profile page
- Positioned correctly in sidebar
- Doesn't break existing layout
- Works with both real and mock companies

---

### T044: [P] UI Page: Research History Dashboard
**Type**: Page
**Time**: 1.5 hours
**Dependencies**: T030
**Files Created**:
- `/home/vik/oppspot/app/(dashboard)/research/page.tsx`

**Description**:
Create research history page showing user's past reports:
1. Fetch GET `/api/research/history?page=1&limit=20`
2. Display: company name, generated_at, confidence score, status
3. Click to view full report
4. Pagination (20 per page)
5. Filter: All / Complete / Partial / Failed
6. Sort: Most recent first

**Acceptance Criteria**:
- Uses existing dashboard layout
- Table/card view (responsive)
- Pagination controls
- Filter and sort working
- Empty state: "No research reports yet"

---

### T045: [P] UI Page: View Saved Research Report
**Type**: Page
**Time**: 1 hour
**Dependencies**: T041
**Files Created**:
- `/home/vik/oppspot/app/(dashboard)/research/[reportId]/page.tsx`

**Description**:
Dedicated page for viewing single research report:
1. Fetch report by reportId
2. Render ResearchReport component
3. Breadcrumbs: Home → Research History → [Company Name]
4. Back button to research history
5. Share URL functionality

**Acceptance Criteria**:
- Deep linking works: `/research/[reportId]`
- Uses existing Navbar
- Breadcrumbs navigation
- Share button copies URL
- 404 if report not found or not owned by user

---

### T046: API Route: GET /api/research/history
**Type**: API Route
**Time**: 45 minutes
**Dependencies**: T022
**Files Created**:
- `/home/vik/oppspot/app/api/research/history/route.ts`

**Description**:
Implement research history endpoint:
1. Authenticate user
2. Parse query params: page, limit, status filter
3. Fetch from ResearchRepository with pagination
4. Return ResearchReportSummary[] + Pagination metadata
5. Order by generated_at DESC

**Acceptance Criteria**:
- Pagination working (max 100 per page)
- Filters: all, complete, partial, failed
- Proper RLS (user sees only own reports)
- Performance: <200ms for typical page

---

## Phase 3.6: Polish & Validation

### T047: E2E Test Execution & Validation
**Type**: Testing
**Time**: 2 hours
**Dependencies**: All implementation tasks
**Files**: Tests T007-T016

**Description**:
Run and validate all E2E tests:
1. Run all contract tests: `npm run test:e2e -- research-api`
2. Run all integration tests: `npm run test:e2e -- research-`
3. Verify 100% pass rate
4. Fix any failing tests
5. Screenshot comparison for UI tests
6. Performance validation: 95% < 30s

**Acceptance Criteria**:
- All 10 tests PASS
- No flaky tests
- Screenshots match expected UI
- Performance targets met: p95 < 30s
- Test coverage report generated

---

### T048: Performance Optimization
**Type**: Optimization
**Time**: 2 hours
**Dependencies**: T047
**Files Modified**: Various

**Description**:
Optimize to meet NFR-001 (95% < 30s):
1. Profile slow requests: identify bottlenecks
2. Optimize parallel execution in ResearchGPTService
3. Reduce OpenRouter prompt size if needed
4. Add request caching for Companies House
5. Optimize database queries (add indexes if missing)
6. Implement request timeout handling

**Acceptance Criteria**:
- p50: <20 seconds
- p95: <30 seconds ✅ (NFR-001)
- p99: <35 seconds
- Database queries: all <100ms
- OpenRouter API: <10s

---

### T049: GDPR Compliance Verification
**Type**: Compliance
**Time**: 1.5 hours
**Dependencies**: T016, T047
**Files Modified**: Various

**Description**:
Final GDPR compliance check:
1. Review all personal data handling code
2. Verify source attribution in place (FR-021b)
3. Test removal request mechanism (FR-021c)
4. Verify 6-month anonymization cron job scheduled (NFR-008)
5. Update privacy policy with ResearchGPT details
6. Document data processing in GDPR audit log

**Acceptance Criteria**:
- No personal emails from social networks
- All contact info has source attribution
- Removal form tested and working
- Anonymization job scheduled (cron or Vercel cron)
- Legal review completed (manual step)

---

### T050: [P] Documentation Updates
**Type**: Documentation
**Time**: 1 hour
**Dependencies**: All tasks
**Files Modified**:
- `/home/vik/oppspot/CLAUDE.md`
- `/home/vik/oppspot/README.md` (if exists)

**Description**:
Update project documentation:
1. Add ResearchGPT to "Key Features Implemented" in CLAUDE.md
2. Document environment variables needed
3. Add API endpoint documentation
4. Update database schema overview
5. Add troubleshooting guide
6. Usage examples for developers

**Acceptance Criteria**:
- CLAUDE.md updated with ResearchGPT context
- Environment variables documented
- API endpoints listed
- Usage examples clear

---

### T051: [P] Performance Monitoring Setup
**Type**: Monitoring
**Time**: 1 hour
**Dependencies**: T048
**Files Created**:
- `/home/vik/oppspot/lib/research-gpt/monitoring/metrics.ts`

**Description**:
Add monitoring and alerting:
1. Track research generation time (p50, p95, p99)
2. Track API costs (OpenRouter, News API)
3. Track quota usage per user
4. Track error rates (failed/partial reports)
5. Dashboard for admin monitoring
6. Alerts: cost > $100/day, p95 > 35s

**Acceptance Criteria**:
- Metrics logged to database or external service
- Admin dashboard showing key metrics
- Cost tracking accurate
- Alerts configured (email or Slack)

---

### T052: Final Manual Testing & Launch Prep
**Type**: Testing
**Time**: 2 hours
**Dependencies**: All tasks
**Files**: quickstart.md checklist

**Description**:
Execute quickstart.md manual testing checklist:
1. Complete all functionality tests
2. Complete all performance tests
3. Complete all GDPR tests
4. Complete all error handling tests
5. Complete all UI/UX tests
6. Beta test with 5 real users
7. Gather feedback and fix critical issues
8. Prepare launch announcement

**Acceptance Criteria**:
- All quickstart.md checklist items ✅
- Beta feedback positive
- No critical bugs
- Ready for production deployment
- Launch plan documented

---

## Dependencies Graph

### Critical Path (Sequential)
```
T001 (Migration) → T002 (Types) → T003 (Validation) → T007-T016 (Tests)
    ↓
T017-T021 (Data Sources) → T022 (Repository)
    ↓
T023-T027 (Analyzers) → T028 (Orchestrator)
    ↓
T029-T032 (API Routes)
    ↓
T033-T046 (UI Components & Pages)
    ↓
T047-T052 (Polish & Validation)
```

### Parallel Execution Opportunities

**Phase 1: Foundation (Parallel)**
```bash
# Run together:
- T002: TypeScript types
- T003: Zod schemas
- T004: Install dependencies
- T005: Environment variables
- T006: Cache manager
```

**Phase 2: Tests (Parallel - ALL must fail before implementation)**
```bash
# Run together:
- T007: Contract test POST
- T008: Contract test GET
- T009: Contract test status
- T010: Contract test quota
- T011: Integration test happy path
- T012: Integration test cached
- T013: Integration test force refresh
- T014: Integration test quota exceeded
- T015: Integration test invalid company
- T016: Integration test GDPR
```

**Phase 3: Data Sources (Parallel)**
```bash
# Run together:
- T017: Companies House source
- T018: News API source
- T019: Job board scraper
- T020: Website scraper
```

**Phase 4: Analyzers (Parallel)**
```bash
# Run together (after data sources complete):
- T023: Snapshot analyzer
- T024: Signals analyzer
- T025: Decision maker analyzer
- T026: Revenue analyzer
```

**Phase 5: UI Components (Parallel)**
```bash
# Run together:
- T033: Research button
- T034: Progress indicator
- T035: Snapshot section
- T036: Signals section
- T037: Decision makers section
- T038: Revenue section
- T039: Approach section
- T040: Sources section
- T044: History dashboard
```

---

## Validation Checklist (GATE before marking complete)

- [x] All contracts have corresponding tests (T007-T010 ✅)
- [x] All entities have model tasks (Types in T002 ✅)
- [x] All tests come before implementation (Phase 3.2 before 3.3 ✅)
- [x] Parallel tasks truly independent (Different files ✅)
- [x] Each task specifies exact file path (✅)
- [x] No task modifies same file as another [P] task (✅)
- [x] TDD enforced (Tests MUST FAIL before implementation ✅)

---

## Estimated Timeline

**Sequential (Single Developer)**:
- Phase 3.1: Setup - 3 hours
- Phase 3.2: Tests - 5 hours
- Phase 3.3: Data Layer - 8 hours
- Phase 3.4: Service Layer - 8 hours
- Phase 3.5: API & UI - 14 hours
- Phase 3.6: Polish - 8 hours
**Total**: 46 hours (~6 working days)

**Parallel (Multiple Developers)**:
- Phase 3.1: 1 hour (batch parallel tasks)
- Phase 3.2: 2 hours (all tests together)
- Phase 3.3: 3 hours (data sources parallel)
- Phase 3.4: 2 hours (analyzers parallel)
- Phase 3.5: 4 hours (UI components parallel)
- Phase 3.6: 4 hours (polish sequential)
**Total**: 16 hours (~2 working days with 3 developers)

---

## Notes for Implementation

1. **TDD Strict Enforcement**: Do NOT implement T017+ until ALL tests T007-T016 are written and FAILING
2. **Parallel Execution**: Use Task agent to launch multiple [P] tasks concurrently
3. **Commit Frequency**: Commit after each completed task
4. **Testing**: Run `npm run test:e2e` after each phase
5. **Performance**: Monitor generation time during implementation, optimize if >30s
6. **GDPR**: Review FR-021 series before implementing decision maker features
7. **Costs**: Track OpenRouter and News API costs during development

---

**Tasks Status**: ✅ READY FOR EXECUTION

Run `/implement` or execute tasks manually in dependency order.
