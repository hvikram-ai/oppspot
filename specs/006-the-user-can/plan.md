# Implementation Plan: Stream-Based Work Organization

**Branch**: `006-the-user-can` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/vik/oppspot/specs/006-the-user-can/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Loaded successfully, 196 lines
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → No NEEDS CLARIFICATION markers found (all resolved in /clarify phase)
   → Project Type: web application (Next.js 15 + Supabase backend)
   → Structure Decision: Next.js App Router with lib/ services
3. Fill the Constitution Check section
   → Constitution template detected (no project-specific constitution yet)
4. Evaluate Constitution Check section
   → No violations - using existing oppSpot architecture patterns
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → All technical decisions resolved in clarifications
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
   → Contracts: REST API endpoints for stream operations
   → Data model: Stream, StreamItem, StreamAccess entities
7. Re-evaluate Constitution Check section
   → No new violations after design
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Task generation approach described
9. STOP - Ready for /tasks command ✓
```

## Summary

Implement a comprehensive work organization system using "streams" (folder-like containers) that allows users to save and organize six types of work products (businesses, reports, contacts, lists, insights, queries) across all four oppSpot tools (Discover, Diligence, Collaboration, Outreach). Streams support:
- Automatic "General" stream creation for new users
- Owner-controlled sharing with 3 permission levels (View/Edit/Manage)
- Soft-delete archiving with restore capability
- Active stream selection for session-based saving
- Chronological item display (newest first)
- Cross-tool integration

Technical approach: Extend existing Supabase schema with new tables (streams, stream_items, stream_access), implement server-side API routes following Next.js App Router patterns, create reusable UI components with stream selector, and integrate save/move actions into existing tool workflows.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (React 19)
**Primary Dependencies**: Next.js 15, React 19, Supabase (PostgreSQL + Auth + Realtime), Tailwind CSS, shadcn/ui, Zustand (state), Zod (validation)
**Storage**: Supabase PostgreSQL with Row Level Security (RLS) policies
**Testing**: Playwright E2E tests (existing pattern), React Testing Library (for new components)
**Target Platform**: Web (desktop + mobile responsive), Server-side rendering with App Router
**Project Type**: web - Next.js full-stack application with Supabase backend
**Performance Goals**: <200ms API response for stream operations, <50ms stream selection UI, realtime sync for shared streams
**Constraints**: Must integrate with existing 4 tools without breaking current workflows, RLS policies for security, support existing user base
**Scale/Scope**: Support 10k+ users, hundreds of streams per user, thousands of items per stream, real-time collaboration

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution file exists yet for this project. Following established oppSpot architectural patterns:
- ✅ Using existing Next.js App Router structure (`app/` directory)
- ✅ Following existing Supabase patterns (RLS policies, server/client separation)
- ✅ Reusing existing UI component library (shadcn/ui)
- ✅ Extending existing service layer pattern (`lib/` directory)
- ✅ Following existing test patterns (Playwright E2E)
- ✅ No new architectural paradigms introduced

## Project Structure

### Documentation (this feature)
```
specs/006-the-user-can/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities & relationships)
├── quickstart.md        # Phase 1 output (dev setup & testing)
├── contracts/           # Phase 1 output (API contracts)
│   ├── streams-api.yaml
│   ├── stream-items-api.yaml
│   └── stream-access-api.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root - Next.js structure)
```
app/
├── api/
│   └── streams/
│       ├── route.ts                    # POST (create), GET (list user streams)
│       ├── [streamId]/
│       │   ├── route.ts                # GET (single), PUT (rename), DELETE (archive)
│       │   ├── items/
│       │   │   └── route.ts            # POST (add item), GET (list items)
│       │   ├── items/[itemId]/
│       │   │   └── route.ts            # DELETE (remove), PATCH (move to another stream)
│       │   ├── access/
│       │   │   └── route.ts            # POST (invite user), GET (list access)
│       │   ├── access/[accessId]/
│       │   │   └── route.ts            # DELETE (revoke), PATCH (update permission)
│       │   ├── restore/
│       │   │   └── route.ts            # POST (restore archived stream)
│       │   └── archive/
│       │       └── route.ts            # GET (list archived streams)
│       └── active/
│           └── route.ts                # GET (get active stream), PUT (set active)

components/
├── streams/
│   ├── stream-selector.tsx             # Dropdown to select/switch active stream
│   ├── stream-manager.tsx              # Full CRUD UI for streams
│   ├── stream-item-list.tsx            # Display items in a stream
│   ├── stream-share-dialog.tsx         # Share stream with permissions
│   ├── stream-archive-view.tsx         # View/restore archived streams
│   └── active-stream-indicator.tsx     # Show current active stream
└── ui/
    └── [existing shadcn components]

lib/
├── streams/
│   ├── stream-service.ts               # Enhanced service layer (exists)
│   ├── stream-item-service.ts          # New: item operations
│   ├── stream-access-service.ts        # New: sharing/permissions
│   └── stream-hooks.ts                 # React hooks for client components
├── supabase/
│   ├── server.ts                       # Existing server client
│   └── client.ts                       # Existing browser client
└── stores/
    └── stream-store.ts                 # Zustand store for active stream state

supabase/
└── migrations/
    └── [timestamp]_create_streams.sql  # New migration

tests/
└── e2e/
    └── streams.spec.ts                 # Playwright E2E tests

types/
└── database.ts                         # Supabase generated types (update)
```

**Structure Decision**: Using existing Next.js App Router structure with `app/`, `components/`, `lib/` organization. All stream functionality integrated into existing architecture.

## Phase 0: Outline & Research

### Research Completed (from /clarify phase)

All technical unknowns were resolved during the clarification phase. No additional research required.

**Key Design Decisions** (already resolved):
1. **Stream Deletion**: Soft-delete (archive) with `archived_at` timestamp
2. **Sharing Model**: Junction table `stream_access` with enum permission levels
3. **Display Order**: PostgreSQL `ORDER BY created_at DESC` with index
4. **Active Stream**: User preference stored in `profiles.active_stream_id`
5. **General Stream**: System stream with `is_system = true` flag
6. **Work Product Types**: Enum type with 6 values mapped to existing entities

### Database Design Decisions

**Storage Pattern**: Extend existing Supabase schema
- **streams** table: id, user_id, name, is_system, archived_at, created_at, updated_at
- **stream_items** table: id, stream_id, item_type (enum), item_id (polymorphic reference), added_by, added_at
- **stream_access** table: id, stream_id, user_id, permission_level (enum), granted_by, granted_at
- **profiles** table: add `active_stream_id` column (FK to streams)

**RLS Policies**:
- streams: Users can CUD own streams, read shared streams via stream_access
- stream_items: Inherit permissions from parent stream
- stream_access: Only stream owners can manage (owner check via streams.user_id)

**Indexes**:
- stream_items(stream_id, added_at DESC) - chronological display
- stream_access(user_id, stream_id) - permission checks
- streams(user_id, archived_at) - user's active streams
- streams(user_id, is_system) - "General" stream lookup

### API Design Pattern

**REST conventions** (following existing oppSpot patterns):
- POST /api/streams - Create stream
- GET /api/streams - List user's streams (owned + shared)
- GET /api/streams/[id] - Get single stream
- PUT /api/streams/[id] - Rename stream
- DELETE /api/streams/[id] - Archive stream (soft-delete)
- POST /api/streams/[id]/items - Add item to stream
- POST /api/streams/[id]/access - Share stream (invite user)
- etc.

**Authentication**: Existing Supabase Auth middleware
**Validation**: Zod schemas matching existing patterns
**Error handling**: Standard Next.js error responses

**Output**: research.md created below

## Phase 1: Design & Contracts
*Prerequisites: research.md complete ✓*

### Data Model (data-model.md)

See `data-model.md` for complete entity definitions.

**Core Entities**:
1. **Stream** - User's organizational container
2. **StreamItem** - Work product saved to a stream  
3. **StreamAccess** - Permission grant for shared streams
4. **User** (existing) - Stream owner and collaborator

**Relationships**:
- Stream 1:N StreamItem (one stream has many items)
- Stream 1:N StreamAccess (one stream shared with many users)
- User 1:N Stream (user owns many streams)
- User 1:N StreamAccess (user has access to many shared streams)
- User 1:1 Stream (active_stream_id - current session stream)

### API Contracts (contracts/ directory)

See `contracts/*.yaml` for complete OpenAPI specifications.

**Stream Management Endpoints**:
- POST /api/streams - Create new stream
- GET /api/streams - List user's streams (owned + shared, filter archived)
- GET /api/streams/[id] - Get single stream details
- PUT /api/streams/[id] - Update stream (rename)
- DELETE /api/streams/[id] - Archive stream (soft-delete)
- POST /api/streams/[id]/restore - Restore archived stream

**Stream Items Endpoints**:
- POST /api/streams/[id]/items - Add item to stream
- GET /api/streams/[id]/items - List items in stream (paginated, chronological)
- DELETE /api/streams/[id]/items/[itemId] - Remove item from stream
- PATCH /api/streams/[id]/items/[itemId] - Move item to different stream

**Stream Access (Sharing) Endpoints**:
- POST /api/streams/[id]/access - Invite user (grant access)
- GET /api/streams/[id]/access - List access grants for stream
- DELETE /api/streams/[id]/access/[accessId] - Revoke access
- PATCH /api/streams/[id]/access/[accessId] - Update permission level

**Active Stream Endpoints**:
- GET /api/streams/active - Get user's current active stream
- PUT /api/streams/active - Set active stream for session

**Archived Streams Endpoints**:
- GET /api/streams/archive - List user's archived streams

### Quickstart Guide (quickstart.md)

See `quickstart.md` for complete setup and testing instructions.

**Development Setup**:
1. Run database migration: `npm run db:migrate`
2. Verify tables created: Check Supabase dashboard
3. Start dev server: `npm run dev`
4. Run E2E tests: `npm run test:e2e`

**Testing Flow**:
1. Create test user account
2. Verify "General" stream auto-created
3. Test stream CRUD operations
4. Test item save/move operations
5. Test sharing with permissions
6. Test archive/restore flow

### Integration Points

**Tool Integration** (4 tools need save-to-stream functionality):

1. **Discover Tool** (`app/discover/`, `app/business/`):
   - Add "Save to Stream" button on business cards
   - Add "Save Search" button on search results
   - Add stream selector in header

2. **Diligence Tool** (`app/data-rooms/`, components/data-room/):
   - Add "Save Report" to stream from report viewer
   - Add "Save Contact" from stakeholder lists
   - Add "Save Insight" from analysis results

3. **Collaboration Tool** (components/collaboration/):
   - Add "Save to Stream" for shared documents
   - Add "Save Insight" from team discussions

4. **Outreach Tool** (lib/outreach/, components/outreach/):
   - Add "Save Contact List" to stream
   - Add "Save Query" for campaign searches

**UI Integration Points**:
- Add `<StreamSelector />` to main layout header (all pages)
- Add `<ActiveStreamIndicator />` to navigation bar
- Add save-to-stream actions to existing "Save" buttons
- Add stream filter to existing list views

### Agent File Update (CLAUDE.md)

Agent context file will be updated incrementally to reflect new stream system.

**Output**: Phase 1 artifacts created:
- ✓ data-model.md
- ✓ contracts/streams-api.yaml
- ✓ contracts/stream-items-api.yaml  
- ✓ contracts/stream-access-api.yaml
- ✓ quickstart.md
- ✓ CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 artifacts
- Group tasks by area: Database → API → Services → UI → Integration → Tests

**Task Categories**:

1. **Database Setup** (5 tasks):
   - Create Supabase migration file
   - Define tables (streams, stream_items, stream_access)
   - Create RLS policies
   - Add indexes for performance
   - Update database types

2. **API Layer** (15 tasks):
   - Stream management endpoints (6)
   - Stream items endpoints (4)
   - Stream access endpoints (4)
   - Active stream endpoint (1)

3. **Service Layer** (8 tasks):
   - stream-service.ts enhancements
   - stream-item-service.ts creation
   - stream-access-service.ts creation
   - stream-hooks.ts for React
   - stream-store.ts for Zustand
   - Validation schemas (Zod)
   - Error handling utilities
   - Permission check utilities

4. **UI Components** (12 tasks):
   - StreamSelector component
   - StreamManager component
   - StreamItemList component
   - StreamShareDialog component
   - StreamArchiveView component
   - ActiveStreamIndicator component
   - SaveToStreamButton component (reusable)
   - Integration with existing tools (4 tools)

5. **Testing** (8 tasks):
   - E2E test suite (Playwright)
   - Stream CRUD tests
   - Item operations tests
   - Sharing/permissions tests
   - Archive/restore tests
   - Cross-tool integration tests
   - Performance tests
   - RLS policy tests

6. **Initialization** (3 tasks):
   - User onboarding: auto-create "General" stream
   - Migration script for existing users
   - Data seeding for development

**Ordering Strategy**:
1. Database first (foundation)
2. API endpoints (TDD: write tests, then implement)
3. Service layer (business logic)
4. UI components (presentation)
5. Tool integrations (connect everything)
6. End-to-end tests (validate full flow)

**Parallelization**:
- [P] Database setup tasks (independent)
- [P] API endpoint implementations (after contracts)
- [P] UI component development (after hooks/services)
- [P] Tool integrations (independent files)

**Estimated Output**: ~50 numbered, ordered tasks in tasks.md

**Dependencies**:
- Tasks 1-5 must complete before API work
- API layer must complete before service layer
- Service layer must complete before UI
- UI must complete before integration
- All implementation before E2E tests

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following TDD, constitutional principles if any)  
**Phase 5**: Validation (run E2E tests, performance tests, user acceptance testing)

**Success Criteria** (from spec):
- ✓ All 22 functional requirements implemented
- ✓ All 4 non-functional requirements met
- ✓ All 10 acceptance scenarios pass E2E tests
- ✓ Performance goals achieved (<200ms API, <50ms UI)
- ✓ Integration with all 4 tools working
- ✓ "General" stream auto-created for new users
- ✓ Sharing with 3 permission levels functional
- ✓ Archive/restore working without data loss

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. Using existing oppSpot patterns:
- Supabase RLS for security (existing pattern)
- Next.js App Router for API (existing pattern)
- Zustand for state (existing pattern)
- shadcn/ui for components (existing pattern)
- Playwright for E2E tests (existing pattern)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✓
- [x] Phase 1: Design complete (/plan command) ✓
- [x] Phase 2: Task planning complete (/plan command - approach described) ✓
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✓
- [x] Post-Design Constitution Check: PASS ✓
- [x] All NEEDS CLARIFICATION resolved ✓
- [x] Complexity deviations documented: N/A ✓

**Artifacts Created**:
- [x] plan.md (this file)
- [x] research.md
- [x] data-model.md
- [x] quickstart.md
- [x] contracts/streams-api.yaml
- [x] contracts/stream-items-api.yaml
- [x] contracts/stream-access-api.yaml
- [ ] tasks.md (created by /tasks command)

---

## Next Command

Run `/tasks` to generate the implementation task list (Phase 3).

---

*Plan completed at 2025-10-27 | Based on specification v1.0 with 5 clarifications resolved*
*Ready for task generation phase*
