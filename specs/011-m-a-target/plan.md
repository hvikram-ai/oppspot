
# Implementation Plan: M&A Target Prediction Algorithm

**Branch**: `011-m-a-target` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/011-m-a-target/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

The M&A Target Prediction Algorithm analyzes company financials, operational metrics, market position, and historical M&A patterns to predict which companies are likely acquisition targets in the next 12-24 months. The system generates prediction scores (0-100), categorizes likelihood (Low/Medium/High/Very High), estimates valuation ranges, and identifies potential acquirer profiles.

**Technical Approach**: Build as a new analytics module in the existing oppSpot architecture, following the ResearchGPT™ pattern with:
- Nightly batch prediction engine for all companies (pre-compute)
- Real-time recalculation trigger when new financial data arrives
- AI-powered scoring using OpenRouter API
- Multi-factor analysis combining financial, operational, and market signals
- Cached retrieval for instant user access (<5s response time)
- Export capabilities (PDF/Excel/CSV)

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js (Next.js 15 App Router)
**Primary Dependencies**: Next.js 15, Supabase (PostgreSQL + Auth), OpenRouter API, Tailwind CSS, shadcn/ui, Zustand, Playwright
**Storage**: Supabase PostgreSQL with pgvector for pattern matching, Supabase Storage for exports
**Testing**: Playwright for E2E tests, contract tests for API endpoints
**Target Platform**: Vercel deployment (production SaaS)
**Project Type**: web (Next.js full-stack application)
**Performance Goals**:
- Individual prediction retrieval: <5 seconds (95th percentile)
- Nightly batch processing: Process entire database overnight
- Real-time updates: Trigger recalculation within seconds of data ingestion
**Constraints**:
- All authenticated users must have access (no tier restrictions)
- Must integrate with existing businesses table and ResearchGPT™ data
- Must support PDF, Excel (.xlsx), and CSV exports
- Must maintain audit trail for compliance
**Scale/Scope**:
- Predict for all companies in database (10,000+ businesses)
- Support multiple concurrent users viewing predictions
- Historical predictions retained for trend analysis

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution template is not populated, so we proceed with oppSpot's existing architectural principles based on CLAUDE.md:

**Architecture Principles (from CLAUDE.md)**:
- ✅ Use Next.js 15 App Router (not Pages Router)
- ✅ Server components by default, client components only when interactive
- ✅ Supabase for database with RLS security
- ✅ No new UI component libraries (use existing shadcn/ui)
- ✅ Follow existing patterns: ResearchGPT™ for AI analysis, similar structure expected
- ✅ TypeScript strict mode (avoid `any` types)
- ✅ E2E tests with Playwright before implementation

**Feature-Specific Checks**:
- ✅ Reuses existing `businesses` table (no duplicate company storage)
- ✅ Follows ResearchGPT™ pattern for AI-powered analysis
- ✅ Integrates with existing authentication (Supabase Auth)
- ✅ Uses OpenRouter API (existing integration)
- ✅ Export uses established patterns (similar to ResearchGPT™ reports)

**PASS**: No constitutional violations. Architecture aligns with existing oppSpot patterns.

## Project Structure

### Documentation (this feature)
```
specs/011-m-a-target/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api-predict.yaml
│   ├── api-batch.yaml
│   └── api-export.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (existing Next.js structure)
```
# Next.js App Router structure (existing)
app/
├── api/
│   └── ma-predictions/           # New API routes
│       ├── [companyId]/
│       │   └── route.ts          # GET prediction for company
│       ├── batch/
│       │   └── route.ts          # POST trigger batch processing
│       └── export/
│           └── route.ts          # GET export predictions
├── business/[id]/
│   └── (ma-prediction section)   # Update existing page
└── (dashboard)/
    └── ma-targets/               # New dedicated M&A targets page
        └── page.tsx

lib/
├── ma-prediction/                # New feature module
│   ├── analyzers/
│   │   ├── financial-analyzer.ts
│   │   ├── operational-analyzer.ts
│   │   ├── market-analyzer.ts
│   │   └── pattern-matcher.ts
│   ├── scoring/
│   │   ├── prediction-scorer.ts
│   │   └── confidence-calculator.ts
│   ├── valuation/
│   │   └── valuation-estimator.ts
│   ├── repository/
│   │   └── prediction-repository.ts
│   ├── batch/
│   │   └── batch-processor.ts
│   └── ma-prediction-service.ts  # Main orchestrator
├── stores/
│   └── ma-prediction-store.ts    # Zustand state management
└── types/
    └── ma-prediction.ts          # TypeScript types

components/
└── ma-prediction/                # New UI components
    ├── prediction-card.tsx
    ├── prediction-score-badge.tsx
    ├── valuation-range.tsx
    ├── factor-list.tsx
    ├── acquirer-profiles.tsx
    ├── prediction-history.tsx
    └── export-controls.tsx

tests/
├── contract/
│   ├── ma-prediction-api.contract.test.ts
│   ├── ma-batch-api.contract.test.ts
│   └── ma-export-api.contract.test.ts
└── e2e/
    ├── ma-prediction-view.spec.ts
    ├── ma-prediction-filter.spec.ts
    └── ma-prediction-export.spec.ts
```

**Structure Decision**: Web application (Next.js full-stack) - follows existing oppSpot architecture

## Phase 0: Outline & Research

### Research Tasks

Based on the remaining [NEEDS CLARIFICATION] items in the spec and technical requirements:

1. **Operational Metrics Selection** (FR-002)
   - Research: Which operational metrics are most predictive of M&A likelihood?
   - Decision needed: Employee growth rate, customer concentration, contract pipeline visibility
   - Data availability: What's accessible via Companies House API and existing oppSpot data?

2. **Market Position Factors** (FR-003)
   - Research: Which market signals indicate M&A target potential?
   - Decision needed: Industry consolidation patterns, market share trends, competitive dynamics
   - Integration: How to combine with existing market_metrics table?

3. **Acquirer Profile Logic** (FR-018)
   - Research: How to identify potential acquirers programmatically?
   - Decision needed: Industry matching rules, size ratios, geographic proximity algorithms
   - Pattern matching: Use historical M&A data to build acquirer profiles

4. **Minimum Data Threshold** (FR-024)
   - Research: What's the minimum data required for reliable predictions?
   - Decision needed: Years of financial history, required fields, confidence thresholds
   - Edge case handling: Companies with partial data

5. **Regulatory Compliance** (FR-027)
   - Research: Legal requirements for M&A predictions in UK/Ireland
   - Decision needed: Financial advice disclaimers, FCA compliance if applicable
   - Risk mitigation: Clear "not financial advice" messaging

6. **Historical M&A Data Source**
   - Research: Where to source historical M&A transaction data?
   - Options: Public APIs (Crunchbase, PitchBook alternatives), web scraping, manual datasets
   - Integration: How to structure and store historical patterns

7. **Prediction Algorithm Design**
   - Research: Scoring methodologies for M&A likelihood
   - Approaches: Machine learning (requires training data), rule-based scoring, AI-powered heuristics
   - Recommendation: Hybrid approach using AI for nuanced analysis + rule-based scoring for consistency

8. **Batch Processing Strategy**
   - Research: Best practices for nightly batch processing in Next.js/Supabase
   - Options: Supabase Edge Functions, Vercel Cron Jobs, separate worker process
   - Performance: Processing 10K+ companies overnight efficiently

### Output: research.md

✅ **Complete**: See [research.md](./research.md) for all technical decisions.

---

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✅*

### 1. Data Model Design

**Output**: [data-model.md](./data-model.md)

**Entities Extracted from Spec**:
- `ma_predictions` - Core prediction records with scores, categories, confidence levels
- `ma_prediction_factors` - Top 5 contributing factors per prediction
- `ma_valuation_estimates` - Estimated acquisition price ranges
- `ma_acquirer_profiles` - Potential acquirer company profiles (High/Very High targets)
- `ma_historical_deals` - Reference dataset of past M&A transactions
- `ma_prediction_queue` - Real-time recalculation job queue
- `ma_prediction_audit_log` - Immutable compliance audit trail

**Key Relationships**:
- `businesses` (existing) → `ma_predictions` (1:many historical versions)
- `ma_predictions` → `ma_prediction_factors` (1:5)
- `ma_predictions` → `ma_valuation_estimates` (1:1)
- `ma_predictions` → `ma_acquirer_profiles` (1:many, max 10)

**Database Triggers**:
- Automatic recalculation trigger on `businesses` table updates (revenue, profitability, employees)
- Inserts jobs into `ma_prediction_queue` for async processing

### 2. API Contracts

**Output**: [contracts/](./contracts/)

Generated OpenAPI 3.0 specifications:

#### [api-predict.yaml](./contracts/api-predict.yaml)
- `GET /api/ma-predictions/{companyId}` - Retrieve prediction with optional related data
- `GET /api/ma-predictions/{companyId}/history` - Historical predictions for trend analysis
- Includes request/response schemas, error codes, authentication requirements
- Performance target: <5 seconds (95th percentile) per FR-029

#### [api-batch.yaml](./contracts/api-batch.yaml)
- `POST /api/ma-predictions/batch` - Trigger batch processing (manual or cron)
- `GET /api/ma-predictions/batch/{batchId}/status` - Monitor batch progress
- `GET /api/cron/ma-predictions` - Vercel Cron endpoint (nightly 2 AM)
- `GET /api/ma-predictions/queue/status` - Real-time queue monitoring

#### [api-export.yaml](./contracts/api-export.yaml)
- `POST /api/ma-predictions/export` - Export predictions (PDF/Excel/CSV)
- `GET /api/ma-predictions/export/{exportId}/status` - Async export status
- `GET /api/ma-predictions/export/watchlist` - Convenience endpoint for saved companies
- Supports bulk exports (up to 1000 companies)

### 3. Contract Tests (To Be Generated)

Contract tests will be created in `/tests/contract/`:
- `ma-prediction-api.contract.test.ts` - Tests for prediction retrieval endpoints
- `ma-batch-api.contract.test.ts` - Tests for batch processing endpoints
- `ma-export-api.contract.test.ts` - Tests for export endpoints

Each test will:
- Assert request/response schema compliance with OpenAPI contracts
- Validate error responses (401, 404, 500)
- Test authentication enforcement
- Initially fail (no implementation yet) following TDD

### 4. Integration Test Scenarios

**Output**: [quickstart.md](./quickstart.md)

Comprehensive validation scenarios:
1. View M&A prediction on company profile
2. View detailed prediction analysis (factors, valuation, acquirers)
3. Filter companies by M&A likelihood
4. Export predictions (PDF format)
5. Export bulk predictions (Excel format)
6. Real-time recalculation trigger test
7. Nightly batch processing validation
8. Insufficient data handling
9. Access control verification (all authenticated users)
10. Audit trail logging compliance

Performance validation:
- Load testing script using k6
- Expected thresholds: <5s p95, >20 RPS, <1% error rate

### 5. Agent Context Update

**Output**: CLAUDE.md updated ✅

Updated Claude Code context with:
- New M&A prediction feature module structure
- Database schema additions (7 new tables)
- API endpoints documentation
- TypeScript types for M&A entities
- Integration with existing ResearchGPT™ patterns

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

The `/tasks` command will:

1. **Load templates**:
   - Use `.specify/templates/tasks-template.md` as base structure
   - Generate dependency-ordered task list

2. **Database Tasks** (from data-model.md):
   - Task: Create migration file `20251030_ma_predictions.sql`
   - Task: Write RLS policies for all 7 tables
   - Task: Create database triggers for real-time recalculation
   - Task: Seed initial historical M&A deals dataset
   - Task: Test migration locally and verify constraints

3. **Contract Test Tasks** (from contracts/):
   - Task: Implement `ma-prediction-api.contract.test.ts` [P]
   - Task: Implement `ma-batch-api.contract.test.ts` [P]
   - Task: Implement `ma-export-api.contract.test.ts` [P]
   - Tests MUST be written before API implementation (TDD)
   - Tests MUST fail initially (red phase)

4. **API Implementation Tasks** (from contracts/):
   - Task: Implement `GET /api/ma-predictions/[companyId]/route.ts`
   - Task: Implement `POST /api/ma-predictions/batch/route.ts`
   - Task: Implement `GET /api/cron/ma-predictions/route.ts`
   - Task: Implement `POST /api/ma-predictions/export/route.ts`
   - Each task depends on corresponding contract test
   - Must make tests pass (green phase)

5. **Core Service Tasks** (lib/ma-prediction/):
   - Task: Create `ma-prediction-service.ts` orchestrator
   - Task: Implement `financial-analyzer.ts` (analyzes revenue trends, profitability, cash flow)
   - Task: Implement `operational-analyzer.ts` (employee trends, director changes, filing punctuality)
   - Task: Implement `market-analyzer.ts` (industry consolidation, company age, geography)
   - Task: Implement `pattern-matcher.ts` (historical M&A pattern matching)
   - Task: Implement `prediction-scorer.ts` (hybrid AI + rule-based scoring)
   - Task: Implement `confidence-calculator.ts` (data completeness scoring)
   - Task: Implement `valuation-estimator.ts` (revenue/EBITDA multiples)
   - Task: Implement `prediction-repository.ts` (database operations)
   - Task: Implement `batch-processor.ts` (nightly batch engine)

6. **UI Component Tasks** (components/ma-prediction/):
   - Task: Create `prediction-card.tsx` (score badge, category pill) [P]
   - Task: Create `prediction-score-badge.tsx` (reusable score display) [P]
   - Task: Create `valuation-range.tsx` (min/max valuation display) [P]
   - Task: Create `factor-list.tsx` (top 5 factors with impact weights) [P]
   - Task: Create `acquirer-profiles.tsx` (potential acquirers table) [P]
   - Task: Create `prediction-history.tsx` (trend chart over time) [P]
   - Task: Create `export-controls.tsx` (PDF/Excel/CSV export buttons) [P]

7. **Page Integration Tasks**:
   - Task: Add M&A prediction section to `app/business/[id]/page.tsx`
   - Task: Create `app/(dashboard)/ma-targets/page.tsx` (dedicated M&A targets list)
   - Task: Add M&A likelihood filter to search/dashboard

8. **Export Implementation Tasks**:
   - Task: Implement `lib/ma-prediction/export/pdf-generator.ts` (reuse Puppeteer)
   - Task: Implement `lib/ma-prediction/export/excel-generator.ts` (use ExcelJS)
   - Task: Implement `lib/ma-prediction/export/csv-generator.ts` (simple serialization)

9. **E2E Test Tasks** (tests/e2e/):
   - Task: Write `ma-prediction-view.spec.ts` (view prediction on company profile)
   - Task: Write `ma-prediction-filter.spec.ts` (filter by likelihood)
   - Task: Write `ma-prediction-export.spec.ts` (export PDF/Excel/CSV)
   - Tests use Playwright, must pass before marking feature complete

10. **Integration Tasks**:
    - Task: Configure Vercel Cron Job in `vercel.json`
    - Task: Add environment variables to `.env.example`
    - Task: Update Supabase project with new RLS policies
    - Task: Deploy migration to production

### Ordering Strategy

1. **Database First**: Migration → Seed data → Verify schema
2. **TDD Cycle**: Contract tests → API implementation → Tests pass
3. **Services**: Core analyzers → Scorer → Repository → Batch processor
4. **UI**: Components (parallel) → Page integration
5. **E2E**: End-to-end validation
6. **Deploy**: Migration → Cron setup → Production

**Parallelizable Tasks** (marked [P]):
- Contract tests (independent endpoints)
- UI components (no dependencies between components)
- Analyzer services (independent logic)

**Sequential Dependencies**:
- Database migration BEFORE any API work
- Contract tests BEFORE corresponding API implementation
- Services BEFORE UI components that use them
- All tests BEFORE production deployment

### Estimated Task Count

**Total Estimated Tasks**: 35-40 tasks

Breakdown:
- Database: 5 tasks
- Contract tests: 3 tasks
- API routes: 5 tasks
- Core services: 10 tasks
- UI components: 7 tasks
- Page integration: 3 tasks
- Export: 3 tasks
- E2E tests: 3 tasks
- Integration/deploy: 4 tasks

**Estimated Completion Time**: 2-3 weeks (assuming 1 developer, TDD workflow)

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD workflow)
**Phase 5**: Validation (run quickstart.md, performance load tests, code review)

---

## Complexity Tracking

*No constitutional violations identified. This section intentionally left empty.*

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 critical items addressed in /clarify)
- [x] Complexity deviations documented (N/A - no violations)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] research.md (10 technical decisions documented)
- [x] data-model.md (7 tables, TypeScript types, migration script)
- [x] contracts/api-predict.yaml (OpenAPI spec)
- [x] contracts/api-batch.yaml (OpenAPI spec)
- [x] contracts/api-export.yaml (OpenAPI spec)
- [x] quickstart.md (10 test scenarios, performance validation)
- [x] CLAUDE.md updated with M&A feature context

---

**Status**: ✅ Planning phase complete. Ready for `/tasks` command.

*Based on oppSpot architecture patterns from CLAUDE.md and Constitution principles*

