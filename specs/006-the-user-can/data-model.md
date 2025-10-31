# Data Model: Stream-Based Work Organization

**Feature**: 006-the-user-can
**Date**: 2025-10-27
**Status**: Design Complete

## Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────────┐         ┌────────────────┐
│   profiles   │◄───────┤     streams      ├────────►│  stream_access │
│  (existing)  │ 1     N│                  │N       N│                │
└──────────────┘         └──────────────────┘         └────────────────┘
       │                          │                            │
       │ 1                        │ 1                          │ N
       │                          │                            │
       │                          │ N                          │ 1
       │                   ┌──────────────┐            ┌──────────┐
       │                   │ stream_items │            │  users   │
       │                   │              │            │(existing)│
       │                   └──────────────┘            └──────────┘
       │                          │
       │ active_stream_id         │ polymorphic refs
       └──────────────────────────┤
                                  ▼
                    ┌──────────────────────────────┐
                    │  Work Product Entities       │
                    │  (businesses, reports,       │
                    │   contacts, lists,           │
                    │   insights, queries)         │
                    └──────────────────────────────┘
```

## Core Entities

### 1. streams

**Description**: User-created organizational containers for work products

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique stream identifier |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Stream owner |
| name | VARCHAR(255) | NOT NULL | User-defined stream name |
| is_system | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE for "General" stream |
| archived_at | TIMESTAMP | NULL | Soft-delete timestamp (NULL = active) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
```sql
CREATE INDEX idx_streams_user_active ON streams(user_id, archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_streams_system ON streams(user_id, is_system) WHERE is_system = TRUE;
```

**RLS Policies**:
- SELECT: user_id = auth.uid() OR EXISTS (access grant)
- INSERT: user_id = auth.uid()
- UPDATE: user_id = auth.uid() AND (NOT is_system OR only non-protected fields)
- DELETE: user_id = auth.uid() AND NOT is_system

**Business Rules**:
- "General" stream: is_system = TRUE, cannot be renamed/archived
- One General stream per user (enforced by unique index)
- Archive sets archived_at = NOW(), restore sets archived_at = NULL

---

### 2. stream_items

**Description**: Work products saved to streams with polymorphic references

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique item identifier |
| stream_id | UUID | NOT NULL, REFERENCES streams(id) ON DELETE CASCADE | Parent stream |
| item_type | work_product_type | NOT NULL | Enum: business/report/contact/list/insight/query |
| item_id | UUID | NOT NULL | ID of referenced work product |
| added_by | UUID | NOT NULL, REFERENCES auth.users(id) | User who added item |
| added_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Timestamp added to stream |

**Enum Type**:
```sql
CREATE TYPE work_product_type AS ENUM (
  'business',  -- references businesses.id
  'report',    -- references research_reports.id
  'contact',   -- references contacts.id or profiles.id
  'list',      -- references business_lists.id
  'insight',   -- references insights.id
  'query'      -- references saved_searches.id
);
```

**Indexes**:
```sql
CREATE INDEX idx_stream_items_chronological ON stream_items(stream_id, added_at DESC);
CREATE INDEX idx_stream_items_polymorphic ON stream_items(item_type, item_id);
```

**RLS Policies**:
- SELECT: Inherit from parent stream permissions
- INSERT: User has Edit or Manage permission on stream
- DELETE: User has Edit or Manage permission on stream
- UPDATE: User has Edit or Manage permission on stream (for moves)

**Business Rules**:
- Same item can exist in multiple streams (no uniqueness constraint)
- Chronological display: ORDER BY added_at DESC
- Cascade delete when stream deleted (ON DELETE CASCADE)

---

### 3. stream_access

**Description**: Permission grants for shared streams

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique access grant ID |
| stream_id | UUID | NOT NULL, REFERENCES streams(id) ON DELETE CASCADE | Shared stream |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User granted access |
| permission_level | permission_level_enum | NOT NULL | view/edit/manage |
| granted_by | UUID | NOT NULL, REFERENCES auth.users(id) | User who granted access |
| granted_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Grant timestamp |

**Enum Type**:
```sql
CREATE TYPE permission_level_enum AS ENUM ('view', 'edit', 'manage');
```

**Indexes**:
```sql
CREATE INDEX idx_stream_access_lookup ON stream_access(user_id, stream_id);
CREATE INDEX idx_stream_access_stream ON stream_access(stream_id);
CREATE UNIQUE INDEX idx_stream_access_unique ON stream_access(stream_id, user_id);
```

**RLS Policies**:
- SELECT: stream owner OR user_id = auth.uid()
- INSERT: User is stream owner (via streams.user_id check)
- UPDATE: User is stream owner
- DELETE: User is stream owner

**Business Rules**:
- Owner has implicit Manage permission (no row needed)
- One permission per user per stream (UNIQUE constraint)
- Cascade delete when stream/user deleted
- Cannot grant access to system streams (is_system = TRUE)

**Permission Capabilities**:
| Action | view | edit | manage |
|--------|------|------|--------|
| Read items | ✓ | ✓ | ✓ |
| Add items | ✗ | ✓ | ✓ |
| Move items | ✗ | ✓ | ✓ |
| Remove items | ✗ | ✓ | ✓ |
| Rename stream | ✗ | ✗ | ✓ |
| Invite users | ✗ | ✗ | ✓ |
| Change permissions | ✗ | ✗ | ✓ |
| Archive stream | ✗ | ✗ | Owner only |

---

### 4. profiles (existing table - modifications)

**Description**: User profiles - add active stream reference

**New Column**:
```sql
ALTER TABLE profiles
ADD COLUMN active_stream_id UUID REFERENCES streams(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_active_stream ON profiles(active_stream_id);
```

**Business Rules**:
- Defaults to user's General stream
- Updated when user selects different stream
- SET NULL if stream deleted (fallback to General)
- Persists across sessions (NFR-003)

---

## Database Migration Script

**File**: `supabase/migrations/[timestamp]_create_streams_tables.sql`

```sql
-- Create ENUM types
CREATE TYPE work_product_type AS ENUM ('business', 'report', 'contact', 'list', 'insight', 'query');
CREATE TYPE permission_level_enum AS ENUM ('view', 'edit', 'manage');

-- Create streams table
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create stream_items table
CREATE TABLE stream_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  item_type work_product_type NOT NULL,
  item_id UUID NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create stream_access table
CREATE TABLE stream_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level permission_level_enum NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_stream_user UNIQUE(stream_id, user_id)
);

-- Add active_stream_id to profiles
ALTER TABLE profiles ADD COLUMN active_stream_id UUID REFERENCES streams(id) ON DELETE SET NULL;

-- Create indexes (see individual entity sections above)
-- Create RLS policies (see contracts/rls-policies.sql)

-- Trigger to create General stream on user signup
CREATE OR REPLACE FUNCTION create_general_stream_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streams (user_id, name, is_system)
  VALUES (NEW.id, 'General', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_general_stream_for_user();
```

---

## Validation Rules (Zod Schemas)

**Stream Creation**:
```typescript
const createStreamSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});
```

**Add Item to Stream**:
```typescript
const addStreamItemSchema = z.object({
  item_type: z.enum(['business', 'report', 'contact', 'list', 'insight', 'query']),
  item_id: z.string().uuid(),
});
```

**Grant Access**:
```typescript
const grantAccessSchema = z.object({
  user_id: z.string().uuid(),
  permission_level: z.enum(['view', 'edit', 'manage']),
});
```

---

## Data Integrity Constraints

1. **Referential Integrity**: All FKs use CASCADE or SET NULL appropriately
2. **Uniqueness**: stream_access(stream_id, user_id) prevents duplicate grants
3. **System Protection**: RLS policies prevent modification of is_system streams
4. **Soft Delete**: archived_at allows recovery, not true deletion
5. **Audit Trail**: All entities track created_at, granted_at, added_at timestamps

---

*Data model complete - Ready for contract generation*
