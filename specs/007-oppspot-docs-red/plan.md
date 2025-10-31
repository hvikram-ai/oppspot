# Implementation Plan: Red Flag Radar (Explainable Risk Detection)

**Branch**: `007-oppspot-docs-red` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/007-oppspot-docs-red/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ Project Type detected: Next.js web application
   ✓ Structure Decision: Next.js App Router structure
3. Fill the Constitution Check section
   ✓ No project constitution exists - using general best practices
4. Evaluate Constitution Check section
   ✓ No violations - standard Next.js patterns
5. Execute Phase 0 → research.md
   → In progress
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Pending
7. Re-evaluate Constitution Check section
   → Pending
8. Plan Phase 2 → Describe task generation approach
   → Pending
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Red Flag Radar is an AI-powered risk detection and explainability system for M&A due diligence. It automatically detects and tracks Financial, Legal, Operational, Cyber, and ESG red flags across companies and data rooms, linking each flag to concrete evidence with plain-language explanations and remediation suggestions. The system uses hybrid detection (rule-based + LLM-assisted), integrates with existing alert infrastructure, and provides board-ready exports.

**Primary User Need**: Due diligence analysts and investment committee members need to identify critical risks early, understand root causes through evidence, and prioritize remediation with confidence.

**Technical Approach**: Build on existing oppSpot infrastructure (`lib/alerts`, `lib/research-gpt`, `lib/ai/rag`) using Supabase for storage, Next.js App Router for APIs/UI, and OpenRouter for AI classification. Implement parallel detector architecture with fingerprint-based deduplication and confidence scoring.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15 (App Router)
**Primary Dependencies**:
- Next.js 15 with App Router and Turbopack
- Supabase (PostgreSQL + Auth + RLS)
- OpenRouter API (Claude for LLM classification)
- Tailwind CSS + shadcn/ui components
- Zustand (state management)
- Playwright (E2E testing)
- Existing modules: `lib/alerts`, `lib/research-gpt`, `lib/ai/rag`

**Storage**: Supabase PostgreSQL with pgvector for document chunks
- Tables: `red_flag_runs`, `red_flags`, `red_flag_evidence`, `red_flag_actions`
- RLS policies based on org/data room membership
- Indexes on (entity_type, entity_id, category, severity, status)

**Testing**:
- Playwright E2E tests (Chromium, Firefox, WebKit)
- Integration tests for detector logic
- Unit tests for fingerprinting and deduplication
- Contract tests for API endpoints

**Target Platform**: Web (production on Vercel)

**Project Type**: web (Next.js App Router - frontend + backend integrated)

**Performance Goals**:
- Detection runs: <10s for 12 months data + 5k documents (target, not hard requirement)
- API reads: <300ms cached
- Export generation: <5s for PDF/CSV
- 95th percentile response times: <500ms for list views

**Constraints**:
- Must integrate with existing alert system (`lib/alerts/alert-service.ts`)
- Must reuse Research GPT explainability patterns
- Must maintain RLS security for multi-tenant access
- PII scrubbing required in evidence previews
- Audit trail required for all status changes

**Scale/Scope**:
- Support for 1000+ companies and data rooms per organization
- Handle 10,000+ documents per entity (batch processing acceptable)
- Store 100,000+ flags with full history
- Support concurrent detection runs per entity

**User-Provided Context**: Implementation details from RED_FLAG_RADAR_SPEC.md include:
- Hybrid detection using both rules and LLM classification
- Evidence linking to document chunks (page/chunk refs), alerts, signals, KPIs, news
- Explainability via Research GPT with caching
- Alert mapping: Critical→P1, High→P2, Medium→P3, Low→no alert
- Dashboard integration showing top 3 flags per entity
- PDF export with board-ready formatting

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**No Project Constitution Found**: Using general Next.js/TypeScript best practices.

### General Design Principles Applied:
- ✅ **Modularity**: Detectors organized under `lib/alerts/detectors/red-flags/*`
- ✅ **Reusability**: Leverage existing `lib/alerts`, `lib/research-gpt`, `lib/ai/rag`
- ✅ **Testability**: TDD approach with contract, integration, and E2E tests
- ✅ **Type Safety**: Full TypeScript with Zod for runtime validation
- ✅ **Security**: RLS policies, RBAC, audit logging, PII scrubbing
- ✅ **Performance**: Parallel detector execution, caching, batch processing
- ✅ **Observability**: Structured logging, run tracking, stats collection

### Next.js App Router Patterns:
- ✅ Server Components for data fetching
- ✅ Client Components with 'use client' for interactivity
- ✅ API routes in `app/api/` with route.ts
- ✅ Supabase client pattern (server vs client)
- ✅ Type-safe database queries

**Status**: PASS ✓ - No constitutional violations detected

## Project Structure

### Documentation (this feature)
```
specs/007-oppspot-docs-red/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api-red-flags-list.yaml
│   ├── api-red-flags-detail.yaml
│   ├── api-red-flags-recompute.yaml
│   ├── api-red-flags-actions.yaml
│   └── api-red-flags-export.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (Next.js App Router structure)
```
app/
├── api/
│   ├── companies/[id]/red-flags/
│   │   ├── route.ts                    # GET list, recompute trigger
│   │   ├── [flagId]/
│   │   │   ├── route.ts                # GET detail
│   │   │   └── actions/route.ts        # POST actions
│   │   └── export/route.ts             # GET export
│   └── data-rooms/[id]/red-flags/      # Same structure as companies
│       └── [similar routes]

lib/
├── red-flags/
│   ├── types.ts                         # TypeScript interfaces
│   ├── red-flag-service.ts              # Main orchestration service
│   ├── detectors/
│   │   ├── base-detector.ts             # Abstract detector interface
│   │   ├── financial-detector.ts        # Revenue concentration, NRR, AR aging
│   │   ├── legal-detector.ts            # Contract clause analysis (LLM)
│   │   ├── operational-detector.ts      # SLA, backlog, supplier deps
│   │   ├── cyber-detector.ts            # Security incidents, policies (LLM)
│   │   └── esg-detector.ts              # Disclosure gaps, news sentiment
│   ├── consolidation/
│   │   ├── fingerprint.ts               # Deduplication logic
│   │   └── merger.ts                    # Evidence merging
│   ├── explainability/
│   │   ├── explainer-service.ts         # Research GPT integration
│   │   └── remediation-generator.ts     # Suggestion generation
│   └── utils/
│       ├── evidence-linker.ts           # Link to chunks/alerts/KPIs
│       └── pii-scrubber.ts              # Privacy protection
├── stores/
│   └── red-flags-store.ts               # Zustand state management
└── supabase/
    └── migrations/
        └── 20251029_red_flags_schema.sql

components/
├── red-flags/
│   ├── red-flag-list.tsx                # List view with filters
│   ├── red-flag-filters.tsx             # Category/severity/status filters
│   ├── red-flag-detail-drawer.tsx       # Detail view with evidence
│   ├── red-flag-card.tsx                # Individual flag display
│   ├── evidence-list.tsx                # Evidence with citations
│   ├── action-history.tsx               # Audit trail display
│   ├── bulk-actions.tsx                 # Multi-select operations
│   └── export-dialog.tsx                # PDF/CSV export UI
└── analytics/
    └── red-flags-summary.tsx            # Dashboard widget (top 3)

tests/
├── e2e/
│   ├── red-flags-list.spec.ts           # List, filter, search
│   ├── red-flags-detail.spec.ts         # Detail view, evidence clicks
│   ├── red-flags-actions.spec.ts        # Status changes, assignments
│   └── red-flags-export.spec.ts         # PDF/CSV generation
└── integration/
    ├── detectors/
    │   ├── financial-detector.test.ts
    │   ├── legal-detector.test.ts
    │   └── [other detectors]
    ├── consolidation.test.ts
    └── alert-integration.test.ts
```

**Structure Decision**: Next.js App Router (Option 2 variant) - Integrated frontend/backend using App Router conventions with `app/` and `lib/` directories.

## Phase 0: Outline & Research

### Research Areas

Based on Technical Context and the implementation spec, the following areas require research and decision-making:

#### 1. Detector Architecture Pattern
**Question**: What's the optimal pattern for parallel detector execution with partial failure handling?
**Research Needed**:
- Promise.allSettled vs worker pool patterns
- Error isolation and retry strategies
- Performance tuning for 5+ detectors

#### 2. Fingerprinting Algorithm
**Question**: What hashing/normalization strategy ensures accurate deduplication across detector runs?
**Research Needed**:
- Text normalization approaches (stemming, case folding)
- Attribute weighting for fingerprint stability
- False positive/negative rates

#### 3. LLM Classification Patterns
**Question**: How to structure prompts for reliable contract clause and policy gap detection?
**Research Needed**:
- Prompt engineering for legal/cyber domain
- Citation extraction techniques
- Confidence calibration approaches

#### 4. Evidence Linking Strategy
**Question**: How to efficiently resolve evidence references across heterogeneous sources (docs, alerts, KPIs)?
**Research Needed**:
- pgvector chunk retrieval patterns
- Cross-table join optimization
- Cache strategy for evidence metadata

#### 5. Export Generation Performance
**Question**: What PDF generation approach meets <5s target for large flag lists?
**Research Needed**:
- PDF libraries (Puppeteer, react-pdf, pdfkit)
- Streaming vs batch generation
- Template optimization

#### 6. Real-time vs Batch Detection
**Question**: Should detection be triggered on-demand, scheduled, or event-driven?
**Research Needed**:
- Trigger patterns for data updates
- Queue-based vs direct execution
- Rate limiting and resource management

### Decisions from Implementation Spec

The following decisions are already made in the technical spec and will be documented in research.md:

1. **Alert Severity Mapping**: Critical→P1, High→P2, Medium→P3, Low→no alert ✓
2. **Storage**: Supabase PostgreSQL with pgvector for document chunks ✓
3. **AI Provider**: OpenRouter API with Claude for LLM tasks ✓
4. **Evidence Types**: document, alert, signal, kpi, news ✓
5. **Flag Categories**: financial, legal, operational, cyber, esg ✓
6. **Status States**: open, reviewing, mitigating, resolved, false_positive ✓
7. **Explainability**: Research GPT integration with caching ✓

**Output**: research.md with consolidated findings

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

Extract entities from spec Key Entities section:
- RedFlagRun: Execution tracking
- RedFlag: Core risk entity with category, severity, confidence
- RedFlagEvidence: Evidence links with citations
- RedFlagAction: Audit trail entries
- Relationships and constraints

### 2. API Contracts (`contracts/`)

Generate OpenAPI specs for:
- `GET /api/(companies|data-rooms)/[id]/red-flags` - List with filters
- `GET /api/(companies|data-rooms)/[id]/red-flags/[flagId]` - Detail view
- `POST /api/(companies|data-rooms)/[id]/red-flags/recompute` - Trigger detection
- `POST /api/(companies|data-rooms)/[id]/red-flags/[flagId]/actions` - Record action
- `GET /api/(companies|data-rooms)/[id]/red-flags/export` - Export PDF/CSV

### 3. Contract Tests

Generate Playwright contract tests (will fail initially):
- Schema validation for each endpoint
- Authentication/authorization tests
- Error response validation

### 4. Integration Test Scenarios (`quickstart.md`)

Extract from Acceptance Scenarios:
1. View red flag list with filters
2. Receive notification for new critical flag
3. Review flag detail with evidence
4. Mark flag as false positive
5. Export flags to PDF
6. Handle severity escalation
7. Filter by category and status
8. Navigate to evidence source

### 5. Update CLAUDE.md

Run `.specify/scripts/bash/update-agent-context.sh claude` to update with:
- Red Flag Radar feature overview
- New API routes and patterns
- Detector architecture
- Integration points with alerts/research-gpt

**Output**: data-model.md, contracts/, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**From Contracts** (5 endpoints × 2 entity types = 10 contract tests):
1. Contract test: GET red-flags list [P]
2. Contract test: GET red-flags detail [P]
3. Contract test: POST recompute [P]
4. Contract test: POST actions [P]
5. Contract test: GET export [P]

**From Data Model** (4 core entities):
6. Create migration: red_flag_runs table with indexes [P]
7. Create migration: red_flags table with constraints [P]
8. Create migration: red_flag_evidence table with FK [P]
9. Create migration: red_flag_actions table with audit fields [P]
10. Create RLS policies for all tables [P]

**From Detectors** (5 detector types):
11. Implement base detector interface [P]
12. Implement financial-detector with rules
13. Implement operational-detector with rules
14. Implement legal-detector with LLM
15. Implement cyber-detector with LLM
16. Implement esg-detector with LLM + news

**Core Services**:
17. Implement red-flag-service orchestration
18. Implement fingerprint consolidation
19. Implement evidence linker
20. Implement explainer-service (Research GPT integration)
21. Implement remediation generator
22. Implement PII scrubber

**API Implementation** (5 route handlers × 2 entity types):
23. Implement GET red-flags list API
24. Implement GET red-flags detail API
25. Implement POST recompute API
26. Implement POST actions API
27. Implement GET export API (PDF)
28. Implement GET export API (CSV)

**UI Components** (8 components):
29. Implement red-flag-list with filters
30. Implement red-flag-detail-drawer
31. Implement evidence-list with citation links
32. Implement action-history display
33. Implement bulk-actions toolbar
34. Implement export-dialog
35. Implement red-flags-summary dashboard widget
36. Integrate with existing dashboard

**Alert Integration**:
37. Wire alert-service for Critical/High flags
38. Implement severity escalation detection
39. Add digest notification support

**Testing** (E2E scenarios):
40. E2E test: List view with filters and search
41. E2E test: Detail view with evidence navigation
42. E2E test: Status changes and assignments
43. E2E test: PDF/CSV export
44. E2E test: Notification on new critical flag

### Ordering Strategy

**Phase 1 (Foundation)**:
- Tasks 6-10: Database schema and RLS [P]
- Task 11: Base detector interface [P]

**Phase 2 (Detectors)**:
- Tasks 12-16: Detector implementations (financial/operational first, LLM later)

**Phase 3 (Services)**:
- Tasks 17-22: Core service layer (TDD with unit tests)

**Phase 4 (API)**:
- Tasks 1-5: Contract tests (fail initially)
- Tasks 23-28: API implementation (make tests pass)

**Phase 5 (UI)**:
- Tasks 29-36: Component implementation

**Phase 6 (Integration)**:
- Tasks 37-39: Alert system integration
- Tasks 40-44: E2E validation

**Parallelization**: Tasks marked [P] can run in parallel within each phase.

**Estimated Output**: 44 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No complexity violations detected. The design follows standard Next.js patterns and reuses existing infrastructure.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✓
- [x] Phase 1: Design complete (/plan command) ✓
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✓
- [x] Phase 3: Tasks generated (/tasks command) ✓
- [x] Phase 3.1: Setup & Infrastructure complete (5/5 tasks) ✓
- [x] Phase 3.2: Tests First (TDD) complete (13/13 tasks) ✓
- [ ] Phase 3.3: Core Implementation (0/15 tasks) - **READY TO START**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✓
- [x] Post-Design Constitution Check: PASS ✓
- [x] All NEEDS CLARIFICATION resolved (via research.md) ✓
- [x] Complexity deviations documented (none required) ✓

**Artifacts Generated**:
- [x] research.md - Technical decisions and architecture patterns
- [x] data-model.md - Database schema with 4 tables, indexes, RLS policies
- [x] contracts/ - 5 OpenAPI specs for all API endpoints
- [x] quickstart.md - 8 integration test scenarios
- [x] CLAUDE.md - Updated with Red Flag Radar context

---
*Based on oppSpot CLAUDE.md conventions - Next.js 15 App Router + Supabase + TypeScript*
