# Implementation Plan: Competitive Intelligence Dashboard

**Branch**: `014-1-competitive-intelligence` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-1-competitive-intelligence/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
   → Project Type: web (Next.js App Router)
   → Structure Decision: Extend existing oppspot app structure
3. Fill Constitution Check ✓
4. Evaluate Constitution Check
   → No violations - follows existing patterns
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md ✓
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update ✓
7. Re-evaluate Constitution Check
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Task generation approach ✓
9. STOP - Ready for /tasks command ✓
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Feature**: Competitive Intelligence Dashboard for M&A due diligence - enables analysts to compare acquisition targets against 8-15 competitors across feature parity, pricing, market positioning, and competitive moat strength.

**Primary Requirement**: Create a dashboard that reduces competitive analysis time from 2-3 weeks to 2-3 days by automating data gathering, scoring algorithms, and multi-format exports (PDF, Excel, PowerPoint).

**Technical Approach**:
- Extend existing oppspot Next.js 15 App Router with new `/competitive-analysis` routes
- Leverage ResearchGPT™ infrastructure for competitor data gathering
- Integrate with existing Supabase database for persistence and RLS
- Reuse existing AI capabilities (OpenRouter) for intelligent scoring
- Build on shadcn/ui component library for consistent UX

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 App Router
**Primary Dependencies**:
- Next.js 15 (App Router, Server Components, API Routes)
- Supabase (PostgreSQL + Auth + RLS)
- OpenRouter API (Claude Sonnet 3.5 for competitive analysis)
- shadcn/ui + Tailwind CSS
- Zustand (client state management)
- Playwright (E2E testing)
- Export libraries: `@react-pdf/renderer` (PDF), `exceljs` (Excel), `pptxgenjs` (PowerPoint)

**Storage**: Supabase PostgreSQL with Row Level Security (RLS)
**Testing**: Playwright E2E tests + Integration tests
**Target Platform**: Web (Vercel deployment, SSR + Client Components)
**Project Type**: web (frontend + backend unified in Next.js)

**Performance Goals**:
- Analysis generation: <2 minutes for 10 competitors
- Dashboard load: <3 seconds for existing analyses
- Export generation: <10 seconds per format

**Constraints**:
- On-demand data refresh only (no scheduled jobs)
- Per-target access control with sharing
- Must support 8-15 competitors per analysis
- 30-day staleness alerts on login

**Scale/Scope**:
- Target: 100-500 M&A analysts
- Concurrent analyses: 50-100 active deals
- Data retention: Indefinite for closed deals, 12 months for abandoned

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: This project does not have a formal constitution document yet (template placeholder exists). Applying standard Next.js + Supabase best practices:

### Implicit Principles (from CLAUDE.md):
- ✅ **App Router Pattern**: Use Next.js 15 App Router (not Pages Router)
- ✅ **Component Isolation**: Interactive components use 'use client' directive
- ✅ **Server-First**: Prefer server components when possible
- ✅ **Database Security**: Use Supabase RLS for access control
- ✅ **UI Consistency**: Extend existing shadcn/ui components
- ✅ **Type Safety**: TypeScript strict mode (after fixing existing tech debt)
- ✅ **Testing**: Playwright E2E tests for critical user flows

### Design Compliance:
- Uses existing `/app/api/` route pattern for APIs
- Follows `/app/(dashboard)/` protected route structure
- Stores data in Supabase with RLS policies matching existing `data_rooms` pattern
- Reuses ResearchGPT™ and AI infrastructure
- No new dependencies conflicting with existing stack

**Result**: PASS - Design aligns with existing architecture patterns

## Project Structure

### Documentation (this feature)
```
specs/014-1-competitive-intelligence/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api-spec.yaml    # OpenAPI specification
│   └── test-contracts/  # Contract test files
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root - extends existing oppspot structure)
```
app/
├── (dashboard)/
│   └── competitive-analysis/
│       ├── page.tsx                     # List all analyses (protected)
│       ├── [id]/
│       │   ├── page.tsx                 # View single analysis dashboard
│       │   ├── edit/page.tsx            # Edit analysis settings
│       │   └── share/page.tsx           # Manage access permissions
│       └── new/page.tsx                 # Create new analysis wizard
│
├── api/
│   └── competitive-analysis/
│       ├── route.ts                     # GET (list), POST (create)
│       ├── [id]/
│       │   ├── route.ts                 # GET, PATCH, DELETE
│       │   ├── refresh/route.ts         # POST: trigger data refresh
│       │   ├── export/route.ts          # GET: export to PDF/Excel/PPTX
│       │   ├── share/route.ts           # POST: invite users, DELETE: revoke
│       │   └── competitors/
│       │       └── route.ts             # POST: add competitor, DELETE: remove
│       └── stale-alerts/route.ts        # GET: check for stale analyses on login
│
components/
└── competitive-analysis/
    ├── analysis-list.tsx                # List view with filters
    ├── analysis-dashboard.tsx           # Main dashboard with charts
    ├── competitor-card.tsx              # Single competitor summary card
    ├── feature-matrix.tsx               # Side-by-side feature table
    ├── pricing-comparison.tsx           # Pricing chart component
    ├── moat-strength-radar.tsx          # Radar chart for moat scoring
    ├── stale-data-alert.tsx             # Login alert component
    ├── refresh-button.tsx               # Manual refresh trigger
    ├── export-dialog.tsx                # Export format selection
    ├── share-dialog.tsx                 # User invitation modal
    └── data-age-badge.tsx               # Visual freshness indicator
│
lib/
└── competitive-analysis/
    ├── types.ts                         # TypeScript interfaces
    ├── data-gatherer.ts                 # Competitor data fetching
    ├── scoring-engine.ts                # Feature parity & moat calculations
    ├── export-service.ts                # PDF/Excel/PPTX generation
    ├── repository.ts                    # Database CRUD operations
    └── utils.ts                         # Helper functions
│
supabase/
└── migrations/
    └── 20251031_competitive_intelligence.sql  # Database schema
│
tests/
├── e2e/
│   └── competitive-analysis.spec.ts     # End-to-end user flows
└── integration/
    ├── analysis-api.test.ts             # API route tests
    ├── scoring-engine.test.ts           # Scoring algorithm tests
    └── export-service.test.ts           # Export generation tests
```

**Structure Decision**: Extend existing Next.js App Router structure (Option 2: Web application) - frontend and backend unified in Next.js with API routes.

## Phase 0: Outline & Research

### Unknowns from Technical Context:
1. **FR-008 Resolution**: Approved data sources (web scraping, APIs, manual entry, hybrid?)
2. Export library selection for PowerPoint generation
3. Feature parity scoring algorithm design
4. Competitive moat strength calculation methodology
5. Integration points with existing ResearchGPT™ infrastructure

### Research Tasks:

**Task R1: Data Source Strategy**
- **Question**: How should competitor data be gathered given on-demand refresh constraint?
- **Options**:
  - Reuse ResearchGPT™ data sources (Companies House, News API, Website Scraper)
  - Add G2/Capterra/TrustRadius APIs for product features
  - Manual entry UI for proprietary intelligence
- **Decision**: Hybrid approach
  - Automatic: Extend ResearchGPT™ to fetch competitor websites, G2 reviews, LinkedIn
  - Manual: Provide spreadsheet import + form entry for features/pricing
- **Rationale**: Balances automation with analyst expertise; ResearchGPT™ already handles rate limiting and caching

**Task R2: PowerPoint Export Library**
- **Question**: Which library for PPTX generation in Node.js?
- **Options**: `pptxgenjs` vs `officegen` vs manual XML
- **Decision**: `pptxgenjs`
- **Rationale**: Active maintenance, TypeScript support, supports charts/tables, 50K+ downloads/month

**Task R3: Feature Parity Scoring Algorithm**
- **Question**: How to calculate 0-100 feature parity score?
- **Algorithm**:
  ```
  1. Identify feature universe (union of target + all competitor features)
  2. Categorize features (core, integrations, enterprise, mobile, etc.)
  3. Assign weights by category (core=40%, integrations=25%, enterprise=20%, other=15%)
  4. For each competitor:
     overlap = (features in both) / (features in target)
     differentiation = (unique target features) / (total target features)
     parity_score = (0.7 * overlap) + (0.3 * differentiation) * 100
  ```
- **Rationale**: Penalizes gaps, rewards differentiation; weights favor core functionality

**Task R4: Competitive Moat Strength Calculation**
- **Question**: How to compute 0-100 moat score from multiple factors?
- **Algorithm**:
  ```
  moat_score = weighted_average([
    feature_differentiation: 35%,  // Avg parity score vs all competitors
    pricing_power: 25%,             // Premium vs peers (positive if higher, with market justification)
    brand_recognition: 20%,         // G2 ratings, Gartner mentions, awards
    customer_lock_in: 10%,          // Contract length, switching costs indicators
    network_effects: 10%            // User base size, ecosystem size
  ])
  ```
- **Rationale**: Multi-factor captures Porter's Five Forces; weights emphasize product/brand over structural moats (easier to measure)

**Task R5: ResearchGPT™ Integration**
- **Question**: How to extend ResearchGPT™ for competitor batch analysis?
- **Design**:
  - Create new `lib/research-gpt/competitor-analyzer.ts`
  - Reuse existing `data-sources/` (Companies House, News, Website Scraper)
  - Add `analyzers/competitive-positioning.ts` for moat scoring
  - Use same OpenRouter + Claude Sonnet 3.5 for AI analysis
- **Rationale**: DRY principle; leverage existing rate limiting, error handling, caching

**Task R6: Historical Data Retention Policy**
- **Question**: How long to keep competitor snapshots?
- **Decision**:
  - Active analyses: Indefinite
  - Closed deals (target acquired): 24 months for post-mortem analysis
  - Abandoned deals: 12 months
  - Auto-archive flag set by user or after 90 days of inactivity
- **Rationale**: Supports learning from past deals while managing storage costs

### Consolidated Findings → research.md

(See `research.md` artifact generated below)

## Phase 1: Design & Contracts

*Prerequisites: research.md complete ✓*

### 1. Data Model Extraction

**Entities** (from spec Key Entities section):

1. **competitive_analyses** - Main analysis records
2. **competitive_analysis_competitors** - Junction table linking analyses to competitor companies
3. **competitor_companies** - Competitor company profiles (may reference existing `businesses` table)
4. **feature_matrix_entries** - Feature inventory with company possession flags
5. **feature_parity_scores** - Calculated scores per competitor pair
6. **pricing_comparisons** - Pricing model analysis per competitor
7. **market_positioning** - Market position characterizations
8. **competitive_moat_scores** - Composite moat strength records
9. **industry_recognitions** - Awards and analyst rankings
10. **data_source_citations** - Source attribution for audit trail
11. **analysis_snapshots** - Historical point-in-time records
12. **analysis_access_grants** - Per-target permission sharing

**Detailed schema** → `data-model.md`

### 2. API Contracts Generation

**REST API Endpoints** (from functional requirements):

**Analyses Management**:
- `GET /api/competitive-analysis` - List user's analyses
- `POST /api/competitive-analysis` - Create new analysis
- `GET /api/competitive-analysis/[id]` - Get single analysis with dashboard data
- `PATCH /api/competitive-analysis/[id]` - Update analysis metadata
- `DELETE /api/competitive-analysis/[id]` - Soft delete analysis

**Data Operations**:
- `POST /api/competitive-analysis/[id]/refresh` - Trigger on-demand data refresh
- `POST /api/competitive-analysis/[id]/competitors` - Add competitor to analysis
- `DELETE /api/competitive-analysis/[id]/competitors/[competitorId]` - Remove competitor

**Sharing & Permissions**:
- `POST /api/competitive-analysis/[id]/share` - Invite user (email or user_id)
- `DELETE /api/competitive-analysis/[id]/share/[grantId]` - Revoke access

**Export**:
- `GET /api/competitive-analysis/[id]/export?format=pdf|excel|pptx` - Download export

**Alerts**:
- `GET /api/competitive-analysis/stale-alerts` - Check for stale analyses on login

**OpenAPI Spec** → `contracts/api-spec.yaml`

### 3. Contract Tests Generation

**Test Files** (one per endpoint category):
- `contracts/test-analysis-crud.ts` - Create, read, update, delete analyses
- `contracts/test-refresh.ts` - Data refresh triggers
- `contracts/test-sharing.ts` - Permission grants and revocations
- `contracts/test-export.ts` - Export format generation
- `contracts/test-stale-alerts.ts` - Staleness detection

**Tests MUST fail** (no implementation yet) - validates request/response schemas only.

### 4. Integration Test Scenarios

**From User Stories** (Acceptance Scenarios 1-7):
1. Create analysis + add competitors → verify feature parity scores generated
2. View dashboard → verify all visualizations render
3. Trigger refresh → verify updated timestamps and recalculated scores
4. Export to PDF/Excel/PowerPoint → verify file format and content
5. Access control → verify owner-only default, sharing works, revocation works
6. Update competitor list → verify delta highlighting
7. Stale data alert → verify login alert appears after 30 days

**Output**: `tests/e2e/competitive-analysis.spec.ts`

### 5. Update CLAUDE.md

**Incremental Update**:
- Run `.specify/scripts/bash/update-agent-context.sh claude`
- Add Competitive Intelligence Dashboard section after Data Room
- Document new API routes, components, database tables
- Update Recent Changes (keep last 3 features)
- Keep under 150 lines total

**Output**: Updated `/home/vik/oppspot/CLAUDE.md`

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 design docs in dependency order:

**Migration & Schema** (1 task):
- Create Supabase migration with all 12 tables + RLS policies

**Contract Tests** (5 tasks, parallelizable):
- [P] Write contract tests for analysis CRUD
- [P] Write contract tests for refresh operations
- [P] Write contract tests for sharing/permissions
- [P] Write contract tests for export endpoints
- [P] Write contract tests for stale alerts

**Core Library** (6 tasks, some parallel):
- [P] Implement `lib/competitive-analysis/types.ts`
- [P] Implement `lib/competitive-analysis/repository.ts`
- Implement `lib/competitive-analysis/data-gatherer.ts` (depends on ResearchGPT™)
- Implement `lib/competitive-analysis/scoring-engine.ts`
- Implement `lib/competitive-analysis/export-service.ts`
- [P] Implement `lib/competitive-analysis/utils.ts`

**API Routes** (7 tasks, after library):
- Implement analysis CRUD endpoints
- Implement refresh endpoint
- Implement competitor add/remove endpoints
- Implement sharing endpoints
- Implement export endpoint
- Implement stale-alerts endpoint
- Add authentication middleware

**UI Components** (10 tasks, some parallel after API):
- [P] Implement `analysis-list.tsx`
- Implement `analysis-dashboard.tsx` (main page, depends on all other components)
- [P] Implement `competitor-card.tsx`
- [P] Implement `feature-matrix.tsx`
- [P] Implement `pricing-comparison.tsx`
- [P] Implement `moat-strength-radar.tsx`
- [P] Implement `stale-data-alert.tsx`
- [P] Implement `refresh-button.tsx`
- [P] Implement `export-dialog.tsx`
- [P] Implement `share-dialog.tsx`

**Pages** (4 tasks, after components):
- Implement `/competitive-analysis` list page
- Implement `/competitive-analysis/new` creation wizard
- Implement `/competitive-analysis/[id]` dashboard page
- Implement `/competitive-analysis/[id]/share` permissions page

**Integration Tests** (7 tasks, after pages):
- E2E test: Create analysis workflow
- E2E test: View dashboard and charts
- E2E test: Refresh data flow
- E2E test: Export to PDF/Excel/PowerPoint
- E2E test: Sharing and access control
- E2E test: Update competitors
- E2E test: Stale data alerts

**Total Estimated**: 40 numbered, ordered tasks in tasks.md

**Ordering Strategy**:
- TDD order: Contract tests → Library → API → UI → Integration tests
- Dependency order: Types → Repository → Business logic → API → Components → Pages
- Mark [P] for parallel execution (independent files/modules)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation (run all tests, verify <2 min performance, test exports)

## Complexity Tracking

*No constitutional violations - this section is empty*

This feature follows existing oppspot architectural patterns and introduces no new complexity requiring justification.

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 of 7 during /clarify, 2 in research)
- [x] Complexity deviations documented (none)

---

**Next Command**: `/tasks` to generate the implementation task list

*Plan completed 2025-10-31 | Ready for task generation*
