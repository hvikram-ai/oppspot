
# Implementation Plan: ResearchGPT™ - Deep Company Intelligence

**Branch**: `003-researchgpt™-deep-company` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/003-researchgpt™-deep-company/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

ResearchGPT™ is an AI-powered company research agent that generates comprehensive intelligence reports for UK companies in under 30 seconds—work that would take a human 2 hours. The system analyzes 6 key dimensions: Company Snapshot, Buying Signals, Key Decision Makers, Revenue Signals, Recommended Approach, and Sources. Target users are SDRs and sales reps at the £99/month tier who currently spend 45-60 minutes manually researching companies before outreach.

**Core Value**: Transforms 2-hour manual research into 30-second AI-generated intelligence with verified sources, giving sales teams a competitive advantage by knowing things competitors don't.

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**: Next.js 15, Supabase (PostgreSQL + Auth), OpenRouter AI API, Zod (validation), shadcn/ui
**Storage**: Supabase PostgreSQL with pgvector extension for embeddings, smart caching layer (fundamentals: 7 days, signals: 6 hours)
**Testing**: Playwright E2E tests, React Testing Library for components
**Target Platform**: Vercel deployment (Linux server), responsive web (desktop primary, mobile secondary)
**Project Type**: Web (Next.js App Router with API routes)
**Performance Goals**: 95% of research requests complete in <30 seconds, page load <2 seconds, support 5 concurrent requests per user
**Constraints**: GDPR compliance for personal data, 100 researches/month per user quota, no social network scraping, must respect robots.txt
**Scale/Scope**: Target £99/month tier users, handle Companies House API rate limits, 10+ external data sources integration

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Architectural Patterns Compliance

**✅ PASS: Service Layer Pattern**
- ResearchGPT will follow existing `/lib/ai/scoring/` service pattern
- Encapsulate research logic in standalone service class
- Example: `research-gpt-service.ts` similar to `lead-scoring-service.ts`

**✅ PASS: API Route Pattern**
- Follow existing `/app/api/*/route.ts` structure
- RESTful endpoints with proper Next.js conventions
- Example: `/app/api/research/[companyId]/route.ts`

**✅ PASS: Component Organization**
- Follow existing `/components/` domain structure
- New components in `/components/research/` directory
- Use existing shadcn/ui components (no new UI libraries)

**✅ PASS: Database Pattern**
- Leverage existing Supabase client patterns
- Server-side: `createClient` from `@/lib/supabase/server`
- Client-side: `createClient` from `@/lib/supabase/client`
- RLS policies for multi-tenant data isolation

**✅ PASS: Testing Strategy**
- Playwright E2E tests for user flows
- No unit test requirement (consistent with existing codebase)
- Contract tests for API endpoints

**⚠️ JUSTIFIED: AI Integration Complexity**
- OpenRouter API already integrated (`/lib/ai/openrouter.ts`)
- Multiple data source orchestration required (complexity justified by business value)
- Caching layer needed for performance (reduces API costs)

## Project Structure

### Documentation (this feature)
```
specs/003-researchgpt™-deep-company/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── research-api.yaml    # OpenAPI spec
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Next.js 15 App Router Structure (existing)
app/
├── api/
│   └── research/
│       ├── [companyId]/route.ts         # Generate research report
│       ├── [companyId]/status/route.ts  # Check generation status
│       └── quota/route.ts               # Check user quota
├── business/[id]/
│   └── (add Research button to existing page)
└── (dashboard)/
    └── research/
        ├── page.tsx                     # Research history dashboard
        └── [reportId]/page.tsx          # View saved research report

components/
├── research/
│   ├── research-button.tsx              # "Research with AI" button
│   ├── research-report.tsx              # Main report display
│   ├── research-progress.tsx            # Real-time progress indicator
│   ├── research-snapshot.tsx            # Company snapshot section
│   ├── research-signals.tsx             # Buying signals section
│   ├── research-decision-makers.tsx     # Decision makers section
│   ├── research-revenue.tsx             # Revenue signals section
│   ├── research-approach.tsx            # Recommended approach section
│   └── research-sources.tsx             # Sources section
└── ui/                                   # Existing shadcn/ui (reuse)

lib/
├── research-gpt/
│   ├── research-gpt-service.ts          # Main orchestration service
│   ├── data-sources/
│   │   ├── companies-house-source.ts    # Companies House API
│   │   ├── news-source.ts               # News API integration
│   │   ├── jobs-source.ts               # Job board scraping
│   │   └── website-scraper.ts           # Company website scraping
│   ├── analyzers/
│   │   ├── snapshot-analyzer.ts         # Company snapshot analysis
│   │   ├── signals-analyzer.ts          # Buying signals detection
│   │   ├── decision-maker-analyzer.ts   # Key person identification
│   │   └── revenue-analyzer.ts          # Revenue signal analysis
│   ├── cache/
│   │   └── smart-cache-manager.ts       # Smart caching (7d/6h)
│   └── types/
│       └── research-types.ts            # TypeScript interfaces
└── ai/
    └── (reuse existing openrouter.ts)

supabase/migrations/
└── YYYYMMDD_research_gpt.sql            # Database schema

tests/
└── e2e/
    └── research-gpt.spec.ts             # Playwright E2E tests
```

**Structure Decision**: Option 2 (Web) - Next.js App Router with integrated frontend/API

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

The `/tasks` command will generate implementation tasks from Phase 1 artifacts:

1. **From data-model.md** → Database & Type tasks:
   - Task: Create PostgreSQL migration for 4 new tables
   - Task: Create TypeScript interfaces for 9 entities
   - Task: Create Zod validation schemas
   - Task: Create RLS policies for multi-tenancy

2. **From contracts/research-api.yaml** → API Route tasks:
   - Task: Implement POST `/api/research/[companyId]` endpoint
   - Task: Implement GET `/api/research/[companyId]` endpoint
   - Task: Implement GET `/api/research/[companyId]/status` endpoint
   - Task: Implement GET `/api/research/quota` endpoint
   - Task: Create contract tests for each endpoint (Playwright)

3. **From research.md** → Service Layer tasks:
   - Task: Create ResearchGPTService orchestrator
   - Task: Create CompaniesHouseDataSource
   - Task: Create NewsAPIDataSource
   - Task: Create JobBoardDataSource
   - Task: Create WebsiteScraperSource
   - Task: Create SmartCacheManager
   - Task: Create SnapshotAnalyzer
   - Task: Create BuyingSignalsAnalyzer
   - Task: Create DecisionMakerAnalyzer
   - Task: Create RevenueSignalsAnalyzer

4. **From spec.md user stories** → UI Component tasks:
   - Task: Create ResearchButton component
   - Task: Create ResearchProgressIndicator component
   - Task: Create ResearchReport container component
   - Task: Create 6 section components (Snapshot, Signals, etc.)
   - Task: Create QuotaDisplay component
   - Task: Create ExportPDF functionality
   - Task: Add Research button to business/[id]/page.tsx

5. **From quickstart.md** → E2E Test tasks:
   - Task: Write E2E test for happy path (generate research)
   - Task: Write E2E test for cached report
   - Task: Write E2E test for force refresh
   - Task: Write E2E test for quota exceeded
   - Task: Write E2E test for export PDF

**Ordering Strategy**:

1. **Phase A: Foundation** [Tasks 1-10]
   - Database migration
   - TypeScript types
   - RLS policies
   - Zod schemas
   - Mark [P] - Can be done in parallel

2. **Phase B: Data Layer** [Tasks 11-20]
   - Data source implementations (Companies House, News, Jobs, Website)
   - Cache manager
   - Dependency: Needs types from Phase A

3. **Phase C: Service Layer** [Tasks 21-30]
   - Analyzer implementations
   - ResearchGPTService orchestrator
   - Dependency: Needs data sources from Phase B

4. **Phase D: API Routes** [Tasks 31-35]
   - API endpoint implementations
   - Contract tests (should fail initially)
   - Dependency: Needs services from Phase C

5. **Phase E: UI Components** [Tasks 36-45]
   - Component implementations
   - Integration with business profile page
   - Dependency: Needs API routes from Phase D

6. **Phase F: E2E Tests & Polish** [Tasks 46-50]
   - E2E test implementation
   - PDF export
   - Performance optimization
   - GDPR compliance verification

**Estimated Output**: ~50 numbered, dependency-ordered tasks in tasks.md

**Task Template Example**:
```markdown
## Task 1: Create Database Migration [P]
**Type**: Database
**Estimated Time**: 30 minutes
**Dependencies**: None
**Files Created**:
- supabase/migrations/YYYYMMDD_research_gpt_schema.sql

**Acceptance Criteria**:
- Creates research_reports table with all fields from data-model.md
- Creates research_sections table
- Creates research_sources table
- Creates user_research_quotas table
- Creates all indexes
- Creates RLS policies
- Migration applies cleanly with `supabase db push`
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (design follows existing patterns)
- [x] All NEEDS CLARIFICATION resolved (completed in /clarify phase)
- [x] Complexity deviations documented (AI integration justified)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
