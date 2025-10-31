# Phase 0: Research & Technical Decisions

**Feature**: Stream-Based Work Organization
**Date**: 2025-10-27
**Status**: Complete

## Research Summary

All technical unknowns were resolved during the `/clarify` phase. This document consolidates the finalized design decisions.

## Key Technical Decisions

### 1. Stream Deletion Strategy

**Decision**: Soft-delete (archive) using `archived_at` timestamp column

**Rationale**:
- Prevents accidental data loss (NFR-004)
- Allows users to restore mistakenly archived streams (FR-004b)
- Maintains audit trail and data history
- Industry best practice for user-facing data management

**Alternatives Considered**:
- Hard delete: Rejected - too risky, no recovery possible
- Move to General: Rejected - loses organizational context
- Require user choice: Rejected - adds unnecessary friction

**Implementation**:
- Add `archived_at TIMESTAMP NULL` column to streams table
- Filter active streams with `WHERE archived_at IS NULL`
- Restore by setting `archived_at = NULL`

---

### 2. Stream Sharing & Permissions Model

**Decision**: Owner-controlled sharing with 3-level permission system (View, Edit, Manage)

**Rationale**:
- Granular control matches enterprise collaboration needs
- View-only prevents accidental modifications
- Edit allows contribution without admin overhead
- Manage enables delegation of stream administration
- Standard RBAC pattern familiar to users

**Alternatives Considered**:
- Private only: Rejected - no collaboration capability
- Team-wide: Rejected - lacks granular control
- Binary read/write: Rejected - insufficient for complex workflows

**Implementation**:
- `stream_access` junction table with `permission_level` ENUM
- RLS policies check permissions via JOIN with stream_access
- Owner has implicit Manage permission (no row needed)

**Permission Matrix**:
| Action | View | Edit | Manage |
|--------|------|------|--------|
| Read items | ✓ | ✓ | ✓ |
| Add items | ✗ | ✓ | ✓ |
| Move items | ✗ | ✓ | ✓ |
| Rename stream | ✗ | ✗ | ✓ |
| Invite users | ✗ | ✗ | ✓ |
| Archive stream | ✗ | ✗ | Owner only |

---

### 3. Item Display Order

**Decision**: Chronological by `added_at` DESC (newest first)

**Rationale**:
- Most recent work is most relevant (recency bias)
- Matches user mental model ("What did I just save?")
- Simple implementation with single-column index
- No complex sorting/ranking algorithms needed

**Alternatives Considered**:
- Grouped by type: Rejected - adds visual complexity
- User-configurable: Deferred - can add later as enhancement
- Relevance-based: Rejected - no clear relevance signal

**Implementation**:
- `added_at TIMESTAMP DEFAULT NOW()` on stream_items
- Index: `CREATE INDEX idx_stream_items_chronological ON stream_items(stream_id, added_at DESC)`
- Query: `ORDER BY added_at DESC LIMIT 50` with pagination

---

### 4. "General" Stream Protection

**Decision**: System-protected stream with `is_system = TRUE` flag, cannot be renamed or archived

**Rationale**:
- Ensures fallback destination always exists (FR-001, FR-013)
- Prevents user confusion from accidental deletion
- Clear system vs user-created distinction
- Matches familiar "Inbox" / "Unsorted" patterns (email, file systems)

**Alternatives Considered**:
- Allow rename with internal ID: Rejected - complicates UI logic
- Recreate if deleted: Rejected - data loss window
- User customizable: Rejected - loses canonical reference

**Implementation**:
- `is_system BOOLEAN DEFAULT FALSE` column
- General stream created with `is_system = TRUE` on user signup
- UI disables rename/archive buttons when `is_system = TRUE`
- RLS policies prevent modification attempts
- Cannot be shared (owner-only stream)

---

### 5. Work Product Types

**Decision**: Six enumerated types mapped to existing oppSpot entities

**Types Defined**:
1. **business** → businesses table (company_id)
2. **report** → research_reports table (report_id)
3. **contact** → contacts/profiles table (contact_id)
4. **list** → business_lists table (list_id)
5. **insight** → insights/findings table (insight_id)
6. **query** → saved_searches table (search_id)

**Rationale**:
- Covers all user workflows across 4 tools (FR-007)
- Maps to existing database entities (no new tables)
- Enum provides type safety and validation
- Enables type-specific icons/rendering (FR-016)

**Alternatives Considered**:
- Generic "item" type: Rejected - loses semantic meaning
- Unlimited types: Rejected - no validation or UI consistency
- Per-tool types: Rejected - artificial boundaries

**Implementation**:
```sql
CREATE TYPE work_product_type AS ENUM (
  'business', 'report', 'contact',
  'list', 'insight', 'query'
);

-- Polymorphic reference
item_type work_product_type NOT NULL,
item_id UUID NOT NULL
```

---

### 6. Active Stream Session Management

**Decision**: Store `active_stream_id` in `profiles` table, persist across sessions

**Rationale**:
- Session continuity (NFR-003) - users resume where they left off
- Single source of truth per user
- Efficient lookup (no complex session storage)
- Integrates with existing profiles table

**Alternatives Considered**:
- Browser localStorage: Rejected - lost on device switch
- Session cookie: Rejected - expires too quickly
- Separate user_preferences table: Rejected - unnecessary table

**Implementation**:
- `ALTER TABLE profiles ADD COLUMN active_stream_id UUID REFERENCES streams(id)`
- Default to General stream if NULL
- Update on stream selection
- Join on auth.uid() for fast lookup

---

### 7. Database Performance Strategy

**Indexes Required**:
```sql
-- Chronological item listing (most common query)
CREATE INDEX idx_stream_items_chronological
ON stream_items(stream_id, added_at DESC);

-- Permission checks
CREATE INDEX idx_stream_access_lookup
ON stream_access(user_id, stream_id);

-- User's active streams
CREATE INDEX idx_streams_user_active
ON streams(user_id, archived_at)
WHERE archived_at IS NULL;

-- General stream lookup
CREATE INDEX idx_streams_system
ON streams(user_id, is_system)
WHERE is_system = TRUE;
```

**RLS Policy Strategy**:
- Enable RLS on all three tables
- Use security definer functions for complex permission checks
- Cache permission checks in query (avoid N+1)
- Leverage Supabase's optimized RLS engine

---

### 8. API Design Pattern

**Decision**: RESTful API following Next.js App Router conventions

**Endpoint Structure**:
```
/api/streams
/api/streams/[id]
/api/streams/[id]/items
/api/streams/[id]/items/[itemId]
/api/streams/[id]/access
/api/streams/[id]/access/[accessId]
/api/streams/active
/api/streams/archive
```

**Rationale**:
- Matches existing oppSpot API patterns
- Clear resource hierarchy
- Standard HTTP methods (GET/POST/PUT/DELETE/PATCH)
- App Router dynamic segments for parameters

**Validation**: Zod schemas for request/response
**Auth**: Supabase session middleware (existing)
**Errors**: Standard HTTP status codes + JSON error objects

---

## Technology Stack Confirmation

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 App Router | Existing stack, SSR support |
| Language | TypeScript 5.x | Type safety, existing codebase |
| Database | Supabase PostgreSQL | Existing infrastructure, RLS built-in |
| Auth | Supabase Auth | Existing, integrated with DB |
| State | Zustand | Lightweight, existing pattern |
| UI | shadcn/ui + Tailwind | Existing component library |
| Validation | Zod | Existing validation library |
| Testing | Playwright | Existing E2E framework |

---

## Risk Mitigation

**Identified Risks**:

1. **Risk**: RLS policies too complex → slow queries
   - **Mitigation**: Index all JOIN columns, test with 10k+ rows

2. **Risk**: Polymorphic references (item_type/item_id) lack FK constraints
   - **Mitigation**: Application-level validation, periodic cleanup job

3. **Risk**: Race condition on active stream update (multi-tab)
   - **Mitigation**: Optimistic locking, last-write-wins acceptable

4. **Risk**: Migration breaks existing users
   - **Mitigation**: Backfill script, default to General stream

5. **Risk**: Shared stream performance with many access grants
   - **Mitigation**: Limit 50 collaborators per stream (business rule)

---

## Open Questions (None - All Resolved)

All questions resolved during `/clarify` phase:
- ✓ Stream deletion behavior
- ✓ Sharing/privacy model
- ✓ Display order
- ✓ "General" stream naming
- ✓ Work product types
- ✓ Performance targets
- ✓ Scale requirements

---

## Next Steps

Proceed to Phase 1: Design & Contracts
- ✓ Research complete
- → Create data-model.md
- → Create API contracts
- → Create quickstart.md

---

*Research completed: 2025-10-27*
*All design decisions finalized and documented*
