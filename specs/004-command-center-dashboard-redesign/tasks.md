# Tasks: Command Center Dashboard Redesign

**Input**: Design documents from `/home/vik/oppspot/specs/004-command-center-dashboard-redesign/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/dashboard-api.yaml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md → Tech stack: Next.js 15, React 18, TypeScript 5.x, Supabase
2. Load data-model.md → 6 entities (dashboard_preferences, ai_digest, priority_queue_items, etc.)
3. Load contracts/dashboard-api.yaml → 10 API endpoints
4. Load quickstart.md → 8 test scenarios
5. Generate 60 tasks across 11 categories
6. Apply TDD ordering: Tests before implementation
7. Mark [P] for parallel execution (different files, no dependencies)
8. Validate: All tests come before implementation ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Database Foundation

### Category 1: Database Migrations & Schema [P]
- [ ] **T001** [P] Create migration file `supabase/migrations/20251001_dashboard_preferences.sql` with dashboard_preferences table, RLS policies, and indexes
- [ ] **T002** [P] Create migration file `supabase/migrations/20251001_ai_digest.sql` with ai_digest table, unique constraint on (user_id, digest_date), RLS policies
- [ ] **T003** [P] Create migration file `supabase/migrations/20251001_priority_queue.sql` with priority_queue_items table, ENUMs (priority_level, queue_item_type, queue_item_status), and indexes
- [ ] **T004** [P] Create migration file `supabase/migrations/20251001_feature_tracking.sql` with feature_interactions and dashboard_views tables, RLS policies
- [ ] **T005** [P] Create migration file `supabase/migrations/20251001_feature_spotlight.sql` with feature_spotlight_config table (admin-only, no RLS)
- [ ] **T006** Create migration file `supabase/migrations/20251001_triggers_functions.sql` with calculate_priority_score() trigger function and attach to priority_queue_items table
- [ ] **T007** Apply all migrations to local Supabase: `supabase db push` and verify with `supabase db diff`

## Phase 3.2: E2E Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Category 2: Playwright E2E Tests (Quickstart Scenarios) [P]
- [ ] **T008** [P] E2E test: New user first experience in `tests/e2e/dashboard-new-user.spec.ts` - validates empty state, CTA visibility, <60s time-to-first-value
- [ ] **T009** [P] E2E test: Power user daily workflow in `tests/e2e/dashboard-power-user.spec.ts` - validates AI digest card, impact metrics, priority queue ranking
- [ ] **T010** [P] E2E test: Feature discovery (ResearchGPT™) in `tests/e2e/dashboard-feature-discovery.spec.ts` - validates spotlight carousel, navigation access, quick actions
- [ ] **T011** [P] E2E test: Mobile responsive layout in `tests/e2e/dashboard-mobile.spec.ts` - validates bottom nav (375px), swipeable cards, no horizontal scroll
- [ ] **T012** [P] E2E test: Tablet responsive layout in `tests/e2e/dashboard-tablet.spec.ts` - validates 2-column grid (768px), collapsible sidebar
- [ ] **T013** [P] E2E test: Accessibility (keyboard nav) in `tests/e2e/dashboard-accessibility-keyboard.spec.ts` - validates tab order, focus indicators, Cmd+K command palette
- [ ] **T014** [P] E2E test: Accessibility (screen reader) in `tests/e2e/dashboard-accessibility-sr.spec.ts` - validates ARIA labels, semantic HTML, announcements
- [ ] **T015** [P] E2E test: Performance (Lighthouse) in `tests/e2e/dashboard-performance.spec.ts` - validates FCP <1s, TTI <2.5s, LCP <2s, score >90
- [ ] **T016** [P] E2E test: Personalization in `tests/e2e/dashboard-personalization.spec.ts` - validates card visibility toggle, theme switch, preferences persist
- [ ] **T017** [P] E2E test: Error handling & offline in `tests/e2e/dashboard-offline.spec.ts` - validates PWA offline mode, API error fallback, queued actions sync

### Category 3: API Contract Tests [P]
- [ ] **T018** [P] Contract test: GET /api/dashboard/preferences in `tests/e2e/api/dashboard-preferences-get.spec.ts` - validates response schema matches OpenAPI
- [ ] **T019** [P] Contract test: PUT /api/dashboard/preferences in `tests/e2e/api/dashboard-preferences-put.spec.ts` - validates request/response schemas
- [ ] **T020** [P] Contract test: GET /api/dashboard/digest in `tests/e2e/api/dashboard-digest-get.spec.ts` - validates digest_data JSONB structure
- [ ] **T021** [P] Contract test: POST /api/dashboard/digest in `tests/e2e/api/dashboard-digest-post.spec.ts` - validates generation triggers, force_refresh param
- [ ] **T022** [P] Contract test: GET /api/dashboard/priority-queue in `tests/e2e/api/dashboard-queue-get.spec.ts` - validates pagination, status filter, priority ordering
- [ ] **T023** [P] Contract test: PATCH /api/dashboard/priority-queue/[id] in `tests/e2e/api/dashboard-queue-patch.spec.ts` - validates status update
- [ ] **T024** [P] Contract test: GET /api/dashboard/metrics in `tests/e2e/api/dashboard-metrics-get.spec.ts` - validates period param, format param, trends object
- [ ] **T025** [P] Contract test: GET /api/dashboard/spotlight in `tests/e2e/api/dashboard-spotlight-get.spec.ts` - validates targeting, priority sorting
- [ ] **T026** [P] Contract test: POST /api/dashboard/interactions in `tests/e2e/api/dashboard-interactions-post.spec.ts` - validates feature_name, interaction_type enums
- [ ] **T027** [P] Contract test: POST /api/dashboard/analytics/view in `tests/e2e/api/dashboard-analytics-view-post.spec.ts` - validates Web Vitals metrics

**Checkpoint**: Run `npm run test:e2e` - ALL tests should FAIL (no implementation yet)

## Phase 3.3: API Implementation (Make Tests Pass)

### Category 4: API Route Handlers
- [ ] **T028** Implement `app/api/dashboard/preferences/route.ts` with GET handler - fetch user preferences from dashboard_preferences table, create default if not exists
- [ ] **T029** Add PUT handler to `app/api/dashboard/preferences/route.ts` - validate input with Zod, update preferences, return updated object
- [ ] **T030** Implement `app/api/dashboard/digest/route.ts` with GET handler - fetch today's digest from ai_digest table, filter by user_id and digest_date
- [ ] **T031** Add POST handler to `app/api/dashboard/digest/route.ts` - check quota, generate digest (placeholder AI call), store in ai_digest table
- [ ] **T032** Implement `app/api/dashboard/digest/[id]/read/route.ts` with POST handler - update read_at timestamp for digest
- [ ] **T033** Implement `app/api/dashboard/priority-queue/route.ts` with GET handler - fetch queue items with pagination, filter by status, order by priority_score DESC
- [ ] **T034** Implement `app/api/dashboard/priority-queue/[id]/route.ts` with PATCH handler - update status (in_progress, completed, dismissed), recalculate priority if needed
- [ ] **T035** Add DELETE handler to `app/api/dashboard/priority-queue/[id]/route.ts` - soft delete or hard delete queue item
- [ ] **T036** Implement `app/api/dashboard/metrics/route.ts` with GET handler - aggregate metrics from multiple tables (searches, saved businesses, research reports), calculate trends
- [ ] **T037** Implement `app/api/dashboard/spotlight/route.ts` with GET handler - fetch active spotlight configs, filter by user interactions (exclude used if configured), sort by priority
- [ ] **T038** Implement `app/api/dashboard/interactions/route.ts` with POST handler - insert feature interaction record, track source/context
- [ ] **T039** Implement `app/api/dashboard/analytics/view/route.ts` with POST handler - insert dashboard view record with Web Vitals metrics

**Checkpoint**: Run `npm run test:e2e` - API contract tests (T018-T027) should PASS

## Phase 3.4: Core Dashboard Components

### Category 5: Dashboard Cards (UI Components) [P]
- [ ] **T040** [P] Create `components/dashboard-v2/ai-digest-card.tsx` - fetch digest via SWR, display sections (overnight_discoveries, urgent_alerts, completed_work, recommendations), "View All" expand
- [ ] **T041** [P] Create `components/dashboard-v2/priority-queue.tsx` - fetch queue items, virtual scrolling for 10k+ items, urgency badges (🔥 critical, ⚠️ high), one-click actions
- [ ] **T042** [P] Create `components/dashboard-v2/impact-metrics.tsx` - display time_saved, pipeline_value, active_leads with trend sparklines, drill-down links
- [ ] **T043** [P] Create `components/dashboard-v2/research-gpt-launcher.tsx` - company autocomplete, credits display (X/100), "Generate Report" CTA, loading state with 2s polling
- [ ] **T044** [P] Create `components/dashboard-v2/feature-spotlight.tsx` - carousel of spotlight items, rotate every 5s, track impressions via POST /api/dashboard/interactions
- [ ] **T045** [P] Create `components/dashboard-v2/enhanced-stats-grid.tsx` - 4 stat cards with predictions ("On track to hit 100 by Friday"), micro actions, responsive grid

### Category 6: Navigation Components [P]
- [ ] **T046** [P] Create `components/navigation/goal-based-nav.tsx` - 5 nav groups (Command Center, Discover, Intelligence, Pipeline, Workspace), dropdown menus, active state
- [ ] **T047** [P] Create `components/navigation/mobile-bottom-nav.tsx` - fixed bottom bar, 5 icons, labels on active only, safe-area-inset-bottom for iOS
- [ ] **T048** [P] Create `components/navigation/contextual-sidebar.tsx` - collapsible sidebar, recent searches (last 5), saved lists (pinned + recent), active research reports
- [ ] **T049** [P] Create `components/navigation/command-palette.tsx` - Cmd+K trigger, fuzzy search features, keyboard navigation (↑↓ Enter Esc), recent searches
- [ ] **T050** Update `components/layout/navbar.tsx` - integrate GoalBasedNav component, add MobileBottomNav for <768px, ContextualSidebar for >1024px

### Category 7: Supporting Components [P]
- [ ] **T051** [P] Create `components/ui/skeleton-loader.tsx` - dashboard card skeleton, shimmer animation, responsive widths
- [ ] **T052** [P] Create `components/dashboard-v2/empty-state.tsx` - helpful empty messages, suggestions, illustration, no depressing "You have nothing"
- [ ] **T053** [P] Create `components/dashboard-v2/error-boundary.tsx` - catch errors, show fallback UI, "Retry" button, log to Sentry/console

## Phase 3.5: Dashboard Page Integration

### Category 8: Dashboard Assembly (Sequential)
- [ ] **T054** Update `app/dashboard/page.tsx` - restructure layout with new hero section (AIDigestCard + ImpactMetrics), priority queue, enhanced stats grid
- [ ] **T055** Add Suspense boundaries to `app/dashboard/page.tsx` - wrap each dashboard card with Suspense + SkeletonLoader fallback
- [ ] **T056** Configure ISR for `app/dashboard/page.tsx` - export revalidate = 60, static shell with client-side data fetch
- [ ] **T057** Create `lib/hooks/use-dashboard-data.ts` - SWR hook for fetching all dashboard data (digest, queue, metrics, spotlight), 30s cache
- [ ] **T058** Create `lib/stores/dashboard-store.ts` - Zustand store for client state (sidebar open/closed, active tab, filters)

## Phase 3.6: Responsive & Accessibility

### Category 9: Responsive Design
- [ ] **T059** Add mobile styles to all dashboard cards - single column stacking, swipeable cards (use react-swipeable), touch targets 44x44px minimum
- [ ] **T060** Add tablet styles to all components - 2-column grid, collapsible sidebar, reduce text size slightly
- [ ] **T061** Test responsive breakpoints - Chrome DevTools device toolbar, verify no horizontal scroll at 375px, 768px, 1024px, 1440px

### Category 10: Accessibility (WCAG 2.1 AA)
- [ ] **T062** Add keyboard navigation to all interactive elements - visible focus indicators (:focus-visible), logical tab order, no keyboard traps
- [ ] **T063** Add ARIA labels to all components - aria-label on icon buttons, aria-live for dynamic updates, role="article" for queue items
- [ ] **T064** Implement keyboard shortcuts - Cmd+K command palette, G+D (go to dashboard), N (new search), R (generate research), ? (help menu)
- [ ] **T065** Verify color contrast - all text 4.5:1 minimum, interactive elements 3:1, run axe-core DevTools, fix violations
- [ ] **T066** Add prefers-reduced-motion support - disable Framer Motion animations when user has reduced motion preference

**Checkpoint**: Run `npm run test:e2e` - Accessibility tests (T013-T014) should PASS

## Phase 3.7: PWA & Performance

### Category 11: Progressive Web App
- [ ] **T067** Create `public/manifest.json` - name "oppSpot Command Center", icons (192x192, 512x512), start_url "/dashboard", display "standalone", theme_color "#6366F1"
- [ ] **T068** Create `public/sw.js` service worker with Workbox - precache static assets, NetworkFirst for /api/dashboard/*, CacheFirst for images
- [ ] **T069** Create `components/pwa/service-worker-registration.tsx` - register SW on mount, show "Update available" prompt when new SW detected
- [ ] **T070** Add offline fallback page `app/offline/page.tsx` - show cached dashboard with "You're offline" indicator, queue actions for sync

### Category 12: Performance Optimization
- [ ] **T071** Optimize bundle size - analyze with `npm run build`, lazy load below-fold components (React.lazy + Suspense), code split routes
- [ ] **T072** Add prefetching to navigation - <Link prefetch={true}> on hover, preload critical resources with <link rel="preload">
- [ ] **T073** Optimize images - use Next.js Image component, add width/height, priority for above-fold images
- [ ] **T074** Implement virtual scrolling for priority queue - use react-window for 10k+ items, render only visible items + buffer

**Checkpoint**: Run `npm run test:e2e` - Performance test (T015) should show Lighthouse score >90

## Phase 3.8: AI Digest Generation (Background Job)

### Category 13: Digest Automation
- [ ] **T075** Create Supabase Edge Function `supabase/functions/generate-digest/index.ts` - query user activity (searches, saves, research), call OpenRouter API, store digest
- [ ] **T076** Set up cron job in `supabase/functions/generate-digest/cron.ts` - schedule at 8am user timezone using pg_cron or Vercel cron
- [ ] **T077** Implement digest logic in `lib/ai/digest-generator.ts` - analyze overnight data, prioritize by urgency, format as JSONB structure
- [ ] **T078** Test digest generation with seed data - run `npx supabase functions serve generate-digest`, verify digest created in ai_digest table

## Phase 3.9: Analytics & Tracking

### Category 14: Usage Analytics
- [ ] **T079** [P] Create `lib/analytics/track-interaction.ts` - client-side function to POST /api/dashboard/interactions, batch requests (max 10 per 5s)
- [ ] **T080** [P] Create `lib/analytics/track-page-view.ts` - client-side function to POST /api/dashboard/analytics/view with Web Vitals (use web-vitals library)
- [ ] **T081** Add interaction tracking to all components - track clicks on spotlight items, queue actions, quick actions, navigation links
- [ ] **T082** Implement feature spotlight rotation algorithm in `lib/spotlight/rotation-algorithm.ts` - usage-based (show features user hasn't tried), priority weighting
- [ ] **T083** Create admin analytics dashboard in `app/admin/analytics/page.tsx` - feature discovery rate, usage heatmap, conversion funnel (view → click → complete)

## Phase 3.10: Data Seeding & Testing Utilities

### Category 15: Test Data & Utilities [P]
- [ ] **T084** [P] Create `scripts/seed-dashboard-data.ts` - generate sample digest, priority queue items (100), preferences for demo user
- [ ] **T085** [P] Create `scripts/seed-large-dataset.ts` - generate 10,000 priority queue items for performance testing
- [ ] **T086** [P] Create `lib/test-utils/dashboard-test-helpers.ts` - helper functions for E2E tests (login, seed data, reset state)

## Phase 3.11: Polish & Launch Preparation

### Category 16: Quality Assurance
- [ ] **T087** Run Lighthouse audits on all pages - dashboard, mobile dashboard, tablet dashboard - fix issues until all >90 score
- [ ] **T088** Visual regression tests with Playwright - screenshot dashboard at 375px, 768px, 1024px, 1440px, compare with baselines
- [ ] **T089** Cross-browser testing - manually test Chrome 90+, Safari 14+, Firefox 88+, verify no layout breaks
- [ ] **T090** Load testing - use k6 or Artillery to simulate 100 concurrent users on /dashboard, verify <2.5s TTI under load

### Category 17: Feature Flags & Rollout
- [ ] **T091** Create feature flag in `lib/feature-flags.ts` - `ENABLE_DASHBOARD_V2` flag, default false, read from env var or Supabase config
- [ ] **T092** Update `app/dashboard/page.tsx` - if flag enabled, show new dashboard (dashboard-v2), else show old dashboard
- [ ] **T093** Create rollout plan in `docs/dashboard-v2-rollout.md` - 10% users week 1, 50% week 2, 100% week 3, rollback plan

### Category 18: Documentation & Deployment
- [ ] **T094** [P] Update `README.md` - add dashboard redesign section, new environment variables, updated screenshots
- [ ] **T095** [P] Create `docs/dashboard-v2-architecture.md` - component tree diagram, data flow, API contracts, performance targets
- [ ] **T096** [P] Update `CLAUDE.md` - add dashboard-v2 components to agent context, recent changes section
- [ ] **T097** Create deployment checklist in `docs/deployment-checklist.md` - migrations applied, feature flags configured, monitoring set up

### Category 19: Final Validation
- [ ] **T098** Run full quickstart validation from `quickstart.md` - all 8 scenarios (T008-T017), document any issues
- [ ] **T099** User acceptance testing (UAT) - 5 users test dashboard, collect feedback via Google Form, prioritize P0 bugs
- [ ] **T100** Final QA pass - run all tests (`npm run test:e2e`), verify 100% pass rate, fix any failures

## Dependencies

### Critical Path
```
Database (T001-T007)
    ↓
E2E Tests (T008-T027) [P] ←─── MUST FAIL initially
    ↓
API Implementation (T028-T039) ←─── Makes tests pass
    ↓
Components (T040-T053) [P]
    ↓
Integration (T054-T058)
    ↓
Responsive/A11y (T059-T066) [P]
    ↓
PWA/Performance (T067-T074) [P]
    ↓
Background Jobs (T075-T078)
    ↓
Analytics (T079-T083) [P]
    ↓
Polish & Launch (T087-T100)
```

### Blocking Dependencies
- T007 (apply migrations) blocks all tests and implementation
- T008-T027 (all tests) must complete before T028-T039 (implementation)
- T028-T039 (API routes) block T040-T053 (components that fetch data)
- T054-T058 (integration) blocks T059-T066 (responsive/a11y)
- T087-T090 (QA) must complete before T091-T093 (rollout)

### Parallel Execution Groups

**Group 1: Database Migrations [P]** (Run together)
```bash
Task: "Create migration dashboard_preferences.sql"
Task: "Create migration ai_digest.sql"
Task: "Create migration priority_queue.sql"
Task: "Create migration feature_tracking.sql"
Task: "Create migration feature_spotlight.sql"
```

**Group 2: E2E Tests [P]** (Run together after T007)
```bash
Task: "E2E test new user first experience (T008)"
Task: "E2E test power user workflow (T009)"
Task: "E2E test feature discovery (T010)"
Task: "E2E test mobile responsive (T011)"
Task: "E2E test tablet responsive (T012)"
Task: "E2E test accessibility keyboard (T013)"
Task: "E2E test accessibility screen reader (T014)"
Task: "E2E test performance Lighthouse (T015)"
Task: "E2E test personalization (T016)"
Task: "E2E test offline mode (T017)"
```

**Group 3: API Contract Tests [P]** (Run together after T007)
```bash
Task: "Contract test GET /api/dashboard/preferences (T018)"
Task: "Contract test PUT /api/dashboard/preferences (T019)"
Task: "Contract test GET /api/dashboard/digest (T020)"
Task: "Contract test POST /api/dashboard/digest (T021)"
Task: "Contract test GET /api/dashboard/priority-queue (T022)"
Task: "Contract test PATCH /api/dashboard/priority-queue/[id] (T023)"
Task: "Contract test GET /api/dashboard/metrics (T024)"
Task: "Contract test GET /api/dashboard/spotlight (T025)"
Task: "Contract test POST /api/dashboard/interactions (T026)"
Task: "Contract test POST /api/dashboard/analytics/view (T027)"
```

**Group 4: Dashboard Components [P]** (Run together after T039)
```bash
Task: "Create ai-digest-card.tsx (T040)"
Task: "Create priority-queue.tsx (T041)"
Task: "Create impact-metrics.tsx (T042)"
Task: "Create research-gpt-launcher.tsx (T043)"
Task: "Create feature-spotlight.tsx (T044)"
Task: "Create enhanced-stats-grid.tsx (T045)"
```

**Group 5: Navigation Components [P]** (Run together after T039)
```bash
Task: "Create goal-based-nav.tsx (T046)"
Task: "Create mobile-bottom-nav.tsx (T047)"
Task: "Create contextual-sidebar.tsx (T048)"
Task: "Create command-palette.tsx (T049)"
```

**Group 6: Analytics [P]** (Run together after T078)
```bash
Task: "Create track-interaction.ts (T079)"
Task: "Create track-page-view.ts (T080)"
```

**Group 7: Documentation [P]** (Run together after T098)
```bash
Task: "Update README.md (T094)"
Task: "Create dashboard-v2-architecture.md (T095)"
Task: "Update CLAUDE.md (T096)"
```

## Notes

### TDD Workflow
1. Write test (T008-T027) → Test FAILS ✅
2. Implement feature (T028-T058) → Test PASSES ✅
3. Refactor if needed → Test still PASSES ✅

### Parallel Execution Best Practices
- **[P] tasks**: Different files, no shared state, can run simultaneously
- **Sequential tasks**: Same file or dependencies, must run in order
- Use task runner (e.g., `npm-run-all -p task1 task2 task3`) for parallel execution

### Commit Strategy
- Commit after each task (atomic commits)
- Format: `feat(dashboard): T###: Task description`
- Example: `feat(dashboard): T040: Create AI digest card component`

### Common Pitfalls to Avoid
- ❌ Implementing before tests are written
- ❌ Modifying same file in parallel tasks
- ❌ Skipping E2E tests for "faster" implementation
- ❌ Forgetting to mark [P] for truly independent tasks
- ❌ Not running `npm run test:e2e` after each phase

## Validation Checklist

**GATE: Checked before deployment**

- [ ] All 100 tasks completed (T001-T100)
- [ ] All E2E tests passing (`npm run test:e2e` 100% pass rate)
- [ ] Lighthouse score >90 on all viewports (mobile, tablet, desktop)
- [ ] WCAG 2.1 AA compliant (0 axe-core violations)
- [ ] Performance: FCP <1s, TTI <2.5s, LCP <2s
- [ ] PWA installable (manifest.json, service worker registered)
- [ ] Offline mode works (cached data displayed, actions queued)
- [ ] All API contracts match OpenAPI spec (contracts/dashboard-api.yaml)
- [ ] All database migrations applied successfully (`supabase db push`)
- [ ] Feature flag configured for gradual rollout
- [ ] Quickstart validation completed (all 8 scenarios pass)
- [ ] UAT feedback incorporated (P0 bugs fixed)
- [ ] Documentation updated (README, architecture docs)
- [ ] Deployment checklist completed

---

**Status**: ✅ Tasks ready for execution
**Total Tasks**: 100
**Estimated Duration**: 6-8 weeks (with team of 3-4 developers)
**Parallelization Potential**: ~40% of tasks can run in parallel ([P] marked)
