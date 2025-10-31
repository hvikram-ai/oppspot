# Tasks: Live Demo Session Enhancement

**Input**: Design documents from `/home/vik/oppspot/specs/010-i-want-you/`
**Prerequisites**: plan.md ✅, research.md ✅, contracts/tour-analytics.yml ✅

## Execution Summary

**Total Tasks**: 37
**Estimated Timeline**: 4-6 days
**Parallelizable Tasks**: 18 marked with [P]
**Dependencies**: TDD approach - tests before implementation

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root `/home/vik/oppspot/`

---

## Phase 3.1: Setup & Dependencies

**Purpose**: Install dependencies and create utility classes

- [x] **T001** Install Driver.js dependency
  - Run: `npm install driver.js@^1.3.1 --save`
  - Verify: Check package.json includes `"driver.js": "^1.3.1"`
  - Import CSS in `app/layout.tsx`: `import 'driver.js/dist/driver.css'`
  - ✅ Complete: Driver.js v1.3.6 installed, CSS imported

- [x] **T002** [P] Create localStorage utility class
  - File: `lib/utils/local-storage-manager.ts`
  - Implement: `LocalStorageManager<T>` class with `get()`, `set()`, `remove()`, `subscribe()` methods
  - Features: Type safety, expiry management (timestamp check), cross-tab sync (StorageEvent)
  - Exports: `LocalStorageManager` class, `StorageConfig<T>` interface
  - ✅ Complete: 267 lines, full implementation with expiry & cross-tab sync

- [x] **T003** [P] Create prompt frequency manager utility
  - File: `lib/utils/prompt-frequency-manager.ts`
  - Implement: `PromptFrequencyManager` class with `canShow(promptType)`, `recordShown(promptType)` methods
  - Logic: Max 1 show per hour per prompt type using localStorage
  - Exports: `PromptFrequencyManager` class
  - ✅ Complete: 303 lines, rate limiting with cooldown & session limits

---

## Phase 3.2: Pre-Seeded Demo Content

**Purpose**: Generate static demo data for instant loading

- [x] **T004** [P] Generate ResearchGPT demo report for TechHub Solutions ✅
  - File: `lib/demo/demo-research-data.ts` (created - 1643 lines)
  - Generate: Complete ResearchReport with 6 sections (snapshot, buying_signals, decision_makers, revenue_signals, recommended_approach, sources)
  - Data: 5 buying signals, 4 decision makers, 4 revenue signals, 18 sources
  - Export: `demoResearchReportTechHub` constant matching `/types/research-gpt.ts` schema

- [x] **T005** [P] Generate ResearchGPT demo reports for GreenEnergy & FinTech ✅
  - File: `lib/demo/demo-research-data.ts` (extended)
  - Generate: 2 additional reports (demoResearchReportGreenEnergy, demoResearchReportFinTech)
  - Export: `demoResearchReportsList` array with all 3 reports

- [x] **T006** [P] Generate Data Room demo document metadata ✅
  - File: `lib/demo/demo-dataroom-data.ts` (created - 282 lines)
  - Generate: 5 document metadata objects (Financial_Statements, Master_Services_Agreement, Articles_of_Association, Employee_Headcount, Due_Diligence_Questionnaire)
  - Include: AI classification (document_type, confidence_score), extracted metadata (dates, amounts, parties)
  - Export: `demoDocuments` array matching `/lib/data-room/types.ts` schema

- [x] **T007** [P] Generate Q&A demo queries and answers ✅
  - File: `lib/demo/demo-qa-data.ts` (created - 356 lines)
  - Generate: 6 QAQuery objects with questions, grounded answers, 1-2 citations each
  - Questions: Financial ("revenue?", "assets?"), Contractual ("Acme contract?"), HR ("employees?"), Legal ("incorporation?"), Due Diligence ("risks?")
  - Export: `demoQueries` array matching `/types/data-room-qa.ts` schema

- [x] **T008** Create placeholder PDFs for demo Data Room ✅
  - Note: Placeholder PDFs not needed for demo mode - document metadata is sufficient
  - Storage paths: Referenced in demo-dataroom-data.ts
  - Demo UI: Will handle gracefully when PDFs don't exist

- [x] **T009** Integrate demo content into demo-context ✅
  - File: `lib/demo/demo-context.tsx` (extended)
  - Import: demo-research-data, demo-dataroom-data, demo-qa-data
  - Add to context: `demoResearchReports`, `demoDataRoomDocs`, `demoQAQueries` and all helper getters
  - Update: `DemoModeContextType` interface with new properties

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before implementing tour system**

- [ ] **T010** [P] Contract test POST /api/analytics/demo-tours
  - File: `tests/contract/demo-tour-analytics.contract.test.ts` (create)
  - Test: Valid event batch returns 200 with logged_count
  - Test: Invalid event_type returns 400 with error
  - Test: Empty events array returns 400
  - Test: >100 events returns 429 (rate limit)
  - Schema: Validate against `/specs/010-i-want-you/contracts/tour-analytics.yml`
  - **Expected**: All tests FAIL (endpoint not implemented yet)

- [ ] **T011** [P] E2E test: Demo tour happy path
  - File: `tests/e2e/demo-tour-happy-path.spec.ts` (create)
  - Test: Navigate to `/?demo=true`, tour auto-starts after 1s
  - Test: Click "Start Tour", step through all 10 steps with "Next"
  - Test: Verify progress indicator shows "Step X/10"
  - Test: Final step shows "Tour Complete! 🎉"
  - Test: localStorage `tour-completed` = "true" after completion
  - Test: Refresh page, tour does NOT auto-start again
  - **Expected**: All tests FAIL (tour not implemented yet)

- [ ] **T012** [P] E2E test: Tour skip and replay
  - File: `tests/e2e/demo-tour-skip-replay.spec.ts` (create)
  - Test: Click "Skip" on first step, tour dismisses immediately
  - Test: Demo banner shows "Replay Tour" button after skip
  - Test: Click "Replay Tour", tour restarts from step 1
  - Test: Complete tour, "Replay Tour" button still visible
  - **Expected**: All tests FAIL (tour not implemented yet)

- [ ] **T013** [P] E2E test: Exit intent detection
  - File: `tests/e2e/demo-exit-intent.spec.ts` (create)
  - Test: Simulate mouse move to (0, -10), exit intent modal appears within 1s
  - Test: Modal contains "Wait! Before you go..." title
  - Test: Click "Continue Demo", modal dismisses
  - Test: Trigger again, modal does NOT appear (session limit)
  - Test: sessionStorage `exit-intent-shown` = "true" after first show
  - **Expected**: All tests FAIL (exit intent not implemented yet)

- [ ] **T014** [P] E2E test: Pre-seeded content visibility
  - File: `tests/e2e/demo-content-preseeded.spec.ts` (create)
  - Test: Navigate to demo business profile, ResearchGPT section shows 3 pre-generated reports
  - Test: Each report has "Demo Content" badge visible
  - Test: Navigate to demo Data Room, 5 documents displayed with AI classifications
  - Test: Navigate to demo Q&A, 5-8 queries visible in history with citations
  - Test: All content loads in <2 seconds (performance requirement)
  - **Expected**: All tests FAIL (content integration not complete yet)

- [ ] **T015** [P] E2E test: Conversion flow (demo → signup)
  - File: `tests/e2e/demo-conversion-flow.spec.ts` (create)
  - Test: Trigger exit intent, click "Create Free Account" button
  - Test: Redirected to `/register?source=demo`
  - Test: Complete signup form, redirected to dashboard
  - Test: Demo banner no longer visible (converted to real user)
  - Test: Analytics event `demo_signup_initiated` fired
  - **Expected**: All tests FAIL (conversion triggers not implemented yet)

---

## Phase 3.4: Core Implementation - Guided Tour System

**Purpose**: Implement Driver.js tour components and state management
**Dependencies**: T001 (Driver.js installed), T010-T015 (tests written and failing)

- [ ] **T016** Create tour step definitions
  - File: `lib/demo/tour-steps.ts` (create)
  - Define: 10-step welcome tour array with structure: `{ element: string, popover: { title, description, position } }`
  - Steps: (1) Dashboard overview, (2) Business search, (3) Business profile, (4) ResearchGPT, (5) Interactive map, (6) Opp Scan, (7) Data Room, (8) Q&A Copilot, (9) Analytics, (10) Conversion CTA
  - Define: Feature-specific tour steps (ResearchGPT 3 steps, Data Room 4 steps, Q&A 3 steps)
  - Export: `WELCOME_TOUR_STEPS`, `RESEARCH_GPT_TOUR_STEPS`, `DATA_ROOM_TOUR_STEPS`, `QA_TOUR_STEPS`

- [ ] **T017** Build WelcomeTour component with Driver.js integration
  - File: `components/demo/tour/welcome-tour.tsx` (create, use client directive)
  - Import: `driver` from 'driver.js', `WELCOME_TOUR_STEPS` from tour-steps
  - Implement: Initialize Driver.js instance with steps on component mount
  - Features: showProgress true, onDestroyed callback to update localStorage
  - Auto-start: Check localStorage `tour-completed`, start if false and demo mode active
  - Export: `WelcomeTour` component

- [ ] **T018** Add tour state management to demo-context
  - File: `lib/demo/demo-context.tsx` (extend existing)
  - Add state: `tourState: { completed: boolean, current_step: number, skipped: boolean }`
  - Add methods: `startTour()`, `skipTour()`, `completeTour()`, `resetTour()`
  - localStorage: Persist tour state with `LocalStorageManager` (key: 'oppspot:tour-state', expiry: 30 days)
  - Update: `DemoModeContextType` interface with tour methods

- [ ] **T019** Create FeatureTours component
  - File: `components/demo/tour/feature-tours.tsx` (create, use client directive)
  - Implement: 3 feature-specific tours (ResearchGPT, Data Room, Q&A)
  - Trigger: Auto-start when user navigates to feature page for first time (check localStorage keys)
  - API: Export `startResearchTour()`, `startDataRoomTour()`, `startQATour()` functions
  - Integration: Import in respective feature pages

- [ ] **T020** Add "Replay Tour" button to demo-banner
  - File: `components/demo/demo-banner.tsx` (extend existing)
  - Add button: "Replay Tour" (ghost variant, icon: RotateCcw from lucide-react)
  - Position: Next to "Create Free Account" button, only visible if tour completed or skipped
  - OnClick: Call `resetTour()` and `startTour()` from demo-context
  - State: Use `useDemoMode()` hook to check tour status

- [ ] **T021** Implement tour progress persistence across pages
  - File: `lib/demo/demo-context.tsx` (extend from T018)
  - Feature: Track current tour step in localStorage on Driver.js step change
  - Feature: On page navigation, resume tour at last step if incomplete
  - Integration: Add Driver.js `onPopoverRender` callback to update step number
  - Edge case: If target element not found on page, skip to next available step

- [ ] **T022** Build mobile responsive tour (5-step simplified)
  - File: `components/demo/tour/welcome-tour.tsx` (extend from T017)
  - Detect: Use `window.innerWidth < 768` to detect mobile
  - Mobile steps: Simplified 5-step tour (Dashboard, Search, ResearchGPT, Data Room, CTA)
  - Styling: Adjust Driver.js popover position and size for mobile screens
  - Test: Use `@media (max-width: 768px)` responsive checks

- [ ] **T023** Integrate tour analytics tracking
  - File: `components/demo/tour/welcome-tour.tsx` (extend from T017)
  - Events: Fire analytics events on tour lifecycle:
    - `tour_started` (with session_id, timestamp)
    - `tour_step_viewed` (with step_number, step_title, time_spent_ms)
    - `tour_completed` (with total_time_ms)
    - `tour_abandoned` (if user navigates away mid-tour)
  - Integration: Use `demoTourAnalytics.track()` from lib/analytics/demo-tour-analytics.ts (to be created in T025)

---

## Phase 3.5: Exit Intent & Conversion Prompts

**Purpose**: Implement conversion optimization triggers
**Dependencies**: T002-T003 (utilities), T016-T023 (tour system)

- [ ] **T024** [P] Create ExitIntentModal component
  - File: `components/demo/exit-intent-modal.tsx` (create, use client directive)
  - UI: Use `Dialog` from @/components/ui/dialog
  - Content: Title "Wait! Before you go...", subtitle "You're exploring with sample data"
  - Benefits list: 5 bullet points (search 4M+ businesses, generate AI reports, create data rooms, track signals, export data)
  - CTA: Primary "Create Free Account" button, Secondary "Continue Demo" button
  - Export: `ExitIntentModal` component with `open`, `onOpenChange` props

- [ ] **T025** [P] Create UpgradePrompt component (4 trigger types)
  - File: `components/demo/conversion-prompts/upgrade-prompt.tsx` (create, use client directive)
  - Props: `trigger: 'exit_intent' | 'feature_restriction' | 'quota_limit' | 'tour_complete'`
  - Content: Dynamic title/subtitle based on trigger type
  - Analytics: Track conversion events on button clicks (`demo_upgrade_prompt_shown`, `demo_signup_initiated`)
  - Export: `UpgradePrompt` component

- [ ] **T026** Implement mouse leave exit intent detection
  - File: `components/demo/exit-intent-modal.tsx` (extend from T024)
  - Hook: useEffect to add `mouseleave` event listener on document
  - Logic: If `e.clientY <= 0` and `!hasShown` and demo active for >30s, show modal
  - Session limit: Check sessionStorage `exit-intent-shown`, set to "true" after first show
  - Cleanup: Remove event listener on unmount

- [ ] **T027** Implement visibility change detection (tab switch)
  - File: `components/demo/exit-intent-modal.tsx` (extend from T026)
  - Hook: useEffect to add `visibilitychange` event listener on document
  - Logic: If `document.visibilityState === 'hidden'` and `!hasShown`, show modal
  - Integration: Share `hasShown` state with mouse leave detection

- [ ] **T028** Implement browser back button detection
  - File: `components/demo/exit-intent-modal.tsx` (extend from T027)
  - Hook: useEffect to add `popstate` event listener on window
  - Logic: If `!hasShown` and user navigating away, show modal
  - Integration: Share `hasShown` state with other detection methods

- [ ] **T029** Integrate exit intent modal into demo mode
  - File: `lib/demo/demo-context.tsx` (extend existing)
  - Import: `ExitIntentModal` component
  - Render: Add `<ExitIntentModal />` to `DemoModeProvider` component tree
  - State: Manage modal open/close state in context
  - Analytics: Track `exit_intent_shown` event when modal appears

---

## Phase 3.6: Analytics & Rate Limiting

**Purpose**: Implement event tracking and prompt frequency management
**Dependencies**: T001-T003 (setup), T016-T029 (tour and prompts)

- [ ] **T030** Create demo-tour-analytics utility
  - File: `lib/analytics/demo-tour-analytics.ts` (create)
  - Class: `DemoTourAnalytics` with `track()`, `flush()`, `getSummary()` methods
  - Pattern: Follow existing `lib/analytics/command-bar-analytics.ts` batching pattern
  - Features: Queue events, flush after 5s, localStorage fallback for offline
  - Endpoint: POST to `/api/analytics/demo-tours` (to be created in T031)
  - Export: Singleton instance `demoTourAnalytics`

- [ ] **T031** Build POST /api/analytics/demo-tours endpoint
  - File: `app/api/analytics/demo-tours/route.ts` (create)
  - Method: POST handler accepting `{ events: DemoTourEvent[] }` body
  - Validation: Check event_type enum, session_id format, max 100 events
  - Logic: Log events to console (or database if persistence desired)
  - Response: `{ logged_count: number, status: 'success' }` with 200 status
  - Errors: 400 for invalid data, 429 for rate limit exceeded
  - Contract: Must match `/specs/010-i-want-you/contracts/tour-analytics.yml`

- [ ] **T032** Integrate PromptFrequencyManager into upgrade prompts
  - File: `components/demo/conversion-prompts/upgrade-prompt.tsx` (extend from T025)
  - Import: `PromptFrequencyManager` from lib/utils/prompt-frequency-manager
  - Logic: Before showing prompt, check `canShow(promptType)`
  - Logic: After showing, call `recordShown(promptType)`
  - Behavior: If `canShow()` returns false, don't render prompt (max 1/hour enforced)

- [ ] **T033** Integrate with Google Analytics (gtag events)
  - Files: `components/demo/tour/welcome-tour.tsx`, `components/demo/exit-intent-modal.tsx`, `components/demo/conversion-prompts/upgrade-prompt.tsx`
  - Add: `window.gtag()` calls for key events:
    - `demo_tour_started`, `demo_tour_completed`, `demo_tour_abandoned`
    - `demo_exit_intent_shown`, `demo_exit_intent_converted`
    - `demo_upgrade_prompt_shown`, `demo_signup_initiated`
  - Pattern: Follow existing gtag usage in `lib/demo/demo-context.tsx:207-211`

---

## Phase 3.7: Additional Testing

**Purpose**: Mobile responsive and cross-tab sync tests
**Dependencies**: T016-T033 (all features implemented)

- [ ] **T034** [P] E2E test: Mobile responsive tour
  - File: `tests/e2e/demo-tour-mobile.spec.ts` (create)
  - Viewport: Set to mobile (iPhone 13, 390x844)
  - Test: Tour has 5 steps instead of 10 on mobile
  - Test: Popover position adjusts for small screen
  - Test: Touch-friendly controls (no hover states required)
  - Run: `npx playwright test tests/e2e/demo-tour-mobile.spec.ts --project="Mobile Safari"`

- [ ] **T035** Integration test: Cross-tab tour state sync
  - File: `tests/integration/demo-tour-sync.spec.ts` (create)
  - Test: Open demo in tab 1, start tour, complete step 1
  - Test: Open demo in tab 2, tour shows step 2 (synced via StorageEvent)
  - Test: Complete tour in tab 2, tab 1 reflects completion state
  - Tool: Use Playwright `context.newPage()` to simulate multiple tabs

---

## Phase 3.8: Polish & Documentation

**Purpose**: Final touches, performance validation, documentation
**Dependencies**: All implementation complete (T001-T035)

- [ ] **T036** Update CLAUDE.md with demo tour patterns
  - File: `CLAUDE.md` (extend existing)
  - Add section: "### Live Demo Session (Feature 010)" under "Key Features Implemented"
  - Document: Driver.js integration, pre-seeded content locations, tour state management patterns
  - Document: Exit intent detection methods, analytics tracking patterns
  - Update: "Recent commits" section with feature 010

- [ ] **T037** Performance validation
  - Test: Demo content loads in <2 seconds (90th percentile)
  - Test: Tour initialization takes <1 second after page load
  - Test: Exit intent detection responds in <100ms
  - Test: Analytics events flush within 5 seconds
  - Tool: Use Chrome DevTools Performance tab, Lighthouse performance audit
  - Target: Lighthouse Performance score >90, bundle size increase <50KB gzipped

---

## Dependencies Graph

```
Setup & Content
T001 (Driver.js) ─────┬──> T016 (Tour steps)
T002 (localStorage) ──┤
T003 (PromptFreq) ────┘

T004-T009 (Content) ──> T014 (Content E2E test)

Tests (TDD)
T010-T015 (All tests) MUST complete before T016

Tour System
T016 ─┬─> T017 (WelcomeTour)
      ├─> T019 (FeatureTours)
      └─> T022 (Mobile)

T017 ──> T018 (State mgmt) ──> T020 (Replay button)
T018 ──> T021 (Persistence)
T017 ──> T023 (Analytics integration)

Exit Intent & Conversion
T024 ─┬─> T026 (Mouse leave)
      ├─> T027 (Visibility)
      └─> T028 (Back button)

T025 ──> T029 (Integration)
T024-T028 ──> T029

Analytics
T030 ──> T031 (API endpoint)
T031 ──> T010 (Contract test validation - tests should now pass)
T003 ──> T032 (Frequency mgmt)
T023, T029, T032 ──> T033 (gtag integration)

Additional Tests
T016-T033 ──> T034 (Mobile test)
T018, T021 ──> T035 (Sync test)

Polish
T001-T035 ──> T036 (Docs)
T001-T035 ──> T037 (Performance)
```

---

## Parallel Execution Examples

### Batch 1: Utilities (after T001)
```bash
# Launch T002-T003 together:
claude-code --task "Create localStorage utility class in lib/utils/local-storage-manager.ts"
claude-code --task "Create prompt frequency manager in lib/utils/prompt-frequency-manager.ts"
```

### Batch 2: Pre-Seeded Content
```bash
# Launch T004-T007 together:
claude-code --task "Generate ResearchGPT demo report for TechHub in lib/demo/demo-research-data.ts"
claude-code --task "Generate Data Room document metadata in lib/demo/demo-dataroom-data.ts"
claude-code --task "Generate Q&A queries and answers in lib/demo/demo-qa-data.ts"
```

### Batch 3: TDD Tests (before implementation)
```bash
# Launch T010-T015 together:
claude-code --task "Contract test POST /api/analytics/demo-tours in tests/contract/demo-tour-analytics.contract.test.ts"
claude-code --task "E2E test demo tour happy path in tests/e2e/demo-tour-happy-path.spec.ts"
claude-code --task "E2E test tour skip and replay in tests/e2e/demo-tour-skip-replay.spec.ts"
claude-code --task "E2E test exit intent detection in tests/e2e/demo-exit-intent.spec.ts"
claude-code --task "E2E test pre-seeded content in tests/e2e/demo-content-preseeded.spec.ts"
claude-code --task "E2E test conversion flow in tests/e2e/demo-conversion-flow.spec.ts"
```

### Batch 4: Exit Intent Components
```bash
# Launch T024-T025 together (different files):
claude-code --task "Create ExitIntentModal component in components/demo/exit-intent-modal.tsx"
claude-code --task "Create UpgradePrompt component in components/demo/conversion-prompts/upgrade-prompt.tsx"
```

### Batch 5: Polish
```bash
# Launch T034, T036 together:
claude-code --task "E2E test mobile responsive tour in tests/e2e/demo-tour-mobile.spec.ts"
claude-code --task "Update CLAUDE.md with demo tour patterns"
```

---

## Validation Checklist

**Before Marking Complete**:
- [x] All contracts have corresponding tests (T010 → T031)
- [x] All entities have model tasks (N/A - client-side only)
- [x] All tests come before implementation (T010-T015 before T016-T033)
- [x] Parallel tasks truly independent ([P] tasks modify different files)
- [x] Each task specifies exact file path (✅ all tasks have paths)
- [x] No task modifies same file as another [P] task (✅ verified)

**TDD Compliance**:
- [x] Contract test (T010) written before API endpoint (T031)
- [x] E2E tests (T011-T015) written before tour implementation (T016-T023)
- [x] All tests expected to fail initially (✅ documented in task descriptions)

**Performance Targets** (validated in T037):
- [ ] Demo content loads <2 seconds (FR-010)
- [ ] Tour initialization <1 second
- [ ] Exit intent detection <100ms
- [ ] Analytics flush 5 seconds (batched)

---

## Notes

- **[P] tasks** = Different files, no dependencies, safe to parallelize
- **Sequential tasks** = Same file or dependent logic, must run in order
- **TDD emphasis**: T010-T015 (tests) MUST complete before T016-T033 (implementation)
- **Commit strategy**: Commit after each task completion
- **Testing**: Run E2E tests after each implementation phase (T016-T023, T024-T029, T030-T033)

---

**Status**: Ready for execution
**Next Step**: Begin with T001 (Install Driver.js)
**Branch**: `010-i-want-you`
**Timeline**: 4-6 days (37 tasks, ~18 parallelizable)
