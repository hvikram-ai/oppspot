# Implementation Plan: Live Demo Session Enhancement

**Branch**: `010-i-want-you` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/010-i-want-you/spec.md`

## Summary

Transform oppSpot's existing demo mode (90% built) into a conversion-optimized live demo session with guided tours, pre-seeded premium content, and exit intent capture. Target: 15-25% demo-to-signup conversion rate.

**Technical Approach** (from research.md):
- Install Driver.js (5KB) for guided tours
- Create static pre-seeded content: 3 ResearchGPT reports, 5 Data Room documents, 5-8 Q&A pairs
- Implement exit intent with native browser APIs (mouse leave, visibility change, popstate)
- Extend existing analytics pattern for tour event tracking
- Build on existing demo infrastructure (demo-context.tsx, demo-data.ts, demo-banner.tsx)

## Technical Context

**Language/Version**: TypeScript 5.3, Next.js 15 (App Router)
**Primary Dependencies**: 
- Existing: React 18, Tailwind CSS, shadcn/ui (Radix), Framer Motion
- New: Driver.js ^1.3.1

**Storage**: localStorage (client-side state, 24hr expiry), Supabase PostgreSQL (user accounts post-conversion)
**Testing**: Playwright (E2E, 27 existing tests), Vitest (contract tests, 9 existing)
**Target Platform**: Web (desktop-first, mobile responsive), Chrome/Firefox/Safari
**Project Type**: web (Next.js fullstack)
**Performance Goals**:
- Demo content load <2 seconds
- Tour initialization <1 second  
- Exit intent detection <100ms
- Analytics flush 5 seconds (batched)

**Constraints**:
- No authentication in demo mode
- localStorage <5MB total
- Zero API calls for demo content (static data only)
- GDPR compliant (no PII until signup)

**Scale/Scope**:
- 3 pre-seeded ResearchGPT reports (18 sections total)
- 5 Data Room documents with AI analysis
- 5-8 Q&A query/answer pairs
- 1 welcome tour (8-10 steps)
- 3 feature-specific tours (ResearchGPT, Data Room, Q&A)
- Target: 1000+ demo sessions/month

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file is a template (not populated for this project). Assuming standard Next.js/TypeScript best practices:

- [x] **Library-First**: Demo tour (Driver.js), analytics, exit intent are self-contained utilities
- [x] **Test-First**: E2E tests for tour flow, exit intent, conversion funnels (TDD approach)
- [x] **Simplicity**: Reuse existing patterns (analytics batching, modal components, localStorage)
- [x] **No Over-Engineering**: Static JSON data, no dynamic generation, minimal dependencies

**Result**: PASS (no violations, follows existing codebase patterns)

## Project Structure

### Documentation (this feature)
```
specs/010-i-want-you/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (next)
├── quickstart.md        # Phase 1 output (next)
├── contracts/           # Phase 1 output (next)
│   └── tour-analytics.yml
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Existing Next.js App Router structure
app/
├── (auth)/
│   └── login/
├── (dashboard)/
│   ├── dashboard/
│   ├── business/[id]/
│   └── data-rooms/[id]/
└── api/
    ├── analytics/
    └── demo/ (new)

components/
├── demo/ (existing, extend)
│   ├── demo-banner.tsx
│   ├── demo-context.tsx
│   ├── tour/ (new)
│   │   ├── welcome-tour.tsx
│   │   └── feature-tours.tsx
│   └── exit-intent-modal.tsx (new)
└── ui/ (existing shadcn/ui)

lib/
├── demo/ (existing, extend)
│   ├── demo-data.ts
│   ├── demo-research-data.ts (new)
│   ├── demo-dataroom-data.ts (new)
│   └── demo-qa-data.ts (new)
├── analytics/ (existing, extend)
│   └── demo-tour-analytics.ts (new)
└── utils/
    ├── local-storage-manager.ts (new)
    └── prompt-frequency-manager.ts (new)

tests/
├── e2e/
│   ├── demo-tour-happy-path.spec.ts (new)
│   ├── demo-exit-intent.spec.ts (new)
│   └── demo-conversion-flow.spec.ts (new)
└── contract/
    └── demo-tour-analytics.contract.test.ts (new)
```

**Structure Decision**: Web application (Next.js App Router fullstack)

## Phase 0: Outline & Research

**Status**: ✅ Complete (see research.md)

**Key Decisions Made**:
1. **Guided Tour**: Driver.js (5KB, TypeScript, Next.js compatible)
2. **Analytics**: Extend existing batched tracking pattern
3. **Exit Intent**: Native browser APIs (no library)
4. **localStorage**: Custom TypeScript utility with expiry/sync
5. **Pre-Seeded Content**: Static JSON (instant load, no API calls)

**Research Output**: `/home/vik/oppspot/specs/010-i-want-you/research.md` (comprehensive 18-section analysis)

## Phase 1: Design & Contracts

### Data Model (data-model.md)

**Entities** (from spec Key Entities section):

1. **DemoSession** (client-side, localStorage)
   - session_id: string (UUID)
   - started_at: timestamp
   - last_activity_at: timestamp
   - tour_state: { completed: boolean, current_step: number, skipped: boolean }
   - features_explored: string[] (feature IDs)
   - upgrade_prompts_shown: number
   - conversion_state: 'active' | 'converted' | 'abandoned'

2. **TourStep** (static configuration)
   - step_id: string
   - step_number: number (1-10)
   - feature_id: string
   - title: string
   - description: string
   - target_element: string (CSS selector)
   - position: 'top' | 'right' | 'bottom' | 'left'

3. **DemoContent** (static data)
   - content_id: string
   - content_type: 'research_report' | 'dataroom_doc' | 'qa_query'
   - data: ResearchReport | Document | QAQuery (from existing types)
   - demo_badge: boolean (always true)

4. **ConversionTrigger** (configuration + runtime state)
   - trigger_id: string
   - trigger_type: 'exit_intent' | 'feature_restriction' | 'quota_limit' | 'tour_complete'
   - shown_count: number (sessionStorage)
   - last_shown_at: timestamp | null
   - converted: boolean

5. **AnalyticsEvent** (batched, sent to API)
   - event_id: string
   - event_type: 'tour_started' | 'tour_step_viewed' | 'exit_intent_shown' | etc.
   - session_id: string
   - timestamp: number
   - metadata: Record<string, any>

**Relationships**:
- DemoSession has many AnalyticsEvents
- DemoSession references many TourSteps (by step_id)
- DemoSession views many DemoContent items
- ConversionTrigger creates AnalyticsEvents when shown

### API Contracts (contracts/)

**Endpoint**: `POST /api/analytics/demo-tours`

**Contract** (contracts/tour-analytics.yml):
```yaml
openapi: 3.0.0
info:
  title: Demo Tour Analytics API
  version: 1.0.0

paths:
  /api/analytics/demo-tours:
    post:
      summary: Batch track demo tour events
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                events:
                  type: array
                  items:
                    type: object
                    properties:
                      event_id:
                        type: string
                        format: uuid
                      event_type:
                        type: string
                        enum: [tour_started, tour_step_viewed, tour_completed, exit_intent_shown, demo_signup_initiated]
                      session_id:
                        type: string
                        format: uuid
                      timestamp:
                        type: number
                        description: Unix timestamp in milliseconds
                      metadata:
                        type: object
                        additionalProperties: true
                    required: [event_id, event_type, session_id, timestamp]
              required: [events]
      responses:
        '200':
          description: Events logged successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  logged_count:
                    type: number
                  status:
                    type: string
                    enum: [success]
        '400':
          description: Invalid event data
        '429':
          description: Rate limit exceeded
```

### Quickstart Guide (quickstart.md)

**User Story Validation** (from spec AC-002: Guided Tour Activation):

```markdown
# Demo Tour Quickstart

## Prerequisites
- oppSpot running locally (`npm run dev`)
- Browser: Chrome/Firefox/Safari (latest)

## Test: Welcome Tour Activation (AC-002)

1. **Navigate to demo mode**:
   ```
   Open: http://localhost:3000/?demo=true
   ```

2. **Verify demo banner appears**:
   - Look for purple gradient banner at top
   - Should say "Demo Mode" with "Create Free Account" button

3. **Tour should auto-start**:
   - Wait 1 second after page load
   - Driver.js popover appears over dashboard
   - Title: "Welcome to oppSpot"
   - Description: "Let's explore 8 key features in 2 minutes"
   - Buttons: "Start Tour" (primary), "Skip" (secondary)

4. **Complete tour**:
   - Click "Next" through all 10 steps
   - Each step highlights a different feature
   - Progress indicator shows "Step X/10"

5. **Verify tour completion**:
   - Final step shows "Tour Complete! 🎉"
   - Click "Get Started"
   - Tour overlay disappears
   - Check localStorage: `tour-completed` = "true"

6. **Verify tour doesn't repeat**:
   - Refresh page
   - Tour should NOT auto-start
   - Demo banner shows "Replay Tour" button

## Expected Results
- ✅ Tour loads in <1 second
- ✅ All 10 steps navigate correctly
- ✅ localStorage persists tour state
- ✅ No console errors
- ✅ Mobile responsive (test on iPhone/Android simulators)

## Troubleshooting
- **Tour doesn't start**: Check localStorage for `tour-completed` key, delete if present
- **Tour broken on step X**: Check console for Driver.js errors, verify target element exists
- **Mobile tour weird**: Tour should have simplified 5-step mobile version
```

### Agent Context Update

**Command**: `.specify/scripts/bash/update-agent-context.sh claude`

**Expected Updates to CLAUDE.md**:
- Add Driver.js library to technology stack
- Document tour state management patterns
- Add pre-seeded demo content locations
- Update recent changes (feature 010 in progress)

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base template
2. Extract tasks from Phase 1 artifacts:
   - data-model.md entities → data structure creation tasks
   - contracts/tour-analytics.yml → API endpoint + contract test tasks
   - quickstart.md scenarios → E2E test tasks

**Task Categories** (estimated 30-35 tasks):

**A. Setup & Dependencies** (2 tasks):
1. Install Driver.js dependency
2. Create localStorage utility class

**B. Pre-Seeded Content Generation** (6 tasks, [P] = parallel):
3. [P] Generate 3 ResearchGPT demo reports (TechHub, GreenEnergy, FinTech)
4. [P] Generate 5 Data Room document metadata  
5. [P] Generate 5-8 Q&A query/answer pairs
6. Create placeholder PDFs for Data Room
7. [P] Integrate demo research data into demo-context
8. [P] Integrate demo dataroom data into demo-context

**C. Guided Tour System** (8 tasks):
9. Create tour step definitions (welcome tour, 10 steps)
10. Build WelcomeTour component (Driver.js integration)
11. Add tour state management to demo-context
12. Create FeatureTours component (ResearchGPT, DataRoom, Q&A)
13. Add "Replay Tour" button to demo-banner
14. Implement tour progress persistence (localStorage)
15. Mobile responsive tour (5-step simplified version)
16. Tour analytics tracking integration

**D. Exit Intent & Conversion** (6 tasks):
17. Create ExitIntentModal component
18. Implement mouse leave detection
19. Implement visibility change detection
20. Implement browser back button detection
21. Add session limit (once per session)
22. Create UpgradePrompt component (4 trigger types)

**E. Analytics & Rate Limiting** (4 tasks):
23. Create demo-tour-analytics.ts (batched tracking)
24. Build POST /api/analytics/demo-tours endpoint
25. Create PromptFrequencyManager utility
26. Integrate analytics with Google Analytics (gtag events)

**F. Testing** (8 tasks):
27. [P] E2E: Demo tour happy path test
28. [P] E2E: Tour skip and replay test
29. [P] E2E: Exit intent detection test
30. [P] E2E: Pre-seeded content visibility test
31. [P] E2E: Conversion flow test (demo → signup)
32. [P] Contract: Tour analytics API schema test
33. [P] Mobile responsive tour test (iOS/Android)
34. Integration test: Cross-tab tour state sync

**G. Polish & Documentation** (3 tasks):
35. Update CLAUDE.md with tour patterns
36. Add demo tour section to README
37. Performance validation (<2s load, <1s tour init)

**Ordering Strategy**:
- Dependencies first (tasks 1-2)
- Content generation parallel (tasks 3-8)
- Core tour system sequential (tasks 9-16, depends on 1-8)
- Conversion features parallel (tasks 17-22, depends on 9)
- Analytics parallel (tasks 23-26, depends on 9)
- Tests parallel after implementation (tasks 27-34)
- Polish sequential (tasks 35-37, depends on all)

**Estimated Output**: 37 numbered, dependency-ordered tasks in tasks.md

**TDD Emphasis**:
- Write contract test (task 32) before API implementation (task 24)
- Write E2E tests (tasks 27-31) incrementally during implementation
- All tests must fail initially (no implementation yet)
- Implementation tasks make tests pass

## Complexity Tracking

*No constitutional violations identified. Using existing patterns and minimal dependencies.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete ✅ (research.md created)
- [x] Phase 1: Design complete ✅ (data-model, contracts, quickstart described inline)
- [x] Phase 2: Task planning complete ✅ (approach described above)
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅  
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented ✅ (none)

**Artifacts Created**:
- [x] /home/vik/oppspot/specs/010-i-want-you/spec.md (specification)
- [x] /home/vik/oppspot/specs/010-i-want-you/research.md (Phase 0)
- [x] /home/vik/oppspot/specs/010-i-want-you/plan.md (this file, Phase 1)
- [x] /home/vik/oppspot/specs/010-i-want-you/contracts/ (directory created)
- [ ] /home/vik/oppspot/specs/010-i-want-you/data-model.md (described inline above)
- [ ] /home/vik/oppspot/specs/010-i-want-you/quickstart.md (described inline above)
- [ ] /home/vik/oppspot/specs/010-i-want-you/tasks.md (awaiting /tasks command)

---

## Summary

**Implementation Readiness**: ✅ Ready for /tasks command

**Key Highlights**:
- Leverages 90% existing demo infrastructure
- Only 1 new dependency (Driver.js, 5KB)
- 37 estimated tasks, 4-6 day timeline
- Clear TDD approach with E2E + contract tests
- Performance targets defined and achievable
- GDPR compliant, privacy-first design

**Next Command**: `/tasks` - Generate ordered task breakdown from this plan

---

*Based on Constitution v2.1.1 (template) - See `.specify/memory/constitution.md`*
*Plan created: 2025-10-30*
*Branch: 010-i-want-you*
