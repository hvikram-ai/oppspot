
# Implementation Plan: Command Center Dashboard Redesign

**Branch**: `004-command-center-dashboard-redesign` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/004-command-center-dashboard-redesign/spec.md`

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

Transform oppSpot's post-login dashboard from a static information display into a proactive **Command Center** that shows immediate value, guides goal-oriented workflows, and makes premium features (ResearchGPT™, Opp Scan) impossible to miss.

**Primary Requirements**:
- Goal-based navigation (5 groups: Command Center, Discover, Intelligence, Pipeline, Workspace)
- AI-powered daily digest showing overnight discoveries and priority actions
- Impact metrics (time saved, revenue sourced) instead of vanity metrics
- Mobile-first responsive design with bottom navigation
- < 60 second time-to-first-value for new users
- 80% feature discovery rate for ResearchGPT™ within first week

**Technical Approach**:
- React/Next.js 15 frontend with App Router (existing stack)
- shadcn/ui component library (already in use)
- Framer Motion for animations (already installed)
- Responsive breakpoints: Mobile <768px, Tablet 768-1024px, Desktop >1024px
- Progressive Web App (PWA) capabilities for offline/mobile
- Supabase for user preferences and dashboard state persistence

## Technical Context
**Language/Version**: TypeScript 5.x, React 18, Next.js 15
**Primary Dependencies**:
- UI: shadcn/ui, Tailwind CSS, Framer Motion, Lucide React icons
- State: Zustand (client state), Supabase (persistence)
- Data: Supabase PostgreSQL, Supabase Auth
- Date handling: date-fns
**Storage**: Supabase PostgreSQL for user preferences, dashboard config, AI digest data
**Testing**: Playwright (E2E), React Testing Library (component tests)
**Target Platform**: Modern browsers (Chrome 90+, Safari 14+, Firefox 88+), PWA-capable
**Project Type**: Web application (Next.js App Router frontend + Supabase backend)
**Performance Goals**:
- First Contentful Paint < 1.0s
- Time to Interactive < 2.5s
- Lighthouse score > 90
- 60fps animations
**Constraints**:
- Must not break existing functionality
- Preserve all current features (reorganize only)
- Works on slow 3G networks
- Offline-capable (PWA with cached data)
- WCAG 2.1 AA accessible
**Scale/Scope**:
- Single dashboard page with 8-10 component cards
- 5 navigation groups with ~15 total links
- ~20 new React components
- Mobile + tablet + desktop responsive layouts
- Support 10,000+ items in priority queue without lag

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Component Architecture
- ✅ **Reuse existing shadcn/ui components**: No new UI library dependencies
- ✅ **Follow Next.js App Router patterns**: Server/client components properly separated
- ✅ **Preserve existing API contracts**: Dashboard uses current endpoints, no breaking changes

### Testing Strategy
- ✅ **E2E tests first** (TDD): Playwright tests written before implementation
- ✅ **Component test coverage**: React Testing Library for interactive components
- ✅ **Visual regression**: Screenshot tests for responsive layouts

### Performance Standards
- ✅ **Lighthouse score > 90**: Verified before deployment
- ✅ **Bundle size budget**: No significant increase (track with `npm run build`)
- ✅ **Accessibility**: WCAG 2.1 AA compliance verified with axe-core

### Simplicity Principles
- ✅ **No new state management**: Use existing Zustand stores or React state
- ✅ **No new routing**: Leverage Next.js App Router, no client-side router
- ✅ **Incremental rollout**: Feature flags for gradual deployment

### Data Model Constraints
- ✅ **Extend existing schema**: Add new tables for dashboard_preferences, ai_digest
- ✅ **No breaking schema changes**: Additive migrations only
- ✅ **RLS policies**: Row-level security for user-scoped data

**Initial Gate Status**: ✅ PASS - No constitutional violations identified

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

**Structure Decision**: Option 2 (Web Application) - Next.js App Router structure

**Actual Project Structure** (existing oppSpot architecture):
```
app/
├── dashboard/              # Current dashboard (to be redesigned)
│   └── page.tsx
├── (dashboard)/            # Dashboard route group
│   ├── search/
│   ├── lists/
│   ├── research/          # New: ResearchGPT history
│   └── ai-scoring/
└── api/                   # API routes

components/
├── dashboard/             # Dashboard components (to be enhanced)
│   ├── dashboard-wrapper.tsx
│   ├── stats-overview.tsx
│   ├── quick-actions.tsx
│   └── recent-activity.tsx
├── layout/                # Navigation components
│   └── navbar.tsx         # To be redesigned
└── ui/                    # shadcn/ui components

lib/
├── supabase/             # Supabase client
└── utils/                # Utilities

tests/
└── e2e/                  # Playwright tests
```

**New Components to Create**:
```
components/
├── dashboard-v2/         # NEW: Redesigned dashboard components
│   ├── ai-digest-card.tsx
│   ├── priority-queue.tsx
│   ├── impact-metrics.tsx
│   ├── research-gpt-launcher.tsx
│   ├── feature-spotlight.tsx
│   └── enhanced-stats-grid.tsx
├── navigation/           # NEW: Goal-based navigation
│   ├── goal-based-nav.tsx
│   ├── contextual-sidebar.tsx
│   ├── mobile-bottom-nav.tsx
│   └── command-palette.tsx
└── ui/                   # Extensions to shadcn/ui
    └── skeleton-loader.tsx
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

The `/tasks` command will generate a comprehensive task list by analyzing:
1. **Data Model** (`data-model.md`) → Database migration tasks
2. **API Contracts** (`contracts/dashboard-api.yaml`) → API endpoint implementation tasks
3. **Quickstart Scenarios** (`quickstart.md`) → E2E test tasks
4. **Component Design** (from spec.md) → Component creation tasks

**Task Categories & Order**:

### Category 1: Database Foundation [P] (Parallel)
- Task 1-3: Create Supabase migrations for new tables
  - `dashboard_preferences` table
  - `ai_digest` table
  - `priority_queue_items` table
  - `feature_interactions` table
  - `dashboard_views` table
  - `feature_spotlight_config` table
- Task 4: Create database triggers and functions (priority score calculation)
- Task 5: Set up RLS policies for all new tables

### Category 2: E2E Tests First (TDD) [P] (Parallel where possible)
- Task 6-13: Write Playwright E2E tests for each quickstart scenario
  - Test: New user first experience (<60s time-to-value)
  - Test: Power user daily workflow (AI digest + priority queue)
  - Test: Feature discovery (ResearchGPT™ visibility)
  - Test: Mobile responsive layout (bottom nav, swipeable cards)
  - Test: Accessibility (keyboard nav, screen reader)
  - Test: Performance (Lighthouse score >90)
  - Test: Personalization (preferences persist)
  - Test: Error handling (offline mode, API failures)
- **Note**: All tests will FAIL initially (no implementation yet)

### Category 3: API Endpoints (Make Tests Pass)
- Task 14-21: Implement API routes from contracts (TDD approach)
  - `GET /api/dashboard/preferences`
  - `PUT /api/dashboard/preferences`
  - `GET /api/dashboard/digest`
  - `POST /api/dashboard/digest` (generate)
  - `GET /api/dashboard/priority-queue`
  - `PATCH /api/dashboard/priority-queue/[id]`
  - `GET /api/dashboard/metrics`
  - `GET /api/dashboard/spotlight`
  - `POST /api/dashboard/interactions` (analytics)
  - `POST /api/dashboard/analytics/view` (page tracking)

### Category 4: Core Components [P] (Parallel)
- Task 22-29: Create new dashboard components
  - `components/dashboard-v2/ai-digest-card.tsx`
  - `components/dashboard-v2/priority-queue.tsx`
  - `components/dashboard-v2/impact-metrics.tsx`
  - `components/dashboard-v2/research-gpt-launcher.tsx`
  - `components/dashboard-v2/feature-spotlight.tsx`
  - `components/dashboard-v2/enhanced-stats-grid.tsx`

### Category 5: Navigation Redesign [Sequential]
- Task 30: Create `components/navigation/goal-based-nav.tsx`
- Task 31: Create `components/navigation/mobile-bottom-nav.tsx`
- Task 32: Create `components/navigation/contextual-sidebar.tsx`
- Task 33: Create `components/navigation/command-palette.tsx` (Cmd+K)
- Task 34: Update `components/layout/navbar.tsx` to use new navigation

### Category 6: Dashboard Page Integration [Sequential]
- Task 35: Update `app/dashboard/page.tsx` with new layout
- Task 36: Integrate all dashboard-v2 components
- Task 37: Add Suspense boundaries with skeleton loaders
- Task 38: Implement ISR with 60s revalidation

### Category 7: Responsive & Accessibility
- Task 39: Add mobile breakpoint styles (Tailwind responsive classes)
- Task 40: Implement swipeable card stacks for mobile
- Task 41: Add keyboard shortcuts and focus management
- Task 42: Ensure WCAG 2.1 AA compliance (aria labels, contrast, etc.)

### Category 8: PWA & Performance
- Task 43: Configure PWA manifest and service worker (Workbox)
- Task 44: Set up caching strategies (SWR for data, CacheFirst for assets)
- Task 45: Add offline fallback page
- Task 46: Optimize bundle (code splitting, lazy loading)

### Category 9: AI Digest Generation (Background Job)
- Task 47: Create Supabase Edge Function for digest generation
- Task 48: Set up cron job to run at 8am user timezone
- Task 49: Implement digest summary logic (query user activity, call OpenRouter API)
- Task 50: Test digest generation with real data

### Category 10: Analytics & Tracking
- Task 51: Implement feature interaction tracking (client-side)
- Task 52: Implement page view tracking (Web Vitals)
- Task 53: Create analytics dashboard (admin view)
- Task 54: Set up feature spotlight rotation algorithm

### Category 11: Polish & Launch Prep
- Task 55: Run Lighthouse audits, fix issues until >90 score
- Task 56: Visual regression tests (screenshot comparison)
- Task 57: Cross-browser testing (Chrome, Safari, Firefox)
- Task 58: Create feature flag for gradual rollout
- Task 59: Write deployment documentation
- Task 60: Final QA - run full quickstart validation

**Ordering Strategy**:
1. **Database first** (Tasks 1-5) - Foundation for everything
2. **Tests first** (Tasks 6-13) - TDD principle, defines acceptance criteria
3. **API layer** (Tasks 14-21) - Makes tests pass, provides data
4. **Components in parallel** (Tasks 22-29) - Independent UI pieces
5. **Integration sequentially** (Tasks 30-38) - Assemble pieces
6. **Polish & optimization** (Tasks 39-60) - Make it production-ready

**Parallelization Strategy**:
- Mark [P] for tasks that can run in parallel (no dependencies)
- Database migrations can run together
- E2E tests independent (parallel execution in CI)
- Components can be built simultaneously by team
- API endpoints mostly independent (parallel implementation)

**Estimated Output**: 60 numbered, dependency-ordered tasks in tasks.md

**Dependencies Graph** (simplified):
```
Database (1-5)
    ↓
Tests (6-13) [P]    API Endpoints (14-21) [P]    Components (22-29) [P]
    ↓                        ↓                            ↓
    Navigation (30-34) ────→ Dashboard Integration (35-38)
                                      ↓
                    Responsive/A11y (39-42) [P]    PWA/Perf (43-46) [P]
                                      ↓
                            AI Digest (47-50)    Analytics (51-54)
                                      ↓
                              Polish & Launch (55-60)
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
- [✅] Phase 0: Research complete (/plan command)
  - Created: `research.md` with all technical decisions documented
  - Resolved: 10 technology choices (navigation, AI digest, priority queue, etc.)
- [✅] Phase 1: Design complete (/plan command)
  - Created: `data-model.md` with 6 new database tables
  - Created: `contracts/dashboard-api.yaml` with 10 API endpoints
  - Created: `quickstart.md` with 8 validation scenarios
  - Updated: `CLAUDE.md` agent context file
- [✅] Phase 2: Task planning complete (/plan command - describe approach only)
  - Defined: 11 task categories
  - Estimated: 60 tasks with dependency graph
  - Documented: Parallelization strategy
- [ ] Phase 3: Tasks generated (/tasks command - not yet run)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [✅] Initial Constitution Check: PASS
  - No new UI libraries (using shadcn/ui)
  - Following Next.js App Router patterns
  - No breaking API changes
  - E2E tests first (TDD)
  - WCAG 2.1 AA compliance planned
- [✅] Post-Design Constitution Check: PASS
  - Reusing existing components where possible
  - Extending database schema (additive only)
  - No new state management (Zustand + React state)
  - Performance targets defined (<1s FCP, <2.5s TTI)
- [✅] All NEEDS CLARIFICATION resolved
  - All technical context filled (no NEEDS CLARIFICATION items)
  - Technology stack decisions documented in research.md
- [✅] Complexity deviations documented
  - No constitutional violations identified
  - Complexity justified by business requirements (see spec.md)

**Artifacts Generated**:
- ✅ `/specs/004-command-center-dashboard-redesign/spec.md` (32KB, comprehensive)
- ✅ `/specs/004-command-center-dashboard-redesign/plan.md` (this file)
- ✅ `/specs/004-command-center-dashboard-redesign/research.md` (35KB, 10 decisions)
- ✅ `/specs/004-command-center-dashboard-redesign/data-model.md` (25KB, 6 tables)
- ✅ `/specs/004-command-center-dashboard-redesign/contracts/dashboard-api.yaml` (OpenAPI 3.0)
- ✅ `/specs/004-command-center-dashboard-redesign/quickstart.md` (20KB, 8 scenarios)
- ✅ `/home/vik/oppspot/CLAUDE.md` (updated with new tech context)

**Next Command**: Run `/tasks` to generate detailed task list (tasks.md)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
