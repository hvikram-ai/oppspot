
# Implementation Plan: Data Room Q&A Copilot with Citations

**Branch**: `008-oppspot-docs-dataroom` | **Date**: 2025-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/008-oppspot-docs-dataroom/spec.md`

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
AI-powered Q&A system for data room documents using Retrieval-Augmented Generation (RAG). Users ask natural language questions about uploaded PDFs and receive grounded answers with verifiable citations to source documents. Key capabilities: semantic search over document chunks, streaming LLM responses, citation deep-linking, query history management, automatic retry logic, and GDPR-compliant data retention.

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**:
- Next.js 15.5.2 (App Router, API routes, Server Components)
- React 19.1.0 (Client components, streaming)
- Supabase 2.56.1 (Auth, Database, Storage, Vector search)
- @pinecone-database/pinecone 6.1.2 (Vector embeddings alternative)
- OpenRouter/LLMManager (Multi-provider LLM orchestration)
- pdf-parse 2.4.5 (Text extraction)
- pdfjs-dist 5.4.296 (PDF rendering)
- @radix-ui/* (UI components)
- Playwright 1.55.0 (E2E testing)

**Storage**:
- Supabase PostgreSQL (structured data: queries, citations, feedback, metadata)
- Supabase Storage (document files)
- Supabase pgvector extension (vector embeddings for semantic search)

**Testing**: Playwright for E2E tests, TypeScript for compile-time validation

**Target Platform**: Web application (browser-based, server-rendered with Next.js)

**Project Type**: Web (Next.js monorepo with frontend + backend in app/ directory)

**Performance Goals**:
- Query response: Complete answer in <7 seconds (FR-005)
- Vector retrieval: <300ms for 50K chunks (FR-031)
- Streaming start: Within 3 seconds of query submission
- Document processing: <2 seconds per 100 pages (typical)

**Constraints**:
- Rate limiting: 60 queries/hour per user per data room (FR-014)
- OCR: Best-effort only for scanned PDFs (FR-018b)
- No cross-room search (out of scope)
- GDPR compliance: Manual deletion + export required (FR-022a, FR-022b)

**Scale/Scope**:
- Multi-tenant: Hundreds of data rooms
- Document scale: Up to 50K text chunks per data room
- Query history: Indefinite retention with pagination
- Concurrent users: 100+ simultaneous queries expected

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file (`.specify/memory/constitution.md`) contains template placeholders only. Applying general best practices instead.

**Design Principles Applied**:
- ✅ **Modularity**: Feature implemented as isolated Q&A module within data-room domain
- ✅ **Test-First**: Contract tests and E2E tests will be written before implementation
- ✅ **Observability**: All queries, errors, and performance metrics logged (FR-025, FR-033, FR-040)
- ✅ **Security-First**: RBAC enforcement, PII sanitization, rate limiting built into design (FR-011-015)
- ✅ **Performance SLAs**: Measurable targets defined (7s query, 300ms retrieval)

**Complexity Justifications**:
- **Vector database required**: Semantic search over 50K chunks cannot be achieved with traditional SQL LIKE queries - requires pgvector/Pinecone
- **LLM integration required**: Core feature depends on natural language understanding and generation
- **Streaming architecture**: Required to meet 3-second perceived latency target for user experience

**Gate Status**: ✅ **PASS** - No constitutional violations, all complexity justified by functional requirements

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Next.js App Router structure (web application with frontend + backend unified)

### Actual Implementation Structure (oppspot codebase)
```
app/
├── api/
│   └── data-room/
│       └── [dataRoomId]/
│           ├── query/route.ts           # POST /api/data-room/[id]/query - Submit Q&A
│           ├── history/route.ts         # GET /api/data-room/[id]/history - Query history
│           └── feedback/route.ts        # POST /api/data-room/[id]/feedback - Submit feedback
│
├── (dashboard)/
│   └── data-room/
│       └── [id]/
│           ├── page.tsx                 # Main data room page
│           └── qa/
│               └── page.tsx             # Q&A interface page

components/
└── data-room/
    ├── qa-chat-interface.tsx           # Main chat UI component
    ├── qa-citation-card.tsx            # Citation display component
    ├── qa-history-panel.tsx            # History sidebar
    ├── qa-feedback-controls.tsx        # Helpful/Not helpful buttons
    └── qa-source-preview.tsx           # Document preview with highlighting

lib/
├── data-room/
│   └── qa/
│       ├── query-service.ts            # Core Q&A orchestration
│       ├── retrieval-service.ts        # Vector search + ranking
│       ├── citation-generator.ts       # Citation extraction logic
│       ├── rate-limiter.ts             # 60/hour enforcement
│       └── error-handler.ts            # Retry logic + error mapping
│
└── ai/
    └── qa-llm-client.ts                # LLM integration for Q&A

tests/
├── e2e/
│   └── data-room-qa.spec.ts            # Playwright E2E tests
└── contract/
    └── data-room-qa-api.contract.test.ts  # API contract tests

supabase/
└── migrations/
    └── 20250129_dataroom_qa.sql        # Schema for queries, citations, feedback
```

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

**Output**: ✅ research.md completed - All technical decisions documented

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

**Output**: ✅ Phase 1 Complete:
- data-model.md (6 new entities, schema extensions)
- contracts/ (4 OpenAPI specs: query, history, feedback, export/delete)
- quickstart.md (implementation guide with test scenarios)
- CLAUDE.md updated (feature context added)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
The `/tasks` command will generate tasks.md by extracting work items from Phase 1 artifacts:

1. **From data-model.md**:
   - Create migration SQL file (6 new tables + schema extensions)
   - Generate TypeScript types from entities
   - Create RLS policies for each table
   - Add vector index creation tasks

2. **From contracts/**:
   - Write contract tests for each API endpoint (4 files)
   - Create TypeScript interfaces matching OpenAPI schemas
   - Implement API route handlers (query, history, feedback, export/delete)
   - Add request validation using Zod schemas

3. **From quickstart.md test scenarios**:
   - Create E2E test file with 9 acceptance scenarios
   - Add performance test suite (retrieval <300ms, query <7s)
   - Create manual testing checklist document

4. **From spec.md functional requirements**:
   - Implement vector search service (FR-031)
   - Create document chunking service (FR-016, FR-017, FR-018)
   - Build LLM integration layer (FR-001-005)
   - Add streaming response handler (FR-004)
   - Implement rate limiting (FR-014)
   - Create error retry logic (FR-035)
   - Build citation generator (FR-006-010)
   - Add query history management (FR-021-022)
   - Create feedback system (FR-023-024)
   - Build OCR fallback (FR-018b-018c)

5. **UI Components**:
   - Create QAChatInterface component (FR-026)
   - Build CitationCard component (FR-027-028)
   - Add HistoryPanel component (FR-022)
   - Create FeedbackControls component (FR-023-024)
   - Build DocumentPreview with highlighting (FR-009)

**Ordering Strategy**:
1. **Phase 1: Database Foundation** [Sequential]
   - Migration SQL
   - TypeScript types
   - RLS policies

2. **Phase 2: Core Services** [Some parallel]
   - Document chunking [P]
   - Vector embeddings [P]
   - LLM client wrapper [P]
   - Rate limiter [P]
   - Query service (depends on above)

3. **Phase 3: API Layer** [Parallel after Phase 2]
   - POST /query route + contract test [P]
   - GET /history route + contract test [P]
   - POST /feedback route + contract test [P]
   - GET /export + DELETE /history routes + tests [P]

4. **Phase 4: UI Components** [Parallel]
   - QAChatInterface [P]
   - CitationCard [P]
   - HistoryPanel [P]
   - FeedbackControls [P]
   - DocumentPreview [P]

5. **Phase 5: Integration Tests** [After Phase 4]
   - E2E happy path scenarios
   - E2E error handling
   - E2E edge cases
   - Performance validation

6. **Phase 6: Polish & Documentation** [Final]
   - Error messages review
   - Loading states
   - Monitoring dashboard
   - Deployment guide

**Estimated Output**: ~40-45 numbered, dependency-ordered tasks in tasks.md

**Dependency Visualization**:
```
Database (1-3)
  → Services (4-10)
    → API Layer (11-18)
      → UI Components (19-28)
        → Integration Tests (29-38)
          → Polish (39-45)
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
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅ **47 tasks created**
- [ ] Phase 4: Implementation complete - NEXT STEP
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅ (All technical decisions finalized)
- [x] Complexity deviations documented ✅ (Vector DB and LLM justified)

**Artifacts Generated**:
- ✅ /specs/008-oppspot-docs-dataroom/research.md (10 technical decisions)
- ✅ /specs/008-oppspot-docs-dataroom/data-model.md (6 entities, schema)
- ✅ /specs/008-oppspot-docs-dataroom/contracts/ (4 OpenAPI specs)
- ✅ /specs/008-oppspot-docs-dataroom/quickstart.md (implementation guide)
- ✅ /home/vik/oppspot/CLAUDE.md (updated with feature context)
- ✅ /specs/008-oppspot-docs-dataroom/tasks.md (47 dependency-ordered tasks)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
