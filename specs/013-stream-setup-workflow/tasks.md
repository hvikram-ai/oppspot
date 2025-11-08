# Tasks: Stream Setup Workflow with Goal-Oriented Configuration

**Input**: Design documents from `/specs/013-stream-setup-workflow/`
**Prerequisites**: ✅ plan.md, ✅ research.md, ✅ data-model.md, ✅ contracts/

---

## Execution Flow Summary
```
Phase 3.1: Setup (database migration, type generation)
Phase 3.2: Tests First - Contract & Integration Tests (TDD - MUST FAIL)
Phase 3.3: Backend Implementation (API routes, services)
Phase 3.4: State Management & Hooks
Phase 3.5: UI Components (wizard, profiles, dashboard)
Phase 3.6: Personalization Engine
Phase 3.7: E2E Integration Tests
Phase 3.8: Polish & Validation
```

**Tech Stack** (from plan.md):
- TypeScript 5.x, Next.js 15 (App Router), React 19
- Supabase PostgreSQL + Auth + RLS
- OpenRouter API (Claude Sonnet 3.5 for AI analysis)
- Zustand state management, shadcn/ui components
- Playwright E2E testing

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no shared dependencies)
- All paths are relative to repository root `/home/vik/oppspot/`

---

## Phase 3.1: Setup & Database Migration

- [ ] **T001** Create database migration file `supabase/migrations/20251031000003_stream_workflow.sql` with complete schema (business_profiles table, goal_templates seed data, streams.business_profile_id column, indexes, RLS policies) per data-model.md

- [ ] **T002** Apply migration to local Supabase instance using `npx supabase db push` and verify tables created with `SELECT table_name FROM information_schema.tables WHERE table_name IN ('business_profiles', 'goal_templates')`

- [ ] **T003** Generate TypeScript types from updated schema using `npx supabase gen types typescript --local > lib/supabase/database.types.ts` and verify business_profiles and goal_templates types exist

- [ ] **T004** Verify goal_templates seeded with 7 goal types using SQL query `SELECT id, name, category FROM goal_templates ORDER BY display_order` - expected: due_diligence, discover_companies, market_research, competitive_analysis, territory_expansion, investment_pipeline, partnership_opportunities

- [ ] **T005** Test migration rollback with `npx supabase db reset` and reapply to ensure idempotency

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests - Profiles API [P]

- [ ] **T006** [P] Contract test POST /api/profiles (create profile) in `tests/contract/profiles-api/create-profile.test.ts` - validate request schema (name, company_name, website_url, analyze_now), expect 201 response with profile object + analysis_job_id per contracts/profiles-api.yaml

- [ ] **T007** [P] Contract test GET /api/profiles (list profiles) in `tests/contract/profiles-api/list-profiles.test.ts` - validate query params (sort, order, status filter), expect 200 with array of profiles + total count per contracts/profiles-api.yaml

- [ ] **T008** [P] Contract test GET /api/profiles/[id] (get single) in `tests/contract/profiles-api/get-profile.test.ts` - expect 200 with profile object + usage_stats (streams_using_profile, last_used_at) per contracts/profiles-api.yaml

- [ ] **T009** [P] Contract test PATCH /api/profiles/[id] (update profile) in `tests/contract/profiles-api/update-profile.test.ts` - validate partial update fields (industry, tech_stack, etc.), expect 200 with updated profile, verify manual_edits JSONB tracking per contracts/profiles-api.yaml

- [ ] **T010** [P] Contract test DELETE /api/profiles/[id] (delete profile) in `tests/contract/profiles-api/delete-profile.test.ts` - expect 204 if not in use, 400 with streams list if in use by active streams per contracts/profiles-api.yaml

- [ ] **T011** [P] Contract test POST /api/profiles/analyze (trigger AI analysis) in `tests/contract/profiles-api/analyze-profile.test.ts` - validate request (profile_id, force_reanalysis), expect 202 with job_id and estimated_completion time per contracts/profiles-api.yaml

- [ ] **T012** [P] Contract test GET /api/profiles/[id]/analysis-status (poll status) in `tests/contract/profiles-api/analysis-status.test.ts` - expect 200 with status (pending/analyzing/completed/failed), progress object (stage, message, percent), analysis_metadata per contracts/profiles-api.yaml

### Contract Tests - Wizard API [P]

- [ ] **T013** [P] Contract test GET /api/streams/wizard/progress (retrieve progress) in `tests/contract/wizard-api/get-progress.test.ts` - expect 200 with wizard progress object (nullable if no saved state) + session_id per contracts/wizard-api.yaml

- [ ] **T014** [P] Contract test POST /api/streams/wizard/progress (save progress) in `tests/contract/wizard-api/save-progress.test.ts` - validate WizardProgress schema (current_step, step1-3 data), expect 200 with session_id + saved_at timestamp per contracts/wizard-api.yaml

- [ ] **T015** [P] Contract test DELETE /api/streams/wizard/progress (clear progress) in `tests/contract/wizard-api/clear-progress.test.ts` - expect 204 No Content on successful deletion per contracts/wizard-api.yaml

- [ ] **T016** [P] Contract test POST /api/streams/wizard/validate (validate step) in `tests/contract/wizard-api/validate-step.test.ts` - validate request (step 1/2/3, data), expect 200 with valid:true on success, 400 with errors array on failure per contracts/wizard-api.yaml

- [ ] **T017** [P] Contract test POST /api/streams/wizard/complete (create stream) in `tests/contract/wizard-api/complete-wizard.test.ts` - validate complete wizard data (step1-3, stream_name, emoji, color), expect 201 with stream object + redirect_url per contracts/wizard-api.yaml

- [ ] **T018** [P] Contract test GET /api/goal-templates (list templates) in `tests/contract/wizard-api/list-goal-templates.test.ts` - validate optional category filter, expect 200 with array of 7 goal templates with all fields (id, name, description, category, icon, defaults) per contracts/wizard-api.yaml

- [ ] **T019** [P] Contract test GET /api/goal-templates/[id] (get single template) in `tests/contract/wizard-api/get-goal-template.test.ts` - expect 200 with complete template object including suggested_stages and suggested_agents per contracts/wizard-api.yaml

### Verify All Tests Fail

- [ ] **T020** Run all contract tests with `npm run test:contract` and verify ALL 14 tests FAIL with "endpoint not implemented" or similar errors (this confirms TDD baseline - do NOT proceed to Phase 3.3 until this is verified)

---

## Phase 3.3: Backend Implementation (ONLY after tests are failing)

### Profiles API Implementation

- [ ] **T021** Implement POST /api/profiles route handler in `app/api/profiles/route.ts` - create profile record with analysis_status='pending', trigger AI analysis if analyze_now=true, return 201 with profile + analysis_job_id, handle duplicate website_url error (400), enforce org_id from authenticated user

- [ ] **T022** Implement GET /api/profiles route handler in `app/api/profiles/route.ts` - query business_profiles filtered by user's org_id, support sort/order/status query params, return 200 with profiles array + total count, apply RLS policies

- [ ] **T023** Implement GET /api/profiles/[id] route handler in `app/api/profiles/[id]/route.ts` - fetch single profile by id, calculate usage_stats (count streams using profile, find last_used_at from streams.updated_at), return 200 or 404, enforce org_id access control

- [ ] **T024** Implement PATCH /api/profiles/[id] route handler in `app/api/profiles/[id]/route.ts` - update allowed fields (industry, description, tech_stack, etc.), track changes in manual_edits JSONB (store original + edited + edited_at), update updated_by + updated_at, return 200 with updated profile

- [ ] **T025** Implement DELETE /api/profiles/[id] route handler in `app/api/profiles/[id]/route.ts` - check if profile in use by active streams (status='active'), return 400 with error + streams list if in use, otherwise soft delete (or hard delete if supported), return 204 on success

- [ ] **T026** Implement POST /api/profiles/analyze route handler in `app/api/profiles/analyze/route.ts` - validate profile exists and has website_url, check force_reanalysis flag, update analysis_status='analyzing', trigger async AI analysis job, return 202 with job_id + estimated_completion

- [ ] **T027** Implement GET /api/profiles/[id]/analysis-status route handler in `app/api/profiles/[id]/analysis-status/route.ts` - fetch profile.analysis_status, construct progress object based on status (fetching_website, analyzing_content, extracting_data, complete, error), return analysis_metadata if completed/failed, return 200

- [ ] **T028** Implement AI website analyzer service in `lib/services/profile-analyzer.ts` - function analyzeWebsite(url): fetch HTML with 10s timeout, parse with Cheerio (extract text from h1, p, meta tags), send to Claude Sonnet 3.5 via OpenRouter with structured JSON schema (11 fields per FR-007), validate response, handle errors gracefully (network, timeout, parsing), return extracted data + metadata

- [ ] **T029** Verify all Profiles API contract tests (T006-T012) now PASS with `npm run test:contract -- profiles-api`

### Wizard API Implementation

- [ ] **T030** Implement GET /api/streams/wizard/progress route handler in `app/api/streams/wizard/progress/route.ts` - fetch wizard progress from session storage or server-side store (if implemented), return 200 with progress object or null + session_id

- [ ] **T031** Implement POST /api/streams/wizard/progress route handler in `app/api/streams/wizard/progress/route.ts` - validate WizardProgress schema, save to session storage or server-side store, return 200 with session_id + saved_at timestamp

- [ ] **T032** Implement DELETE /api/streams/wizard/progress route handler in `app/api/streams/wizard/progress/route.ts` - clear wizard progress from storage, return 204 No Content

- [ ] **T033** Implement POST /api/streams/wizard/validate route handler in `app/api/streams/wizard/validate/route.ts` - validate step data based on step number (1: goal_template_id required, 2: business_impact_description min 10 chars, 3: profile_selection_method + either selected_profile_id or new_profile), return 200 with valid:true or 400 with errors array

- [ ] **T034** Implement POST /api/streams/wizard/complete route handler in `app/api/streams/wizard/complete/route.ts` - validate all 3 steps completed, create business_profile if profile_selection_method='new' (optionally wait for AI analysis), create stream with goal_criteria + business_profile_id using existing POST /api/streams/goal logic, add creator as owner in stream_members, clear wizard progress, return 201 with stream + redirect_url

- [ ] **T035** Implement GET /api/goal-templates route handler in `app/api/goal-templates/route.ts` - query goal_templates table, filter by category if provided, order by display_order, return 200 with templates array (7 items)

- [ ] **T036** Implement GET /api/goal-templates/[id] route handler in `app/api/goal-templates/[id]/route.ts` - fetch single template by id, return 200 with complete template including suggested_stages + suggested_agents, return 404 if not found

- [ ] **T037** Enhance existing POST /api/streams/goal route in `app/api/streams/goal/route.ts` - add business_profile_id field to stream creation, validate profile exists and belongs to user's org, include profile reference in stream response

- [ ] **T038** Verify all Wizard API contract tests (T013-T019) now PASS with `npm run test:contract -- wizard-api`

---

## Phase 3.4: State Management & Hooks

- [ ] **T039** [P] Create Zustand wizard store in `lib/stores/wizard-store.ts` - define WizardState interface (currentStep, goalType, businessImpact, selectedProfileId, newProfileData, isAnalyzing, analysisProgress), implement persist middleware with sessionStorage (not localStorage per research.md session-only decision), export useWizardStore hook

- [ ] **T040** [P] Create Zustand stream context store in `lib/stores/stream-context-store.ts` - define StreamContextState interface (activeStreamId, setActiveStream, clearActiveStream), implement Supabase user_metadata sync (updateUser on setActiveStream), fetch activeStreamId from user.user_metadata on init, export useStreamContext hook

- [ ] **T041** [P] Create use-wizard-progress hook in `lib/hooks/use-wizard-progress.ts` - wrapper around useWizardStore, provides saveProgress(), loadProgress(), clearProgress() functions, handles API calls to /api/streams/wizard/progress

- [ ] **T042** [P] Create use-stream-context hook in `lib/hooks/use-stream-context.ts` - wrapper around useStreamContext store, provides getCurrentStream(), switchStream(id), persists to Supabase user_metadata, handles session restoration

- [ ] **T043** Write unit tests for wizard-store logic in `tests/unit/stores/wizard-store.test.ts` - test state updates, sessionStorage persistence, step validation, progress save/load/clear

- [ ] **T044** Write unit tests for stream-context-store logic in `tests/unit/stores/stream-context-store.test.ts` - test activeStreamId updates, Supabase user_metadata sync, session restoration, error handling

---

## Phase 3.5: UI Components (Wizard, Profiles, Dashboard)

### Wizard Pages & Container

- [ ] **T045** Create wizard container page in `app/(dashboard)/streams/new/page.tsx` - layout with step indicator (1/2/3), progress bar, "Back"/"Continue" buttons, render appropriate step component based on currentStep from wizard store, handle navigation, implement client component with 'use client' directive

- [ ] **T046** Create main wizard component in `components/streams/wizard/stream-wizard.tsx` - orchestrates 3 steps, manages wizard store state, handles step transitions (<200ms target), validates step completion before allowing "Continue", provides consistent layout wrapper for all steps

### Wizard Step Components

- [ ] **T047** Create Step 1 (Goal Selection) in `components/streams/wizard/step-goal-selection.tsx` - fetch goal templates from GET /api/goal-templates, render 7 goal type cards with icon/name/description (due_diligence, discover_companies, market_research, competitive_analysis, territory_expansion, investment_pipeline, partnership_opportunities), handle selection state, update wizard store on continue, show loading state while fetching

- [ ] **T048** Create Step 2 (Business Impact) in `components/streams/wizard/step-business-impact.tsx` - render Textarea for business_impact_description (10-5000 chars per validation), show character count, display validation errors, save to wizard store, provide helpful placeholder text with examples from quickstart.md

- [ ] **T049** Create Step 3 (Profile Setup) in `components/streams/wizard/step-profile-setup.tsx` - render tabs for "Create New Profile" vs "Select Existing Profile", conditional rendering based on profile_selection_method, integrate ProfileCreator and ProfileSelector components, handle profile creation success/failure, allow manual data entry if AI analysis fails (FR-009)

### Profile Components

- [ ] **T050** Create Profile Selector in `components/streams/profile/profile-selector.tsx` - fetch existing profiles from GET /api/profiles, render list with profile name/company_name/created_at/last_used_at, show empty state if no profiles, handle selection and update wizard store with selected_profile_id, show loading skeleton while fetching

- [ ] **T051** Create Profile Creator in `components/streams/profile/profile-creator.tsx` - form with name/company_name/website_url inputs, "Analyze Website" button triggers POST /api/profiles with analyze_now=true, show WebsiteAnalyzer progress component during analysis, display extracted data for review (FR-010), allow manual edit of any field, "Confirm Profile" button saves to wizard store

- [ ] **T052** Create Website Analyzer progress component in `components/streams/profile/website-analyzer.tsx` - poll GET /api/profiles/[id]/analysis-status every 2s, display progress stages (fetching_website, analyzing_content, extracting_data, complete, error), show progress bar (0-100%), display estimated time remaining (~30s target), handle timeout/failure with error message + fallback to manual entry (FR-009), use shadcn/ui Progress component

### Dashboard Components

- [ ] **T053** Create Stream Context Indicator in `components/streams/dashboard/stream-context-indicator.tsx` - fetch activeStreamId from useStreamContext hook, display active stream name/emoji in header/navigation, visual highlight (badge, blue background), show "No active stream" state if null, provide quick access to StreamSwitcher

- [ ] **T054** Create Stream Switcher in `components/streams/dashboard/stream-switcher.tsx` - render dropdown or modal with list of user's streams (fetch from GET /api/streams), show current active stream checked, allow switching via setActiveStream(), close on selection, show loading state during switch (<300ms target)

- [ ] **T055** Enhance Stream Dashboard page in `app/(dashboard)/streams/[id]/dashboard/page.tsx` - fetch stream with business_profile data, display stream metadata (goal_type, business_impact, profile name/company per FR-022), show work summary (total assets, recent activity per FR-023), integrate AssetGrid component, fetch stream_items grouped by type, display empty state if 0 assets. **Note**: FR-020 side-by-side comparison is implicit (users can open multiple dashboards in separate browser tabs/windows for manual comparison). No custom split-view UI required in v1.

- [ ] **T056** Create Asset Grid component in `components/streams/dashboard/asset-grid.tsx` - accept stream_items array grouped by type, render categorized sections (Companies, Research Reports, Search Queries, Notes, Tasks, Documents, Links, Insights, Data Rooms, Hypotheses per FR-017), show counts for each category (FR-024), display asset cards with type-specific previews, handle empty categories gracefully

---

## Phase 3.6: Personalization Engine

- [ ] **T057** Create personalization service in `lib/services/stream-personalization.ts` - export interface PersonalizationConfig (profile: BusinessProfile, searchResults: Company[]), implement applyPersonalization() function with 3-layer approach

- [ ] **T058** Implement Layer 1 (Filtering) in `lib/services/stream-personalization.ts` - function filterByProfileCriteria() generates SQL WHERE clauses based on profile.target_markets, revenue_range, location, company_size, returns filtered results (fast, deterministic, <100ms target)

- [ ] **T059** Implement Layer 2 (Ranking) in `lib/services/stream-personalization.ts` - function scoreByStrategicFit() calculates 0-100 fit_score for each company: industry match (30 pts), tech_stack overlap (25 pts), size match (20 pts), geographic proximity (15 pts), differentiators alignment (10 pts), returns ranked results (<200ms target)

- [ ] **T060** Implement Layer 3 (AI Recommendations) in `lib/services/stream-personalization.ts` - function addAIRecommendations() sends top N results + profile to Claude via OpenRouter, generates 3 actionable recommendations per result (synergies, acquisition rationale, integration opportunities), runs async non-blocking (<3s target), returns results with insights

- [ ] **T061** Integrate personalization into existing search routes in `app/api/businesses/search/route.ts` - check if user has activeStreamId with business_profile, if yes: call applyPersonalization() after base search query, add fit_score and ai_insights to response objects, maintain existing search behavior if no profile

- [ ] **T062** Add fit_score field to search results UI in existing search components - display "Strategic Fit: X/100" badge on company cards, show tooltip with fit breakdown (industry ✅, tech overlap 60%, etc.), highlight high-fit results (>80 score) with visual indicator

---

## Phase 3.7: E2E Integration Tests

- [ ] **T063** [P] E2E test: Complete wizard flow with new profile creation in `tests/e2e/stream-wizard/complete-new-profile.spec.ts` - navigate to /streams/new, select "Discover Companies" goal, enter business impact, create new profile with valid website (mock AI response), complete wizard, verify stream created + redirected to dashboard, verify profile saved

- [ ] **T064** [P] E2E test: Complete wizard flow with existing profile selection in `tests/e2e/stream-wizard/complete-existing-profile.spec.ts` - prerequisite: create profile via API, navigate to wizard, select goal, enter impact, select existing profile from list, complete wizard, verify stream created with selected profile

- [ ] **T065** [P] E2E test: Wizard progress persistence on navigation away in `tests/e2e/stream-wizard/progress-persistence.spec.ts` - start wizard, complete steps 1-2, navigate away to /dashboard, return to /streams/new, verify wizard resumes at step 3 with previous data intact, complete wizard successfully

- [ ] **T066** [P] E2E test: AI website analysis success path in `tests/e2e/profiles/ai-analysis-success.spec.ts` - create profile with valid URL (mock successful OpenRouter response), verify progress indicator shows stages, verify extracted data displayed for review, verify 11 fields populated (company_name, industry, description, size, location, revenue_range, tech_stack, products_services, target_markets, key_differentiators, employee_count), edit a field manually, verify manual_edits tracked

- [ ] **T067** [P] E2E test: AI website analysis failure with invalid URL in `tests/e2e/profiles/ai-analysis-failure.spec.ts` - create profile with invalid URL (https://invalid-url-9999.com), wait for timeout (~30s), verify error message displayed, verify manual entry form shown, fill fields manually, verify profile created with analysis_status='failed', verify stream creation proceeds normally

- [ ] **T068** [P] E2E test: Stream-scoped work association (add company to stream) in `tests/e2e/stream-context/work-association.spec.ts` - create stream, verify stream context indicator shows active stream, navigate to /search, search for companies, add company to stream, navigate back to stream dashboard, verify company appears in "Companies" section with count=1, verify company not visible in other streams

- [ ] **T069** [P] E2E test: Stream context switching in `tests/e2e/stream-context/switching.spec.ts` - create 2 streams with different profiles, add company to stream 1, switch to stream 2 via StreamSwitcher, verify context indicator updates, add different company to stream 2, switch back to stream 1, verify dashboard shows only stream 1 assets (no cross-contamination)

- [ ] **T070** [P] E2E test: Dashboard asset display and counts in `tests/e2e/dashboard/asset-display.spec.ts` - create stream, add 3 companies + 2 notes + 1 research report via API, navigate to dashboard, verify asset counts correct (Companies: 3, Notes: 2, Research Reports: 1, others: 0), verify categorized display per FR-024, verify empty categories shown with 0 count

- [ ] **T071** [P] E2E test: Personalization (search results ranked by profile) in `tests/e2e/personalization/search-ranking.spec.ts` - create stream with specific profile (healthcare, UK, tech_stack: ["React"]), perform search that returns mix of matches and non-matches, verify results ranked with fit_score visible, verify healthcare + UK + React companies ranked higher (>70 score), verify non-matching industries ranked lower, verify AI insights displayed on high-fit results

- [ ] **T072** [P] E2E test: Profile deletion prevention (in-use profile) in `tests/e2e/profiles/deletion-prevention.spec.ts` - create profile, create 2 active streams using that profile, attempt to delete profile via UI, verify error message "Cannot delete profile: 2 active streams are using this profile", verify modal shows stream list, archive both streams, retry deletion, verify profile deleted successfully

---

## Phase 3.8: Polish & Validation

**Note on Deferred Clarifications** (from spec.md review):
- FR-003: Business impact uses free-form text in v1 (T048). Structured form with predefined dimensions (revenue targets, strategic fit, geographic focus, technology needs, talent acquisition) deferred to v2.
- FR-006: Wizard persistence is session-only in v1 (T039, T041 use sessionStorage). Cross-session persistence deferred to v2 for security/UX balance.
- Both items documented in research.md Sections 6-7 and noted in T085 for future enhancement tracking.

---

- [ ] **T073** Execute quickstart.md user journey manually - follow all 8 testing scenarios from quickstart.md (wizard navigation, goal selection, profile creation, stream creation, work association, switching, personalization, deletion prevention), document any deviations, capture screenshots of key flows

- [ ] **T074** Measure wizard transition performance using browser DevTools - measure Step 1→2 and Step 2→3 transitions, target <200ms for 95% of measurements, if >200ms: optimize state updates and reduce re-renders

- [ ] **T075** Measure profile creation performance - time POST /api/profiles → analysis_status='completed', target <30 seconds for 95% of requests, test with 5 different real websites, if >30s: optimize Cheerio parsing or increase OpenRouter timeout

- [ ] **T076** Measure dashboard load performance - time GET /streams/[id]/dashboard page load, target <1 second for 95% of loads, test with streams containing 100+ assets, if >1s: add pagination or implement query optimization

- [ ] **T077** Measure stream switching performance - time context change + dashboard reload, target <300ms for 95% of switches, if >300ms: optimize Supabase user_metadata update or add caching

- [ ] **T078** [P] Add loading skeletons and optimistic UI updates - implement skeleton loaders for profile list, wizard steps, dashboard assets using shadcn/ui Skeleton component, add optimistic updates for profile creation and stream switching to improve perceived performance

- [ ] **T079** [P] Add error boundaries and comprehensive error handling - wrap wizard, profile creator, and dashboard in React ErrorBoundary components, implement retry mechanisms for failed API calls, show user-friendly error messages with actionable next steps

- [ ] **T080** [P] Add accessibility improvements - ensure all form inputs have proper labels, add ARIA attributes to wizard stepper, ensure keyboard navigation works for entire wizard flow, verify color contrast meets WCAG AA standards, test with screen reader

- [ ] **T081** [P] Update CLAUDE.md documentation - document new API endpoints (/api/profiles, /api/streams/wizard), add wizard workflow section, document personalization engine usage, update database schema section with business_profiles and goal_templates

- [ ] **T082** Remove any duplicated code and refactor - identify shared logic between wizard steps, extract common validation functions, consolidate API error handling, ensure DRY principles applied, run ESLint and fix warnings

- [ ] **T083** Run full test suite and verify all tests pass - execute `npm run test:contract && npm run test:e2e && npm run test:unit`, ensure 100% pass rate, fix any failures, generate test coverage report

- [ ] **T084** Create feature demo video or GIF - record screen capture demonstrating complete wizard flow (goal selection → business impact → profile creation with AI analysis → stream creation), stream switching, work association, personalized search, duration: 2-3 minutes

- [ ] **T085** Document any spec deviations or known issues - review implementation against spec.md FR-001 to FR-024, note any deferred items (FR-003 structured business impact v2, FR-006 cross-session persistence), create GitHub issues for future enhancements

---

## Dependencies

### Sequential Phases
- **Phase 3.1 (Setup) → Phase 3.2 (Tests)**: T001-T005 must complete before T006-T020
- **Phase 3.2 (Tests) → Phase 3.3 (Backend)**: T006-T020 must FAIL before T021-T038
- **Phase 3.3 (Backend) → Phase 3.4 (State)**: T021-T038 must complete before T039-T044
- **Phase 3.4 (State) → Phase 3.5 (UI)**: T039-T044 must complete before T045-T056
- **Phase 3.5 (UI) + Phase 3.6 (Personalization) → Phase 3.7 (E2E)**: T045-T062 must complete before T063-T072
- **Phase 3.7 (E2E) → Phase 3.8 (Polish)**: T063-T072 must complete before T073-T085

### Key Blockers
- **T001** (migration) blocks T003 (type generation)
- **T020** (verify all tests fail) gates all of Phase 3.3
- **T029, T038** (verify tests pass) gates Phase 3.4
- **T039-T042** (stores/hooks) block T045-T056 (UI components)
- **T045-T056** (UI complete) blocks T063-T072 (E2E tests)
- **T073-T077** (performance validation) gates T084 (demo) and T085 (final docs)

### Parallel Opportunities
- **T006-T019** [P]: All 14 contract tests (different files)
- **T021, T022** [P]: Both routes in `app/api/profiles/route.ts` (GET and POST)
- **T039-T042** [P]: All 4 store/hook files (independent)
- **T047-T049** [P]: Wizard step components (different files)
- **T050-T052** [P]: Profile components (different files)
- **T063-T072** [P]: All 10 E2E tests (independent scenarios)
- **T078-T082** [P]: Polish tasks (different areas)

---

## Parallel Execution Example

Launch contract tests together (Phase 3.2):
```bash
# T006-T019 can run in parallel (14 tasks)
npm run test:contract -- --parallel
# Or manually launch Task agent for each test file
```

Launch UI component creation together (Phase 3.5):
```bash
# T047, T048, T049 wizard steps
# T050, T051, T052 profile components
# T053, T054 dashboard components
# T056 asset grid
# All can be created in parallel (different files)
```

Launch E2E tests together (Phase 3.7):
```bash
# T063-T072 (10 tests)
npx playwright test tests/e2e/stream-wizard tests/e2e/profiles tests/e2e/stream-context tests/e2e/dashboard tests/e2e/personalization --workers=4
```

---

## Validation Checklist
*Verify before marking complete*

- [x] All contracts have corresponding tests: T006-T019 (14 contract tests)
- [x] All entities have model tasks: business_profiles (T001 migration), goal_templates (T004 seed verification)
- [x] All tests come before implementation: Phase 3.2 (T006-T020) before Phase 3.3 (T021-T038)
- [x] Parallel tasks truly independent: Verified [P] markers only on different files
- [x] Each task specifies exact file path: All tasks include full path from repo root
- [x] No task modifies same file as another [P] task: Verified no conflicts

---

## Notes

- **TDD Enforcement**: T020 explicitly verifies all tests fail before allowing Phase 3.3 implementation
- **Performance Targets**: T074-T077 validate all 4 performance goals from Technical Context (<200ms wizard, <30s profile creation, <1s dashboard, <300ms switching)
- **Spec Coverage**: Tasks T001-T085 cover all 24 Functional Requirements (FR-001 to FR-024) from spec.md
- **Deferred Items**: FR-003 structured business impact (v2), FR-006 cross-session persistence - noted in T085
- **Risk Mitigation**: T067 explicitly tests AI analysis failure path (FR-009 graceful error handling)

---

**Total Tasks**: 85
**Estimated Completion Time**: 40-50 hours (depending on parallel execution and developer familiarity with stack)
**Ready for**: `/implement` command or manual task execution
