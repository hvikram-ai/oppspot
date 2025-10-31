# Implementation Plan: Financial & Revenue Quality Analytics

**Branch**: `012-oppspot-docs-financial` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/012-oppspot-docs-financial/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
   → Spec loaded successfully with clarifications
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✓
   → Project Type: web (Next.js 15 App Router + Supabase backend)
   → Structure Decision: Web application structure (frontend + backend patterns)
3. Fill Constitution Check section ✓
   → Constitution is template only (no project-specific rules yet)
4. Evaluate Constitution Check section ✓
   → No violations detected (constitution not yet ratified for project)
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md ✓
   → All critical technical decisions resolved via clarifications
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

## Summary

The Financial & Revenue Quality Analytics feature provides comprehensive SaaS financial analysis capabilities for M&A and investment due diligence. Users can upload CSV data (subscriptions, invoices, payments, costs) to generate board-ready reports with key metrics (ARR, MRR, NRR, GRR, CAC, LTV, gross margin), cohort retention analysis, revenue concentration risk assessment, AR/AP aging, and industry benchmark comparisons. The system enforces single-currency constraints, achieves <5 second recalculation for 24 months of data, and integrates with existing oppSpot companies table and organization permissions.

**Technical Approach**: Next.js 15 App Router pages/API routes for UI and data ingestion, Supabase PostgreSQL for fact tables and KPI snapshots with RLS policies, background workers for metric calculation and anomaly detection, @react-pdf/renderer for PDF exports, existing shadcn/ui components for visualization (charts, heatmaps). New financial permission roles (Financial Editor/Admin) extend existing auth model.

## Technical Context

**Language/Version**: TypeScript (Next.js 15.0.3, React 19), Node.js 20+
**Primary Dependencies**:
  - Next.js 15 (App Router, Server Actions)
  - Supabase (PostgreSQL + Auth + RLS)
  - @react-pdf/renderer (PDF generation)
  - Recharts (chart visualization)
  - shadcn/ui components (existing)
  - Zod (schema validation)
  - papaparse (CSV parsing)

**Storage**: Supabase PostgreSQL with 12 new tables (customers, subscriptions, invoices, payments, cogs_entries, sales_marketing_costs, kpi_snapshots, cohort_metrics, revenue_concentration, ar_ap_aging, anomalies, benchmarks_sector_medians)

**Testing**: Playwright (E2E), Vitest (unit), contract tests (API validation)

**Target Platform**: Web (Vercel deployment), Chromium/Firefox/WebKit browsers

**Project Type**: web (Next.js frontend + Supabase backend with API routes)

**Performance Goals**:
  - KPI recalculation: <5 seconds for 24 months of data
  - API summary read: <300ms (cached snapshots)
  - Cohort grid: <600ms
  - Dashboard page load: <1 second (deferred clarification - using reasonable default)

**Constraints**:
  - Single currency per company (enforced validation)
  - CSV-only ingestion (v1 scope)
  - Single company view (no portfolio aggregation)
  - Static benchmark datasets
  - Supabase RLS required for all financial tables
  - Must integrate with existing companies.sector field
  - ARR-based size bands: <$1M, $1M-$10M, $10M-$50M, $50M+

**Scale/Scope**:
  - Support 50K+ invoices per company
  - 24-month historical analysis window
  - Up to 10K customers per company
  - Export PDFs suitable for board presentation
  - Idempotent CSV re-uploads

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: Constitution file is a template - no project-specific rules ratified yet.

**Observations**:
- Template suggests principles like Library-First, CLI Interface, Test-First (TDD), but these are placeholders
- No violations possible since constitution is not yet ratified for oppSpot project
- Will follow existing oppSpot patterns: Next.js App Router structure, Supabase RLS, Playwright E2E tests, shadcn/ui components

**Recommendation**: If project adopts a constitution in the future, this plan should be reviewed against those principles. Current approach follows established patterns in the codebase (see CLAUDE.md).

## Project Structure

### Documentation (this feature)
```
specs/012-oppspot-docs-financial/
├── spec.md              # Feature specification (complete with clarifications)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── upload-data.json
│   ├── get-summary.json
│   ├── get-cohorts.json
│   ├── get-concentration.json
│   ├── get-ar-ap-aging.json
│   ├── recompute.json
│   └── export-pdf.json
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Next.js 15 App Router structure (existing pattern)
app/
├── (dashboard)/
│   └── companies/[id]/financials/
│       ├── page.tsx                          # Main financial analytics dashboard
│       ├── upload/
│       │   └── page.tsx                      # CSV upload interface
│       └── cohorts/
│           └── page.tsx                      # Cohort analysis view
├── api/
│   └── companies/[id]/financials/
│       ├── upload/route.ts                   # POST CSV data (multi-file)
│       ├── summary/route.ts                  # GET KPI metrics + trends
│       ├── cohorts/route.ts                  # GET cohort retention grid
│       ├── concentration/route.ts            # GET revenue concentration
│       ├── ar-ap-aging/route.ts              # GET aging buckets + DSO/DPO
│       ├── recompute/route.ts                # POST trigger recalculation
│       └── export/route.ts                   # GET PDF report

components/
├── financials/
│   ├── kpi-overview.tsx                      # ARR, MRR, NRR, GRR, CAC, LTV, GM cards
│   ├── nrr-waterfall.tsx                     # NRR breakdown chart
│   ├── cohort-heatmap.tsx                    # Retention heatmap visualization
│   ├── concentration-chart.tsx               # Top-N customer bars + HHI
│   ├── ar-ap-aging-table.tsx                 # Aging buckets table
│   ├── benchmark-comparison.tsx              # Sector median comparison cards
│   ├── formula-tooltip.tsx                   # Metric explanation popover
│   ├── anomaly-banner.tsx                    # Risk indicator alerts
│   └── csv-upload-zone.tsx                   # Drag-drop CSV upload
└── ui/                                       # Existing shadcn/ui components

lib/
├── financials/
│   ├── types.ts                              # TypeScript types for all entities
│   ├── ingestion/
│   │   ├── csv-parser.ts                     # Parse + validate CSVs (papaparse + zod)
│   │   ├── validator.ts                      # Single currency check, field validation
│   │   └── upserter.ts                       # Idempotent database writes
│   ├── calculators/
│   │   ├── kpi-calculator.ts                 # ARR, MRR, NRR, GRR, CAC, LTV, GM
│   │   ├── cohort-calculator.ts              # Retention rates by cohort
│   │   ├── concentration-calculator.ts       # HHI, top-N percentages
│   │   └── ar-ap-calculator.ts               # DSO, DPO, aging buckets
│   ├── anomaly/
│   │   ├── detector.ts                       # Detect spikes, drops, threshold breaches
│   │   └── rules.ts                          # Default thresholds (20% concentration, DSO spikes)
│   ├── benchmarking/
│   │   ├── matcher.ts                        # Sector + ARR band lookup
│   │   └── comparer.ts                       # Percentile deltas
│   └── exports/
│       └── pdf-generator.tsx                 # @react-pdf/renderer report
└── supabase/
    ├── client.ts                             # Existing client
    └── server.ts                             # Existing server client

supabase/
└── migrations/
    └── 20251030_financial_analytics.sql      # All 12 tables + RLS policies + indexes

tests/
├── contract/
│   ├── financials-upload.contract.test.ts
│   ├── financials-summary.contract.test.ts
│   ├── financials-cohorts.contract.test.ts
│   ├── financials-concentration.contract.test.ts
│   ├── financials-ar-ap.contract.test.ts
│   ├── financials-recompute.contract.test.ts
│   └── financials-export.contract.test.ts
└── e2e/
    ├── financials-upload-csv.spec.ts
    ├── financials-dashboard.spec.ts
    ├── financials-cohorts.spec.ts
    └── financials-export.spec.ts
```

**Structure Decision**: Web application (Option 2) - Next.js 15 App Router with server/client components, API routes for data operations, lib/ for business logic, Supabase migrations for schema.

## Phase 0: Outline & Research

**Status**: ✅ Complete (resolved via clarification session)

### Research Findings

#### 1. Currency Handling Strategy
**Decision**: Single currency per company enforced at validation layer
**Rationale**: Simplifies v1 scope, avoids FX rate complexity/errors, aligns with spec clarification
**Alternatives considered**:
  - Multi-currency with manual FX rates (rejected: adds user burden, error-prone)
  - Auto FX conversion (rejected: requires external API, stale rate risks, beyond v1 scope)
**Implementation**:
  - Company model gets `reporting_currency` field (3-letter ISO code)
  - CSV validator checks all rows match company currency
  - Reject upload with clear error if mixed currencies detected

#### 2. Sector & Size Band Determination
**Decision**: Use existing `companies.sector` field + calculate ARR-based size bands (<$1M, $1M-$10M, $10M-$50M, $50M+)
**Rationale**: Reuses existing data (no new user input), ARR aligns with SaaS benchmarking norms
**Alternatives considered**:
  - Employee count bands (rejected: less relevant for SaaS financial quality)
  - User-selected sector (rejected: duplicate data entry, consistency issues)
**Implementation**:
  - Read `companies.sector` from existing table (no schema change needed)
  - Calculate current ARR from `kpi_snapshots.arr` field
  - Map ARR to size band enum for benchmark queries

#### 3. Recalculation Performance (<5 seconds for 24 months)
**Decision**: Precomputed snapshots + incremental updates + database indexes
**Rationale**: Target requires sub-second per-month calculation, batch processing efficient
**Alternatives considered**:
  - Real-time calculation on every page load (rejected: too slow, no caching)
  - Background jobs only (rejected: users expect immediate feedback on upload)
**Implementation Strategy**:
  - Store monthly `kpi_snapshots` (precomputed, indexed by company_id + period_date)
  - On upload: recalculate only affected months (detect date range from uploaded data)
  - Use Postgres aggregate functions for performance (SUM, COUNT, GROUP BY month)
  - HNSW/GiST indexes on date columns for fast range queries
  - Target: ~200ms per month × 24 months = 4.8 seconds (under 5s goal)

#### 4. Permission Model Extension
**Decision**: Create new `financial_roles` table with role assignments (Financial Editor, Financial Admin)
**Rationale**: Granular permissions needed, avoids polluting existing auth model
**Alternatives considered**:
  - Reuse existing roles if present (rejected: no existing editor/admin roles confirmed)
  - Org-wide permissions only (rejected: need role-specific access for uploads/recalc)
**Implementation**:
  - `financial_roles` table: (user_id, company_id, role enum, granted_at, granted_by)
  - RLS policies check: `auth.uid() IN (SELECT user_id FROM financial_roles WHERE company_id = X AND role IN ('editor', 'admin'))`
  - Read access: all org members via existing `companies.org_id` check
  - Write access: editors + admins
  - Role management: admins only

#### 5. CSV Schema & Templates
**Decision**: Provide downloadable CSV templates with required columns + validation rules
**Rationale**: Reduces user errors, clear expectations, improves data quality
**Implementation**:
  - 5 templates: subscriptions.csv, invoices.csv, payments.csv, cogs.csv, sales_marketing.csv
  - Each template includes header row with exact column names + example row
  - Validation errors reference template column names
  - Templates linked from upload page with tooltips explaining each field

#### 6. Default Thresholds (deferred clarifications)
**Decision**: Use industry standard defaults with future configurability
**Thresholds**:
  - Revenue concentration risk: Flag if single customer >25% (conservative)
  - AR aging anomaly: Flag if 90+ days AR increases by >50% month-over-month
  - Dashboard load target: <1 second initial load (reasonable UX standard)
**Rationale**: Sensible defaults enable v1 launch, can be made configurable in v2
**Note**: These resolve FR-016, FR-021, FR-053 deferred clarifications

#### 7. Technology Stack Validation

**CSV Parsing**: `papaparse` (proven, handles edge cases, streaming support)
**PDF Generation**: `@react-pdf/renderer` (React-based, existing in codebase patterns)
**Charts**: `recharts` (existing in oppSpot, consistent with current dashboard)
**Validation**: `zod` (TypeScript-first, composable schemas, error messages)
**Database**: Supabase PostgreSQL with RLS (existing infrastructure, proven security)

### Research Summary

All critical technical decisions resolved. No blocking unknowns remain. Ready for Phase 1 design.

**Output**: Research complete ✓

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for comprehensive entity definitions, relationships, and validation rules.

**Key Design Decisions**:
- All financial tables include `company_id` foreign key for RLS and data isolation
- Use `NUMERIC` type for all currency amounts (avoid floating point errors)
- Idempotency via `external_ref` on event tables (subscriptions, invoices, payments) + checksum on uploads
- Soft deletes not needed (financial data is append-only, snapshots are versioned by date)
- Indexes on: company_id, period_date, customer_id, cohort_month for fast queries
- RLS policies enforce org membership + role checks for write operations

### API Contracts

See [contracts/](./contracts/) directory for OpenAPI specifications:

1. **POST /api/companies/[id]/financials/upload** - Upload CSV data (multipart/form-data)
2. **GET /api/companies/[id]/financials/summary** - Retrieve KPI metrics + trends
3. **GET /api/companies/[id]/financials/cohorts** - Get cohort retention grid
4. **GET /api/companies/[id]/financials/concentration** - Get revenue concentration metrics
5. **GET /api/companies/[id]/financials/ar-ap-aging** - Get AR/AP aging analysis
6. **POST /api/companies/[id]/financials/recompute** - Trigger manual recalculation
7. **GET /api/companies/[id]/financials/export** - Generate and download PDF report

**Contract Principles**:
- All responses include `data` envelope + optional `meta` (e.g., last_calculated_at)
- Errors follow standard format: `{ error: { code, message, details } }`
- Date parameters use ISO 8601 (YYYY-MM-DD)
- Currency amounts returned as strings (avoid JSON number precision loss)
- Pagination via cursor-based approach for customer drill-downs

### Quickstart

See [quickstart.md](./quickstart.md) for step-by-step validation workflow.

**Quickstart Validates**:
1. CSV upload with mixed currencies → rejected with clear error
2. Valid single-currency CSV upload → success + auto-recalculation
3. Dashboard displays KPIs with formula tooltips
4. Cohort heatmap renders 24-month retention
5. Concentration chart flags >25% single customer
6. AR aging shows buckets + DSO trend
7. Benchmark comparison shows sector median deltas
8. PDF export generates board-ready report
9. Financial Editor can upload, Financial Admin can delete
10. Org members without role see read-only view

### Agent Context Update

See [CLAUDE.md](../../CLAUDE.md) (updated incrementally at repository root)

**Updates Added**:
- Financial Analytics feature overview (CSV ingestion, KPI calculation, benchmarking)
- New API routes: `/api/companies/[id]/financials/*`
- New components: `components/financials/*`
- New lib modules: `lib/financials/{calculators,ingestion,exports}`
- Database tables: 12 new financial tables with RLS
- Performance targets: <5s recalculation, <300ms API reads
- Permission model: Financial Editor/Admin roles
- Technology notes: papaparse, @react-pdf/renderer, recharts

**Output**: Phase 1 design artifacts complete ✓

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Template**: `.specify/templates/tasks-template.md`
2. **Generate from Artifacts**:
   - Each contract → contract test task [P] (7 tests)
   - Each calculator module → unit test task [P] (4 calculators)
   - Each entity in data-model.md → migration task (1 migration, all tables)
   - Each UI component → component task (9 components)
   - Each API route → implementation task (7 routes)
   - Quickstart scenarios → E2E test tasks (4 E2E tests)

**Ordering Strategy** (TDD + Dependency Order):

**Phase A: Foundation** [All parallel after migration]
- Task 1: Create migration (all 12 tables + RLS + indexes)
- Task 2-8: Write contract tests [P] (upload, summary, cohorts, concentration, ar-ap, recompute, export)
- Task 9-12: Write calculator unit tests [P] (KPI, cohort, concentration, AR/AP)

**Phase B: Ingestion & Calculation** [Depends on Phase A]
- Task 13: Implement CSV parser + validator (make upload contract test pass)
- Task 14: Implement KPI calculator (make summary contract test pass)
- Task 15: Implement cohort calculator (make cohorts contract test pass)
- Task 16: Implement concentration calculator (make concentration test pass)
- Task 17: Implement AR/AP calculator (make ar-ap test pass)

**Phase C: API Layer** [Depends on Phase B]
- Task 18: Implement POST /upload route
- Task 19: Implement GET /summary route
- Task 20: Implement GET /cohorts route
- Task 21: Implement GET /concentration route
- Task 22: Implement GET /ar-ap-aging route
- Task 23: Implement POST /recompute route

**Phase D: UI Components** [Can start parallel to Phase C]
- Task 24: Create KPI overview component [P]
- Task 25: Create cohort heatmap component [P]
- Task 26: Create concentration chart component [P]
- Task 27: Create AR/AP aging table component [P]
- Task 28: Create benchmark comparison component [P]
- Task 29: Create CSV upload zone component [P]
- Task 30: Create formula tooltip component [P]
- Task 31: Create anomaly banner component [P]

**Phase E: Pages** [Depends on Phase D]
- Task 32: Create financials dashboard page
- Task 33: Create CSV upload page

**Phase F: Export & Roles** [Depends on Phase B, C]
- Task 34: Implement PDF generator (make export contract test pass)
- Task 35: Implement GET /export route
- Task 36: Create financial_roles table + RLS policies
- Task 37: Add role check middleware to routes

**Phase G: E2E Validation** [Depends on all above]
- Task 38: Write E2E: CSV upload with validation [P]
- Task 39: Write E2E: Dashboard metrics display [P]
- Task 40: Write E2E: Cohort analysis view [P]
- Task 41: Write E2E: PDF export download [P]

**Phase H: Polish & Documentation**
- Task 42: Create CSV templates (5 files) + download links
- Task 43: Seed benchmark data (sector medians)
- Task 44: Add metric formula tooltips
- Task 45: Implement default anomaly thresholds
- Task 46: Performance testing (24-month recalc under 5s)

**Estimated Output**: 46 numbered, ordered tasks in tasks.md

**Parallel Execution Markers**:
- Contract tests: [P] Tasks 2-8
- Calculator unit tests: [P] Tasks 9-12
- UI components: [P] Tasks 24-31
- E2E tests: [P] Tasks 38-41

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation <5s recalc)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No constitutional violations detected (constitution not yet ratified for project)

**Notes**:
- If constitution is adopted, this feature may require justification for:
  - Additional database tables (12 new tables) vs. existing schema extension
  - New permission model vs. reusing existing roles (if any)
  - PDF generation library vs. simpler export formats

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - described approach) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅ 51 tasks ready
- [ ] Phase 4: Implementation complete ⏭ Next
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (constitution is template only)
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 clarifications answered, 4 deferred with defaults)
- [x] Complexity deviations documented (none - no constitution violations)

**Artifacts Generated**:
- [x] plan.md (this file)
- [x] research.md (Phase 0 output - 7 research decisions documented)
- [x] data-model.md (Phase 1 output - 13 entities, 1,078 lines)
- [x] contracts/*.json (Phase 1 output - 7 OpenAPI contracts, 2,767 lines)
- [x] quickstart.md (Phase 1 output - 10 validation scenarios, 644 lines)
- [x] CLAUDE.md update (Phase 1 output - context updated via script)
- [x] tasks.md (Phase 3 output - 51 implementation tasks, 843 lines)

---
**Status**: ✅ All planning phases complete. Ready for Phase 4 implementation following tasks.md
