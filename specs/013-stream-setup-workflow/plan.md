
# Implementation Plan: Stream Setup Workflow with Goal-Oriented Configuration

**Branch**: `013-stream-setup-workflow` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-stream-setup-workflow/spec.md`

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
This feature implements a 3-step wizard workflow for creating goal-oriented streams (workspaces) with automated business profile creation and stream-scoped work management. The implementation builds on existing streams infrastructure (streams table with goal fields, /api/streams/goal endpoint) and adds: (1) Multi-step wizard UI for guided stream creation, (2) Business profile creation via AI-powered website analysis, (3) Stream context awareness to automatically scope all work to the active stream, and (4) Enhanced dashboard showing stream-specific assets with personalization based on user's business profile.

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**: React 19, Supabase (PostgreSQL + Auth + RLS), OpenRouter API (AI website analysis), shadcn/ui components, Zustand (state management)
**Storage**: Supabase PostgreSQL with existing streams, business_profiles (new), goal_templates (existing but untyped), stream_items (existing) tables; Stream context stored in Supabase auth.users.user_metadata (no new table)
**Testing**: Playwright E2E tests, contract tests for new API endpoints
**Target Platform**: Web application (Next.js SSR + client components), responsive design for desktop/tablet
**Project Type**: Web (frontend + backend API routes)
**Performance Goals**: Wizard step transitions <200ms, profile creation <30 seconds (AI website analysis), dashboard load <1 second, stream switching <300ms
**Constraints**: AI analysis must handle failed website scraping gracefully, wizard progress must persist on navigation away, profile reuse across org must enforce access control, stream context must not leak between sessions
**Scale/Scope**: Support 1000+ concurrent users, 100+ streams per org, unlimited profiles per org, 10K+ assets per stream, wizard must work on mobile viewports (responsive)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (Constitution template is not populated, proceeding with standard Next.js/React best practices)

No constitutional violations identified. The implementation follows standard Next.js App Router patterns, uses existing Supabase infrastructure, and maintains separation of concerns between UI (components), API logic (route handlers), and data access (Supabase client).

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

**Structure Decision**: Option 2 (Web application) - Next.js App Router with collocated frontend/backend

**Actual Repository Structure**:
```
app/
├── (dashboard)/
│   └── streams/
│       ├── new/                    # NEW: Wizard pages
│       │   ├── page.tsx           # Wizard container
│       │   └── [step]/page.tsx    # Dynamic step pages
│       └── [id]/
│           └── dashboard/page.tsx  # ENHANCED: Stream dashboard
├── api/
│   ├── streams/
│   │   ├── goal/route.ts          # EXISTING: Goal stream creation
│   │   └── wizard/route.ts        # NEW: Wizard progress persistence
│   └── profiles/
│       ├── route.ts                # NEW: List/create profiles
│       ├── [id]/route.ts          # NEW: Get/update/delete profile
│       └── analyze/route.ts        # NEW: AI website analysis

components/
├── streams/
│   ├── wizard/                     # NEW: Wizard components
│   │   ├── stream-wizard.tsx
│   │   ├── step-goal-selection.tsx
│   │   ├── step-business-impact.tsx
│   │   └── step-profile-setup.tsx
│   ├── profile/                    # NEW: Profile components
│   │   ├── profile-selector.tsx
│   │   ├── profile-creator.tsx
│   │   └── website-analyzer.tsx
│   └── dashboard/                  # ENHANCED: Dashboard components
│       ├── stream-context-indicator.tsx
│       ├── asset-grid.tsx
│       └── stream-switcher.tsx

lib/
├── stores/
│   ├── wizard-store.ts            # NEW: Wizard state management
│   └── stream-context-store.ts    # NEW: Active stream tracking
├── services/
│   ├── profile-analyzer.ts         # NEW: AI website analysis service
│   └── stream-personalization.ts   # NEW: Personalization logic
└── hooks/
    ├── use-wizard-progress.ts      # NEW: Wizard hooks
    └── use-stream-context.ts       # NEW: Stream context hooks

supabase/migrations/
└── 20251031000003_stream_workflow.sql  # NEW: Database schema changes
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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, contracts/, quickstart.md)
- Follow TDD approach: Tests → Implementation → Validation

**Task Categories**:

1. **Database Migration Tasks** (Phase 0):
   - Create migration file 20251031000003_stream_workflow.sql
   - Create business_profiles table with RLS policies
   - Seed goal_templates table (7 goal types)
   - Add business_profile_id column to streams table
   - Create indexes for query optimization
   - Test migration rollback

2. **API Contract Test Tasks** [P] (Phase 1):
   - Write contract tests for POST /api/profiles (create profile)
   - Write contract tests for GET /api/profiles (list profiles)
   - Write contract tests for GET /api/profiles/[id] (get single)
   - Write contract tests for PATCH /api/profiles/[id] (update profile)
   - Write contract tests for DELETE /api/profiles/[id] (delete profile)
   - Write contract tests for POST /api/profiles/analyze (trigger AI analysis)
   - Write contract tests for GET /api/profiles/[id]/analysis-status (poll status)
   - Write contract tests for POST /api/streams/wizard/progress (save progress)
   - Write contract tests for GET /api/streams/wizard/progress (retrieve progress)
   - Write contract tests for POST /api/streams/wizard/complete (create stream)
   - Write contract tests for GET /api/goal-templates (list templates)
   - All contract tests must FAIL initially (no implementation)

3. **Backend Implementation Tasks** (Phase 2):
   - Implement POST /api/profiles route handler
   - Implement GET /api/profiles route handler
   - Implement GET /api/profiles/[id] route handler
   - Implement PATCH /api/profiles/[id] route handler
   - Implement DELETE /api/profiles/[id] route handler (with usage check)
   - Implement POST /api/profiles/analyze route handler
   - Implement GET /api/profiles/[id]/analysis-status route handler
   - Implement website analyzer service (lib/services/profile-analyzer.ts)
   - Implement POST /api/streams/wizard/progress route handler
   - Implement GET /api/streams/wizard/progress route handler
   - Implement DELETE /api/streams/wizard/progress route handler
   - Implement POST /api/streams/wizard/complete route handler
   - Implement GET /api/goal-templates route handler
   - Enhance existing POST /api/streams/goal to accept business_profile_id
   - Verify all contract tests pass

4. **State Management Tasks** [P] (Phase 3):
   - Create wizard-store.ts (Zustand with sessionStorage persist)
   - Create stream-context-store.ts (Zustand with Supabase user_metadata sync)
   - Create use-wizard-progress.ts hook
   - Create use-stream-context.ts hook
   - Write unit tests for store logic

5. **UI Component Tasks** (Phase 4):
   - Create app/(dashboard)/streams/new/page.tsx (wizard container)
   - Create components/streams/wizard/stream-wizard.tsx (main wizard component)
   - Create components/streams/wizard/step-goal-selection.tsx (Step 1)
   - Create components/streams/wizard/step-business-impact.tsx (Step 2)
   - Create components/streams/wizard/step-profile-setup.tsx (Step 3)
   - Create components/streams/profile/profile-selector.tsx (existing profiles list)
   - Create components/streams/profile/profile-creator.tsx (new profile form)
   - Create components/streams/profile/website-analyzer.tsx (AI analysis progress)
   - Create components/streams/dashboard/stream-context-indicator.tsx (active stream badge)
   - Create components/streams/dashboard/stream-switcher.tsx (dropdown/modal)
   - Enhance app/(dashboard)/streams/[id]/dashboard/page.tsx (FR-017, FR-022-24)
   - Create components/streams/dashboard/asset-grid.tsx (categorized assets display)

6. **Personalization Engine Tasks** (Phase 5):
   - Implement lib/services/stream-personalization.ts
   - Layer 1: Implement filterByProfileCriteria() (SQL WHERE clauses)
   - Layer 2: Implement scoreByStrategicFit() (scoring algorithm)
   - Layer 3: Implement addAIRecommendations() (LLM contextual insights)
   - Integrate personalization into existing search routes
   - Add fit_score field to search results

7. **E2E Integration Test Tasks** (Phase 6):
   - Write E2E test: Complete wizard flow (new profile creation)
   - Write E2E test: Complete wizard flow (existing profile selection)
   - Write E2E test: Wizard progress persistence (navigation away and resume)
   - Write E2E test: AI website analysis success path
   - Write E2E test: AI website analysis failure (invalid URL)
   - Write E2E test: Stream-scoped work association (add company to stream)
   - Write E2E test: Stream context switching
   - Write E2E test: Dashboard asset display and counts
   - Write E2E test: Personalization (search results ranked by profile)
   - Write E2E test: Profile deletion prevention (in-use profile)

8. **Quickstart Validation Tasks** (Phase 7):
   - Execute quickstart.md user journey (manual testing)
   - Measure wizard transition performance (<200ms target)
   - Measure profile creation performance (<30s target)
   - Measure dashboard load performance (<1s target)
   - Measure stream switching performance (<300ms target)
   - Document any deviations from spec
   - Create bug/issue reports if needed

**Ordering Strategy**:
- **Sequential Dependencies**:
  - Phase 0 (migration) → Phase 1 (contract tests) → Phase 2 (backend)
  - Phase 3 (state) → Phase 4 (UI) → Phase 6 (E2E)
  - Phase 5 (personalization) can run in parallel with Phase 4
- **Parallel Execution** [P]:
  - All contract test tasks within Phase 1
  - State management tasks within Phase 3
  - UI component tasks within Phase 4 (if no shared dependencies)
- **TDD Order**: Tests always before implementation

**Estimated Output**: 60-70 numbered, ordered tasks in tasks.md

**Key Integration Points**:
- Task 15 (backend complete) → enables Task 20 (state testing)
- Task 25 (UI complete) → enables Task 40 (E2E testing)
- Task 50 (all implementation complete) → enables Task 60 (quickstart validation)

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
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 critical clarifications from /clarify)
- [x] Complexity deviations documented (None - no constitutional violations)

**Artifacts Generated**:
- ✅ `specs/013-stream-setup-workflow/plan.md` (this file)
- ✅ `specs/013-stream-setup-workflow/research.md` (Phase 0)
- ✅ `specs/013-stream-setup-workflow/data-model.md` (Phase 1)
- ✅ `specs/013-stream-setup-workflow/contracts/profiles-api.yaml` (Phase 1)
- ✅ `specs/013-stream-setup-workflow/contracts/wizard-api.yaml` (Phase 1)
- ✅ `specs/013-stream-setup-workflow/quickstart.md` (Phase 1)
- ✅ `CLAUDE.md` updated with feature context (Phase 1)

**Next Command**: `/tasks` - Generate task breakdown from plan

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
