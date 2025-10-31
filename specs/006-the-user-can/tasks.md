# Tasks: Stream-Based Work Organization

**Feature**: 006-the-user-can (Stream-Based Work Organization)
**Input**: Design documents from `/home/vik/oppspot/specs/006-the-user-can/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/streams-api.yaml ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Loaded plan.md from feature directory
   → Tech stack: Next.js 15, TypeScript, Supabase, shadcn/ui, Zustand
   → Structure: App Router with lib/ services
2. Loaded design documents:
   → data-model.md: 3 entities (streams, stream_items, stream_access)
   → contracts/streams-api.yaml: 9 API endpoint groups
   → research.md: All technical decisions finalized
   → quickstart.md: Test scenarios defined
3. Generated tasks by category:
   → Setup: Database migration, types (5 tasks)
   → Tests: Contract tests for all endpoints (17 tasks)
   → Core: Services, API routes (17 tasks)
   → Integration: UI components, tool integration (11 tasks)
   → Polish: E2E tests, performance, docs (9 tasks)
4. Applied task rules:
   → Different files = marked [P] for parallel
   → Same file = sequential (no [P])
   → Tests BEFORE implementation (TDD mandatory)
5. Numbered tasks sequentially (T001-T059)
6. Validated completeness:
   → All contracts have tests ✓
   → All entities have models ✓
   → All endpoints implemented ✓
7. SUCCESS: Tasks ready for TDD execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Paths relative to repository root `/home/vik/oppspot/`

---

## Phase 3.1: Setup & Foundation

### T001-T005: Database Schema & Migration

- [ ] **T001** Create Supabase migration file `supabase/migrations/[timestamp]_create_streams_tables.sql`
  - Create ENUM types: `work_product_type AS ENUM ('business', 'report', 'contact', 'list', 'insight', 'query')`
  - Create ENUM types: `permission_level_enum AS ENUM ('view', 'edit', 'manage')`
  - Create `streams` table with columns: id, user_id, name, is_system, archived_at, created_at, updated_at
  - Create `stream_items` table with columns: id, stream_id, item_type, item_id, added_by, added_at
  - Create `stream_access` table with columns: id, stream_id, user_id, permission_level, granted_by, granted_at
  - Add `active_stream_id UUID REFERENCES streams(id) ON DELETE SET NULL` to profiles table
  - Create indexes from data-model.md (5 indexes total)
  - Create trigger function `create_general_stream_for_user()` on auth.users INSERT
  - **Expected outcome**: Complete migration file ready

- [ ] **T002** Create RLS policies file `supabase/migrations/[timestamp]_streams_rls_policies.sql`
  - **streams policies**: SELECT (owner OR shared), INSERT (owner), UPDATE (owner, not system), DELETE (owner, not system)
  - **stream_items policies**: SELECT (inherit stream), INSERT (edit+), DELETE (edit+)
  - **stream_access policies**: SELECT (owner + self), INSERT (owner), UPDATE (owner), DELETE (owner)
  - Use security definer functions for complex permission checks
  - **Expected outcome**: Complete RLS policies file

- [ ] **T003** Apply database migrations and verify
  - Run: `npx supabase db push` or apply via Supabase dashboard
  - Verify tables exist: streams, stream_items, stream_access
  - Verify trigger exists: on_auth_user_created
  - Verify RLS enabled on all three tables
  - **Expected outcome**: Database schema live in Supabase

- [ ] **T004** Regenerate TypeScript database types
  - Run: `npx supabase gen types typescript --project-id [your-project-id] > types/database.ts`
  - Verify new types: Stream, StreamItem, StreamAccess, WorkProductType, PermissionLevelEnum
  - **Expected outcome**: types/database.ts updated with stream types

- [ ] **T005** [P] Create validation schemas in `lib/streams/validation.ts`
  - `createStreamSchema = z.object({ name: z.string().min(1).max(255).trim() })`
  - `addStreamItemSchema = z.object({ item_type: z.enum([...]), item_id: z.string().uuid() })`
  - `grantAccessSchema = z.object({ user_id: z.string().uuid(), permission_level: z.enum(['view', 'edit', 'manage']) })`
  - `updateStreamSchema`, `moveItemSchema`
  - **Expected outcome**: Zod schemas for request validation

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation begins.

### T006-T011: Contract Tests - Stream Management Endpoints

- [ ] **T006** [P] Contract test: GET /api/streams in `tests/e2e/streams-api.spec.ts`
  - Test: Returns owned and shared streams
  - Test: Filters archived streams by default
  - Test: Includes archived when `?include_archived=true`
  - Test: Returns 401 for unauthenticated
  - Test: Separates owned vs shared in response
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T007** [P] Contract test: POST /api/streams in `tests/e2e/streams-api.spec.ts`
  - Test: Creates stream with valid name → 201
  - Test: Rejects empty name → 400
  - Test: Rejects name > 255 chars → 400
  - Test: Returns created stream object with id
  - Test: Sets is_system = false for user streams
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T008** [P] Contract test: GET /api/streams/[streamId] in `tests/e2e/streams-api.spec.ts`
  - Test: Returns stream details for owner
  - Test: Returns stream for users with access
  - Test: Returns 404 for non-existent stream
  - Test: Returns 403 for unauthorized users
  - Test: Includes item_count in response
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T009** [P] Contract test: PUT /api/streams/[streamId] in `tests/e2e/streams-api.spec.ts`
  - Test: Renames stream successfully → 200
  - Test: Prevents renaming system streams → 400
  - Test: Returns 403 for non-owners
  - Test: Validates name constraints
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T010** [P] Contract test: DELETE /api/streams/[streamId] in `tests/e2e/streams-api.spec.ts`
  - Test: Archives stream (sets archived_at) → 204
  - Test: Prevents archiving system streams → 400
  - Test: Returns 403 for non-owners
  - Test: Verify stream_items remain (cascade)
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T011** [P] Contract test: POST /api/streams/[streamId]/restore in `tests/e2e/streams-api.spec.ts`
  - Test: Restores archived stream (sets archived_at = NULL) → 200
  - Test: Returns 400 for already-active stream
  - Test: Returns 403 for non-owners
  - Test: Returns 404 for non-existent stream
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

### T012-T015: Contract Tests - Stream Items Endpoints

- [ ] **T012** [P] Contract test: POST /api/streams/[streamId]/items in `tests/e2e/stream-items-api.spec.ts`
  - Test: Adds item with valid type/ID → 201
  - Test: Validates item_type enum → 400
  - Test: Validates item_id UUID format → 400
  - Test: Returns 403 for view-only users
  - Test: Allows edit+ permission users
  - Test: Same item can be in multiple streams
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T013** [P] Contract test: GET /api/streams/[streamId]/items in `tests/e2e/stream-items-api.spec.ts`
  - Test: Lists items chronologically (newest first, ORDER BY added_at DESC)
  - Test: Paginates results (limit/offset query params)
  - Test: Returns items for all permission levels (view+)
  - Test: Returns empty array for empty stream
  - Test: Includes item metadata (added_by, added_at)
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T014** [P] Contract test: DELETE /api/streams/[streamId]/items/[itemId] in `tests/e2e/stream-items-api.spec.ts`
  - Test: Removes item successfully → 204
  - Test: Returns 403 for view-only users
  - Test: Returns 404 for non-existent item
  - Test: Allows edit+ permission users
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T015** [P] Contract test: PATCH /api/streams/[streamId]/items/[itemId] in `tests/e2e/stream-items-api.spec.ts`
  - Test: Moves item to different stream
  - Test: Validates target stream exists → 404
  - Test: Checks permissions on both streams → 403
  - Test: Preserves item metadata (item_type, item_id)
  - Test: Updates added_at to current time
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

### T016-T019: Contract Tests - Stream Access (Sharing) Endpoints

- [ ] **T016** [P] Contract test: POST /api/streams/[streamId]/access in `tests/e2e/stream-access-api.spec.ts`
  - Test: Grants access to user → 201
  - Test: Validates permission_level enum → 400
  - Test: Returns 403 for non-owners
  - Test: Prevents duplicate grants (unique constraint) → 409
  - Test: Prevents sharing system streams → 400
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T017** [P] Contract test: GET /api/streams/[streamId]/access in `tests/e2e/stream-access-api.spec.ts`
  - Test: Lists access grants for stream
  - Test: Returns 403 for non-owners (manage+ only)
  - Test: Includes user_email and permission_level
  - Test: Includes granted_by and granted_at
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T018** [P] Contract test: DELETE /api/streams/[streamId]/access/[accessId] in `tests/e2e/stream-access-api.spec.ts`
  - Test: Revokes access successfully → 204
  - Test: Returns 403 for non-owners
  - Test: Returns 404 for non-existent grant
  - Test: User loses access immediately
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T019** [P] Contract test: PATCH /api/streams/[streamId]/access/[accessId] in `tests/e2e/stream-access-api.spec.ts`
  - Test: Updates permission level → 200
  - Test: Validates new permission_level → 400
  - Test: Returns 403 for non-owners
  - Test: Returns updated grant object
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

### T020-T022: Contract Tests - Active Stream & Archive Endpoints

- [ ] **T020** [P] Contract test: GET /api/streams/active in `tests/e2e/streams-active-api.spec.ts`
  - Test: Returns user's active stream from profiles.active_stream_id
  - Test: Defaults to General stream if not set
  - Test: Returns 401 for unauthenticated users
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T021** [P] Contract test: PUT /api/streams/active in `tests/e2e/streams-active-api.spec.ts`
  - Test: Sets active stream successfully → 200
  - Test: Updates profiles.active_stream_id
  - Test: Validates stream exists → 404
  - Test: Validates user has access → 403
  - Test: Persists across sessions
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

- [ ] **T022** [P] Contract test: GET /api/streams/archive in `tests/e2e/streams-active-api.spec.ts`
  - Test: Lists archived streams (archived_at IS NOT NULL)
  - Test: Only returns user's owned archived streams
  - Test: Includes archive timestamp
  - Test: Excludes shared streams (owned only)
  - **Expected**: All tests FAIL (endpoint doesn't exist yet)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T023-T026: Service Layer - Business Logic

- [ ] **T023** [P] Create stream service in `lib/streams/stream-service.ts`
  - `createStream(userId: string, name: string)` - create new stream
  - `getUserStreams(userId: string, includeArchived: boolean)` - list owned + shared streams
  - `getStreamById(streamId: string, userId: string)` - fetch with permission check
  - `updateStream(streamId: string, userId: string, name: string)` - rename stream
  - `archiveStream(streamId: string, userId: string)` - soft delete
  - `restoreStream(streamId: string, userId: string)` - restore archived
  - `getGeneralStream(userId: string)` - fetch system General stream
  - Include permission checks using RLS
  - **Expected outcome**: Core stream CRUD operations

- [ ] **T024** [P] Create stream items service in `lib/streams/stream-item-service.ts`
  - `addItemToStream(streamId, itemType, itemId, userId)` - add item
  - `getStreamItems(streamId, userId, limit, offset)` - list with pagination, ORDER BY added_at DESC
  - `removeItemFromStream(itemId, streamId, userId)` - delete item
  - `moveItemToStream(itemId, fromStreamId, toStreamId, userId)` - move between streams
  - `getItemCount(streamId)` - count items in stream
  - Permission checks via stream_access
  - **Expected outcome**: Item management operations

- [ ] **T025** [P] Create stream access service in `lib/streams/stream-access-service.ts`
  - `grantAccess(streamId, userId, targetUserId, permissionLevel)` - invite user
  - `getStreamAccess(streamId, userId)` - list access grants (owner only)
  - `revokeAccess(accessId, streamId, userId)` - remove access
  - `updatePermission(accessId, streamId, userId, newPermission)` - change permission
  - `checkPermission(streamId, userId)` - return PermissionLevel | null
  - Handle unique constraint errors
  - **Expected outcome**: Sharing/permissions logic

- [ ] **T026** [P] Create active stream service in `lib/streams/active-stream-service.ts`
  - `getActiveStream(userId: string)` - fetch from profiles.active_stream_id
  - `setActiveStream(userId: string, streamId: string)` - update preference
  - `ensureActiveStream(userId: string)` - fallback to General if null
  - Update profiles table
  - **Expected outcome**: Active stream session management

### T027-T035: API Routes Implementation

- [ ] **T027** Implement GET & POST /api/streams in `app/api/streams/route.ts`
  - **GET**: Use `getUserStreams()`, handle `include_archived` query param, separate owned/shared
  - **POST**: Validate with `createStreamSchema`, use `createStream()`, return 201
  - Auth: Check Supabase session
  - **Expected outcome**: T006, T007 tests PASS

- [ ] **T028** Implement GET, PUT, DELETE /api/streams/[streamId]/route.ts
  - **GET**: Use `getStreamById()`, include item count, check permissions
  - **PUT**: Validate name, use `updateStream()`, prevent renaming system streams
  - **DELETE**: Use `archiveStream()`, prevent archiving system streams, return 204
  - **Expected outcome**: T008, T009, T010 tests PASS

- [ ] **T029** Implement POST /api/streams/[streamId]/restore/route.ts
  - Use `restoreStream()` service
  - Check ownership
  - Validate stream is archived
  - Return restored stream object
  - **Expected outcome**: T011 tests PASS

- [ ] **T030** Implement POST & GET /api/streams/[streamId]/items/route.ts
  - **POST**: Validate with `addStreamItemSchema`, use `addItemToStream()`, check edit+ permission, return 201
  - **GET**: Use `getStreamItems()`, handle limit/offset query params, ORDER BY added_at DESC
  - **Expected outcome**: T012, T013 tests PASS

- [ ] **T031** Implement DELETE & PATCH /api/streams/[streamId]/items/[itemId]/route.ts
  - **DELETE**: Use `removeItemFromStream()`, check edit+ permission, return 204
  - **PATCH**: Validate target stream, use `moveItemToStream()`, check permissions on both streams
  - **Expected outcome**: T014, T015 tests PASS

- [ ] **T032** Implement POST & GET /api/streams/[streamId]/access/route.ts
  - **POST**: Validate with `grantAccessSchema`, use `grantAccess()`, check ownership, prevent sharing system streams, return 201
  - **GET**: Use `getStreamAccess()`, check ownership, include user details
  - Handle unique constraint errors (409)
  - **Expected outcome**: T016, T017 tests PASS

- [ ] **T033** Implement DELETE & PATCH /api/streams/[streamId]/access/[accessId]/route.ts
  - **DELETE**: Use `revokeAccess()`, check ownership, return 204
  - **PATCH**: Validate permission_level, use `updatePermission()`, check ownership
  - **Expected outcome**: T018, T019 tests PASS

- [ ] **T034** Implement GET & PUT /api/streams/active/route.ts
  - **GET**: Use `getActiveStream()`, fallback to General stream if null, return 401 if not authenticated
  - **PUT**: Validate stream_id, use `setActiveStream()`, check user has access
  - **Expected outcome**: T020, T021 tests PASS

- [ ] **T035** Implement GET /api/streams/archive/route.ts
  - Filter by archived_at IS NOT NULL
  - Use `getUserStreams()` with archived filter
  - Only return owned streams (not shared)
  - **Expected outcome**: T022 tests PASS

---

## Phase 3.4: UI Components & Client State

### T036-T038: React Hooks & State Management

- [ ] **T036** [P] Create Zustand store in `lib/stores/stream-store.ts`
  - State: `activeStreamId: string | null`, `isLoading: boolean`
  - Actions: `setActiveStream(streamId)`, `clearActiveStream()`, `loadActiveStream()`
  - Persist to localStorage for client cache
  - Sync with API on change
  - **Expected outcome**: Client state management

- [ ] **T037** [P] Create React hooks in `lib/streams/stream-hooks.ts`
  - `useStreams()` - fetch user's streams with SWR/React Query
  - `useStreamItems(streamId)` - fetch items for stream
  - `useActiveStream()` - get/set active stream from store + API
  - `useStreamAccess(streamId)` - fetch access grants
  - `useMutateStream()` - mutations for create/update/delete
  - **Expected outcome**: Data fetching hooks

- [ ] **T038** [P] Create TypeScript types in `lib/streams/types.ts`
  - Stream, StreamWithCounts, SharedStream interfaces
  - StreamItem, StreamItemWithDetails interfaces
  - StreamAccess, PermissionLevel types
  - API request/response types
  - **Expected outcome**: Type safety across UI

### T039-T045: UI Components

- [ ] **T039** [P] Create StreamSelector component in `components/streams/stream-selector.tsx`
  - Dropdown menu with stream list (shadcn/ui DropdownMenu)
  - Show active stream indicator (checkmark)
  - Click to switch active stream
  - Separate owned vs shared streams (grouped)
  - "Create new stream" button at bottom
  - "Manage streams" link
  - **Expected outcome**: Stream switching UI

- [ ] **T040** [P] Create ActiveStreamIndicator component in `components/streams/active-stream-indicator.tsx`
  - Badge/chip showing current active stream name
  - Show item count badge
  - Click to open StreamSelector
  - Responsive design (desktop/mobile)
  - **Expected outcome**: Visual feedback of active stream

- [ ] **T041** [P] Create SaveToStreamButton component in `components/streams/save-to-stream-button.tsx`
  - Generic button for saving any work product
  - Props: itemType, itemId, variant, onSave callback
  - Click → save to active stream
  - Success/error toast notifications
  - Loading state
  - **Expected outcome**: Reusable save action

- [ ] **T042** [P] Create StreamManager component in `components/streams/stream-manager.tsx`
  - Full CRUD UI: list, create, rename, archive
  - Tabs: Active Streams, Archived Streams, Shared with Me
  - Create stream dialog
  - Rename stream inline edit
  - Archive button (confirm dialog)
  - Share button per stream
  - **Expected outcome**: Complete stream management UI

- [ ] **T043** [P] Create StreamItemList component in `components/streams/stream-item-list.tsx`
  - Display items chronologically (newest first)
  - Render item based on type: business/report/contact/list/insight/query
  - Show item icon, title, added_at timestamp, added_by user
  - Pagination controls (Next/Prev)
  - Remove item button (trash icon)
  - Move to stream dropdown
  - **Expected outcome**: Item list display

- [ ] **T044** [P] Create StreamShareDialog component in `components/streams/stream-share-dialog.tsx`
  - shadcn/ui Dialog component
  - Input: user email to invite
  - Select: permission level (View/Edit/Manage radio buttons)
  - "Send Invite" button
  - List current access grants (table)
  - Revoke access button per grant
  - Change permission dropdown per grant
  - **Expected outcome**: Sharing UI

- [ ] **T045** [P] Create StreamArchiveView component in `components/streams/stream-archive-view.tsx`
  - List archived streams (card layout)
  - Show archive date ("Archived 3 days ago")
  - Restore button per stream
  - Permanent delete option (optional, with confirmation)
  - Empty state if no archived streams
  - **Expected outcome**: Archive management UI

---

## Phase 3.5: Integration with Existing Tools

**Note**: These tasks modify existing tool files to add stream functionality.

- [ ] **T046** Integrate with main layout in `app/layout.tsx` or global header component
  - Add `<StreamSelector />` to global header (top navigation)
  - Add `<ActiveStreamIndicator />` to navigation bar
  - Load active stream on app mount
  - **Expected outcome**: Stream UI visible on all pages

- [ ] **T047** Integrate with Discover tool
  - Files: `app/discover/` components, `app/business/[id]/page.tsx`
  - Add `<SaveToStreamButton itemType="business" itemId={businessId} />` to business cards
  - Add "Save Search" button with `itemType="query"` to search results
  - Add to business detail page header
  - **Expected outcome**: Can save businesses and queries to streams

- [ ] **T048** Integrate with Diligence tool (ResearchGPT)
  - Files: `components/research/research-report.tsx`, relevant data room components
  - Add save button to report header: `<SaveToStreamButton itemType="report" itemId={reportId} />`
  - Add to contacts view: `itemType="contact"`
  - Add to insights view: `itemType="insight"`
  - **Expected outcome**: Can save reports/contacts/insights to streams

- [ ] **T049** Integrate with Collaboration tool
  - Files: Collaboration components (business lists, shared documents)
  - Add save button for business lists: `itemType="list"`
  - Add to shared documents
  - **Expected outcome**: Can save lists to streams

- [ ] **T050** Integrate with Outreach tool
  - Files: Outreach components (contact lists, saved searches)
  - Add save button for contact lists: `itemType="list"`
  - Add save button for saved searches: `itemType="query"`
  - **Expected outcome**: Can save contacts/queries to streams

---

## Phase 3.6: Polish & End-to-End Testing

### T051-T055: E2E Integration Tests

- [ ] **T051** [P] E2E test: Complete stream workflow in `tests/e2e/streams-workflow.spec.ts`
  - Test: New user auto-gets General stream
  - Test: Create custom stream "Deal 2024"
  - Test: Save business from Discover tool to stream
  - Test: Switch active stream
  - Test: Save report to new active stream
  - Test: Archive and restore stream
  - Test: General stream cannot be archived
  - **Expected outcome**: Full workflow works end-to-end

- [ ] **T052** [P] E2E test: Sharing and permissions in `tests/e2e/streams-sharing.spec.ts`
  - Test: Owner shares stream with view permission
  - Test: Viewer can see items but not add/remove
  - Test: Owner upgrades to edit permission
  - Test: Editor can add/remove items
  - Test: Owner upgrades to manage permission
  - Test: Manager can rename stream and invite others
  - Test: Manager cannot archive stream (owner only)
  - **Expected outcome**: Permission matrix enforced correctly

- [ ] **T053** [P] E2E test: Cross-tool integration in `tests/e2e/streams-cross-tool.spec.ts`
  - Test: Save business from Discover → appears in stream
  - Test: Save report from Diligence → appears in stream
  - Test: Save contact from Collaboration → appears in stream
  - Test: Save query from Outreach → appears in stream
  - Test: All items appear in correct chronological order
  - Test: StreamSelector works in all 4 tools
  - **Expected outcome**: All 4 tools integrate seamlessly

- [ ] **T054** [P] Performance test in `tests/performance/streams-load.spec.ts`
  - Test: GET /api/streams with 100 streams < 200ms
  - Test: GET /api/streams/[id]/items with 1000 items < 200ms
  - Test: Stream selector renders in < 50ms
  - Test: Set active stream < 100ms
  - Test: 100 concurrent saves succeed without errors
  - **Expected outcome**: Performance targets met

- [ ] **T055** [P] Security test: RLS policies in `tests/security/stream-rls.spec.ts`
  - Test: User A cannot read User B's private streams (direct DB query)
  - Test: User A cannot modify User B's streams
  - Test: View permission prevents editing items
  - Test: Edit permission allows items but not sharing
  - Test: Manage permission allows everything except archive
  - Test: Cannot archive system streams via API or DB
  - **Expected outcome**: RLS policies enforced at DB level

### T056-T059: Polish & Documentation

- [ ] **T056** Create data migration script for existing users in `scripts/initialize-streams-for-existing-users.ts`
  - Query all users in auth.users
  - For each user without General stream:
    - Create General stream (is_system = TRUE)
    - Set profiles.active_stream_id to new stream
  - Log summary (users processed, streams created)
  - **Expected outcome**: Backfill script ready

- [ ] **T057** [P] Update project documentation
  - Update `CLAUDE.md` with stream system section
  - Document key files and patterns
  - Add code examples for common operations
  - Update quickstart.md with final instructions
  - **Expected outcome**: Complete developer guide

- [ ] **T058** [P] Add error handling and loading states
  - Add Suspense boundaries to async components
  - Add error boundaries to stream components
  - Add loading skeletons to stream list
  - Add retry logic for failed API requests
  - Toast notifications for all actions
  - **Expected outcome**: Better UX for errors and loading

- [ ] **T059** Final validation and cleanup
  - Run all E2E tests: `npm run test:e2e`
  - Run type check: `npx tsc --noEmit`
  - Run linting: `npm run lint`
  - Verify no console errors in browser
  - Test on mobile responsive viewports
  - Remove console.log statements
  - Remove commented code
  - **Expected outcome**: Production-ready feature

---

## Dependencies

**Must Complete in Order**:
1. **T001-T005** (Database & Setup) → Everything depends on this
2. **T006-T022** (Contract Tests) → Must FAIL before implementation
3. **T023-T026** (Services) → Required by API routes
4. **T027-T035** (API Routes) → Tests should PASS after implementation
5. **T036-T045** (UI Components) → Require working APIs
6. **T046-T050** (Tool Integration) → Require working components
7. **T051-T059** (E2E & Polish) → Validate entire feature

**Blocking Dependencies**:
- T001-T004 block ALL other tasks (database foundation)
- T005 blocks T023-T026 (services need validation schemas)
- T006-T022 block T027-T035 (tests before implementation - TDD)
- T023-T026 block T027-T035 (services before API routes)
- T027-T035 block T046-T050 (APIs before UI integration)
- T036-T038 block T039-T045 (hooks/state before components)
- T039-T045 block T046-T050 (components before integration)
- T046-T050 block T051-T055 (integration before E2E tests)

---

## Parallel Execution Examples

### Example 1: Launch all contract tests together (after database setup)
```bash
# After T001-T005 complete, run T006-T022 in parallel:
Task: "Contract test GET /api/streams in tests/e2e/streams-api.spec.ts"
Task: "Contract test POST /api/streams in tests/e2e/streams-api.spec.ts"
Task: "Contract test GET /api/streams/[streamId] in tests/e2e/streams-api.spec.ts"
Task: "Contract test POST /api/streams/[streamId]/items in tests/e2e/stream-items-api.spec.ts"
Task: "Contract test GET /api/streams/[streamId]/items in tests/e2e/stream-items-api.spec.ts"
# ... all 17 contract tests
```

### Example 2: Build all services in parallel (after tests fail)
```bash
# After T006-T022 fail, run T023-T026 in parallel:
Task: "Create stream service in lib/streams/stream-service.ts"
Task: "Create stream items service in lib/streams/stream-item-service.ts"
Task: "Create stream access service in lib/streams/stream-access-service.ts"
Task: "Create active stream service in lib/streams/active-stream-service.ts"
```

### Example 3: Build all UI components in parallel (after hooks ready)
```bash
# After T036-T038 complete, run T039-T045 in parallel:
Task: "Create StreamSelector in components/streams/stream-selector.tsx"
Task: "Create ActiveStreamIndicator in components/streams/active-stream-indicator.tsx"
Task: "Create SaveToStreamButton in components/streams/save-to-stream-button.tsx"
Task: "Create StreamManager in components/streams/stream-manager.tsx"
Task: "Create StreamItemList in components/streams/stream-item-list.tsx"
Task: "Create StreamShareDialog in components/streams/stream-share-dialog.tsx"
Task: "Create StreamArchiveView in components/streams/stream-archive-view.tsx"
```

### Example 4: Run all E2E tests in parallel (final validation)
```bash
# After T046-T050 complete, run T051-T055 in parallel:
Task: "E2E test complete workflow in tests/e2e/streams-workflow.spec.ts"
Task: "E2E test sharing permissions in tests/e2e/streams-sharing.spec.ts"
Task: "E2E test cross-tool integration in tests/e2e/streams-cross-tool.spec.ts"
Task: "Performance test in tests/performance/streams-load.spec.ts"
Task: "Security test RLS in tests/security/stream-rls.spec.ts"
```

---

## Validation Checklist

Before marking feature complete, verify:

- [x] All entities from data-model.md have tables: streams ✓, stream_items ✓, stream_access ✓
- [x] All 9 endpoint groups from contracts/streams-api.yaml have contract tests (T006-T022) ✓
- [x] All 9 endpoint groups have implementations (T027-T035) ✓
- [x] All contract tests come BEFORE implementation (Phase 3.2 before 3.3) ✓
- [x] Parallel tasks are in different files (marked [P]) ✓
- [x] Each task specifies exact file path ✓
- [x] No [P] tasks modify the same file ✓
- [x] TDD workflow enforced (tests fail → implement → tests pass) ✓
- [x] Integration with all 4 tools (T047-T050) ✓
- [x] E2E tests cover complete workflows (T051-T053) ✓
- [x] Performance targets validated (T054: <200ms API, <50ms UI) ✓
- [x] Security validated (T055: RLS policies) ✓
- [x] Existing users supported (T056: backfill script) ✓

---

## Notes for Implementation

### TDD Workflow (MANDATORY)
1. Write contract test (T006-T022) → Test FAILS
2. Implement service (T023-T026)
3. Implement API route (T027-T035) → Test PASSES
4. Do NOT implement ANY API route until its test fails

### Best Practices
- **Commit after each task**: Atomic commits enable easy rollback
- **Run tests frequently**: Catch regressions early
- **Use existing patterns**: Follow oppSpot conventions (Supabase client, error handling, shadcn/ui)
- **Permission checks**: Always verify user permissions before operations
- **System stream protection**: NEVER allow renaming/archiving General stream (is_system = TRUE)
- **Responsive design**: All UI components must work on mobile (320px+)
- **Accessibility**: Use proper ARIA labels, keyboard navigation, focus management
- **Error handling**: Graceful failures with user-friendly messages
- **Loading states**: Show feedback for all async operations (Suspense, skeletons)

### Common Pitfalls to Avoid
- Don't skip contract tests (T006-T022) - TDD is mandatory
- Don't implement API routes before services are ready
- Don't forget permission checks in API routes
- Don't allow renaming/archiving system streams
- Don't forget to update profiles.active_stream_id when setting active stream
- Don't miss chronological ordering (ORDER BY added_at DESC) for items

---

**Total Tasks**: 59
**Estimated Timeline**: 12-15 development days with strict TDD approach
**Ready for Execution**: Yes - Follow T001 → T059 in order, parallelizing [P] tasks

---

*Tasks generated: 2025-10-27*
*Based on: spec.md v1.0, plan.md, data-model.md, contracts/streams-api.yaml, research.md, quickstart.md*
*TDD approach: Tests BEFORE implementation (Phase 3.2 before 3.3)*
