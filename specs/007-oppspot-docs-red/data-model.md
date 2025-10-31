# Data Model: Red Flag Radar

**Feature**: Red Flag Radar (Explainable Risk Detection)
**Date**: 2025-10-29
**Database**: Supabase PostgreSQL

## Overview

The Red Flag Radar data model consists of 4 core entities that track risk detection runs, identified flags, supporting evidence, and action history. All tables use Row-Level Security (RLS) policies to enforce multi-tenant access control.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  red_flag_runs  │
│  (executions)   │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐       ┌──────────────────┐
│   red_flags     │◄──────┤  red_flag_evidence│
│  (risks found)  │  1:N  │  (proof/sources)  │
└────────┬────────┘       └──────────────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│ red_flag_actions│
│ (audit trail)   │
└─────────────────┘

External References:
- red_flags.entity_id → companies.id OR data_rooms.id
- red_flag_evidence.source_id → documents.id, alerts.id, signals.id, etc.
- red_flag_actions.actor_id → profiles.id
```

---

## Entity Definitions

### 1. red_flag_runs

Tracks each execution of the detection system. Provides audit trail and statistics for detection runs.

**Purpose**: Know when detectors ran, which succeeded/failed, and overall execution stats.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique run identifier |
| entity_type | text | NOT NULL, CHECK IN ('company', 'data_room') | Type of entity analyzed |
| entity_id | uuid | NOT NULL | ID of company or data room |
| started_at | timestamptz | DEFAULT now() | Run start timestamp |
| finished_at | timestamptz | | Run completion timestamp (NULL if running) |
| detector_version | text | | Semantic version of detector logic (e.g., "1.2.0") |
| stats | jsonb | | Run statistics: { detectors_ran: 5, detectors_succeeded: 4, detectors_failed: 1, flags_detected: 12, flags_new: 3, flags_updated: 9 } |
| status | text | CHECK IN ('running', 'success', 'partial', 'error') | Run outcome |

**Indexes**:
```sql
CREATE INDEX idx_red_flag_runs_entity ON red_flag_runs(entity_type, entity_id, started_at DESC);
CREATE INDEX idx_red_flag_runs_status ON red_flag_runs(status, started_at DESC);
```

**RLS Policy**:
- Users can view runs for entities they have access to (via org/data room membership)

**Validation Rules**:
- `finished_at` must be >= `started_at` if not NULL
- `status` = 'running' implies `finished_at` IS NULL
- `status` IN ('success', 'partial', 'error') implies `finished_at` IS NOT NULL

**State Transitions**:
```
NULL → running → { success | partial | error }
```

---

### 2. red_flags

Core entity representing a detected risk. Contains category, severity, confidence, and lifecycle state.

**Purpose**: Store identified risks with all metadata needed for display, filtering, and remediation tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique flag identifier |
| entity_type | text | NOT NULL, CHECK IN ('company', 'data_room') | Type of entity |
| entity_id | uuid | NOT NULL | ID of company or data room |
| category | text | NOT NULL, CHECK IN ('financial', 'legal', 'operational', 'cyber', 'esg') | Risk category |
| title | text | NOT NULL | Brief flag title (max 255 chars) |
| description | text | | Detailed description (markdown supported) |
| severity | text | NOT NULL, CHECK IN ('critical', 'high', 'medium', 'low') | Risk severity level |
| confidence | numeric | CHECK (confidence >= 0 AND confidence <= 1) | Detection confidence (0-1) |
| status | text | NOT NULL, DEFAULT 'open', CHECK IN ('open', 'reviewing', 'mitigating', 'resolved', 'false_positive') | Lifecycle status |
| first_detected_at | timestamptz | DEFAULT now() | Timestamp of first detection |
| last_updated_at | timestamptz | DEFAULT now() | Timestamp of last change |
| run_id | uuid | REFERENCES red_flag_runs(id) ON DELETE SET NULL | Detection run that created/updated this flag |
| fingerprint | text | NOT NULL | Deduplication hash (SHA-256 substring) |
| meta | jsonb | | Extended metadata: { explainer: { why, key_evidence, suggested_remediation, timeframe, cached_at, model, inputs_hash }, overrides: { severity, confidence, actor_id, reason }, detector_metadata: {...} } |
| owner_id | uuid | REFERENCES profiles(id) ON DELETE SET NULL | Assigned owner (optional) |
| snoozed_until | timestamptz | | Snooze expiration (NULL if not snoozed) |

**Indexes**:
```sql
CREATE INDEX idx_red_flags_entity ON red_flags(entity_type, entity_id, category, severity, status);
CREATE INDEX idx_red_flags_fingerprint ON red_flags(fingerprint);
CREATE INDEX idx_red_flags_status_updated ON red_flags(status, last_updated_at DESC);
CREATE INDEX idx_red_flags_severity ON red_flags(severity) WHERE status != 'resolved' AND status != 'false_positive';
```

**RLS Policy**:
- Users can view flags for entities they have access to
- Editors can update status, owner_id, snoozed_until
- Viewers are read-only

**Validation Rules**:
- `last_updated_at` >= `first_detected_at`
- `title` length <= 255 characters
- `confidence` required if detection method is LLM-based (stored in meta.detector_metadata)
- If `snoozed_until` IS NOT NULL, must be > NOW()

**State Transitions**:
```
NULL → open → { reviewing → mitigating → resolved | false_positive }
         ↓
    false_positive (terminal)
```

**Deduplication Logic**:
- On new detection, compute `fingerprint`
- Query existing flags with same fingerprint for entity
- If match:
  - Update severity if changed (trigger alert if increased)
  - Merge evidence
  - Update `last_updated_at` and `run_id`
- If no match:
  - Insert new flag

---

### 3. red_flag_evidence

Links flags to supporting evidence from heterogeneous sources (documents, alerts, KPIs, news).

**Purpose**: Provide traceability and enable "click to source" navigation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique evidence identifier |
| flag_id | uuid | NOT NULL, REFERENCES red_flags(id) ON DELETE CASCADE | Parent flag |
| evidence_type | text | NOT NULL, CHECK IN ('document', 'alert', 'signal', 'kpi', 'news') | Source type |
| source_id | uuid | | ID in source system (document_id, alert_id, etc.) |
| title | text | | Evidence title/headline |
| preview | text | | First 200 chars of evidence (PII-scrubbed) |
| citation | jsonb | | Type-specific citation data: { documentId, pageNumber, chunkIndex } OR { alertId, severity } OR { kpiId, value, threshold } |
| importance | numeric | CHECK (importance >= 0 AND importance <= 1) | Relevance to flag (0-1) |
| score | numeric | | Type-specific score (e.g., similarity score for documents) |
| url | text | | Deep link to evidence in UI |
| page_number | integer | | Page number (for document evidence) |
| chunk_index | integer | | Chunk index (for document evidence) |
| created_at | timestamptz | DEFAULT now() | Evidence link creation timestamp |

**Indexes**:
```sql
CREATE INDEX idx_red_flag_evidence_flag ON red_flag_evidence(flag_id, evidence_type, importance DESC);
CREATE INDEX idx_red_flag_evidence_source ON red_flag_evidence(evidence_type, source_id);
```

**RLS Policy**:
- Inherits access from parent `red_flags` table (via flag_id)

**Validation Rules**:
- `preview` length <= 200 characters
- `importance` required for ranked evidence display
- `citation` JSONB schema validated per evidence_type
- If `evidence_type` = 'document', `page_number` and `chunk_index` should be populated

**Evidence Resolution**:
- Each evidence type has a dedicated resolver (see research.md Section 4)
- Resolvers handle broken links (deleted sources) gracefully
- Cache resolved evidence metadata (1-hour TTL)

---

### 4. red_flag_actions

Immutable audit log of all interactions with flags. Provides compliance trail.

**Purpose**: Track who did what and when for audit/compliance purposes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique action identifier |
| flag_id | uuid | NOT NULL, REFERENCES red_flags(id) ON DELETE CASCADE | Flag acted upon |
| action_type | text | NOT NULL, CHECK IN ('assign', 'note', 'status_change', 'snooze', 'remediation', 'override') | Action category |
| actor_id | uuid | REFERENCES profiles(id) ON DELETE SET NULL | User who performed action |
| payload | jsonb | NOT NULL | Action details: { from, to, reason, duration, ... } varies by action_type |
| created_at | timestamptz | DEFAULT now() | Action timestamp |

**Indexes**:
```sql
CREATE INDEX idx_red_flag_actions_flag ON red_flag_actions(flag_id, created_at DESC);
CREATE INDEX idx_red_flag_actions_actor ON red_flag_actions(actor_id, created_at DESC);
```

**RLS Policy**:
- Users can view actions for flags they have access to
- All users can INSERT (actions are logged automatically)
- NO UPDATE or DELETE (immutable audit log)

**Validation Rules**:
- `payload` JSONB schema validated per action_type
- `actor_id` must match authenticated user (enforced in API layer)

**Action Type Payloads**:

```typescript
// assign
{ assignee_id: uuid, previous_owner_id: uuid | null }

// note
{ text: string, is_internal: boolean }

// status_change
{ from: Status, to: Status, reason?: string }

// snooze
{ duration_days: number, until: timestamp, reason: string }

// remediation
{ plan: string, eta: timestamp, stakeholders: uuid[] }

// override
{ field: 'severity' | 'confidence', from: any, to: any, reason: string }
```

---

## Database Migrations

### Migration 1: Schema Creation

**File**: `supabase/migrations/20251029000001_red_flags_schema.sql`

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create red_flag_runs table
CREATE TABLE public.red_flag_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'data_room')),
  entity_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  detector_version text,
  stats jsonb,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error')),

  CONSTRAINT finished_after_started CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- Create red_flags table
CREATE TABLE public.red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'data_room')),
  entity_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('financial', 'legal', 'operational', 'cyber', 'esg')),
  title text NOT NULL CHECK (length(title) <= 255),
  description text,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'mitigating', 'resolved', 'false_positive')),
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid REFERENCES public.red_flag_runs(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  owner_id uuid,
  snoozed_until timestamptz,

  CONSTRAINT updated_after_detected CHECK (last_updated_at >= first_detected_at),
  CONSTRAINT unique_fingerprint_per_entity UNIQUE (entity_type, entity_id, fingerprint)
);

-- Create red_flag_evidence table
CREATE TABLE public.red_flag_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.red_flags(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('document', 'alert', 'signal', 'kpi', 'news')),
  source_id uuid,
  title text,
  preview text CHECK (length(preview) <= 200),
  citation jsonb,
  importance numeric CHECK (importance >= 0 AND importance <= 1),
  score numeric,
  url text,
  page_number integer,
  chunk_index integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create red_flag_actions table (immutable audit log)
CREATE TABLE public.red_flag_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.red_flags(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('assign', 'note', 'status_change', 'snooze', 'remediation', 'override')),
  actor_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent updates/deletes on red_flag_actions (immutable)
CREATE RULE prevent_red_flag_actions_update AS ON UPDATE TO public.red_flag_actions DO INSTEAD NOTHING;
CREATE RULE prevent_red_flag_actions_delete AS ON DELETE TO public.red_flag_actions DO INSTEAD NOTHING;
```

### Migration 2: Indexes

**File**: `supabase/migrations/20251029000002_red_flags_indexes.sql`

```sql
-- red_flag_runs indexes
CREATE INDEX idx_red_flag_runs_entity ON public.red_flag_runs(entity_type, entity_id, started_at DESC);
CREATE INDEX idx_red_flag_runs_status ON public.red_flag_runs(status, started_at DESC);

-- red_flags indexes
CREATE INDEX idx_red_flags_entity ON public.red_flags(entity_type, entity_id, category, severity, status);
CREATE INDEX idx_red_flags_fingerprint ON public.red_flags(fingerprint);
CREATE INDEX idx_red_flags_status_updated ON public.red_flags(status, last_updated_at DESC);
CREATE INDEX idx_red_flags_severity ON public.red_flags(severity) WHERE status != 'resolved' AND status != 'false_positive';
CREATE INDEX idx_red_flags_owner ON public.red_flags(owner_id) WHERE owner_id IS NOT NULL;

-- red_flag_evidence indexes
CREATE INDEX idx_red_flag_evidence_flag ON public.red_flag_evidence(flag_id, evidence_type, importance DESC NULLS LAST);
CREATE INDEX idx_red_flag_evidence_source ON public.red_flag_evidence(evidence_type, source_id);

-- red_flag_actions indexes
CREATE INDEX idx_red_flag_actions_flag ON public.red_flag_actions(flag_id, created_at DESC);
CREATE INDEX idx_red_flag_actions_actor ON public.red_flag_actions(actor_id, created_at DESC);
```

### Migration 3: Row-Level Security (RLS)

**File**: `supabase/migrations/20251029000003_red_flags_rls.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE public.red_flag_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_actions ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has access to entity
CREATE OR REPLACE FUNCTION public.user_has_entity_access(
  p_entity_type text,
  p_entity_id uuid,
  p_user_id uuid
) RETURNS boolean AS $$
BEGIN
  IF p_entity_type = 'company' THEN
    -- Check org membership via companies table
    RETURN EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.organizations_members om ON om.organization_id = c.organization_id
      WHERE c.id = p_entity_id AND om.user_id = p_user_id
    );
  ELSIF p_entity_type = 'data_room' THEN
    -- Check data room access
    RETURN EXISTS (
      SELECT 1 FROM public.data_room_access dra
      WHERE dra.data_room_id = p_entity_id AND dra.user_id = p_user_id
    );
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for red_flag_runs
CREATE POLICY "Users can view runs for accessible entities"
  ON public.red_flag_runs FOR SELECT
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()));

CREATE POLICY "Editors can create runs for accessible entities"
  ON public.red_flag_runs FOR INSERT
  WITH CHECK (
    public.user_has_entity_access(entity_type, entity_id, auth.uid())
    AND public.user_has_role(auth.uid(), 'editor')
  );

-- RLS Policies for red_flags
CREATE POLICY "Users can view flags for accessible entities"
  ON public.red_flags FOR SELECT
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()));

CREATE POLICY "Editors can update flags for accessible entities"
  ON public.red_flags FOR UPDATE
  USING (public.user_has_entity_access(entity_type, entity_id, auth.uid()))
  WITH CHECK (
    public.user_has_entity_access(entity_type, entity_id, auth.uid())
    AND public.user_has_role(auth.uid(), 'editor')
  );

-- RLS Policies for red_flag_evidence (inherit from parent flag)
CREATE POLICY "Users can view evidence for accessible flags"
  ON public.red_flag_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_evidence.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
  );

-- RLS Policies for red_flag_actions (inherit from parent flag)
CREATE POLICY "Users can view actions for accessible flags"
  ON public.red_flag_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_actions.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
  );

CREATE POLICY "Users can create actions for accessible flags"
  ON public.red_flag_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.red_flags rf
      WHERE rf.id = red_flag_actions.flag_id
      AND public.user_has_entity_access(rf.entity_type, rf.entity_id, auth.uid())
    )
    AND actor_id = auth.uid()
  );
```

---

## TypeScript Type Definitions

**File**: `lib/red-flags/types.ts`

```typescript
// Database enums
export type EntityType = 'company' | 'data_room';
export type FlagCategory = 'financial' | 'legal' | 'operational' | 'cyber' | 'esg';
export type FlagSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FlagStatus = 'open' | 'reviewing' | 'mitigating' | 'resolved' | 'false_positive';
export type EvidenceType = 'document' | 'alert' | 'signal' | 'kpi' | 'news';
export type ActionType = 'assign' | 'note' | 'status_change' | 'snooze' | 'remediation' | 'override';
export type RunStatus = 'running' | 'success' | 'partial' | 'error';

// Database table types
export interface RedFlagRun {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  started_at: string;
  finished_at: string | null;
  detector_version: string | null;
  stats: RunStats | null;
  status: RunStatus;
}

export interface RunStats {
  detectors_ran: number;
  detectors_succeeded: number;
  detectors_failed: number;
  flags_detected: number;
  flags_new: number;
  flags_updated: number;
}

export interface RedFlag {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  category: FlagCategory;
  title: string;
  description: string | null;
  severity: FlagSeverity;
  confidence: number | null;
  status: FlagStatus;
  first_detected_at: string;
  last_updated_at: string;
  run_id: string | null;
  fingerprint: string;
  meta: FlagMetadata;
  owner_id: string | null;
  snoozed_until: string | null;
}

export interface FlagMetadata {
  explainer?: {
    why: string;
    key_evidence: string[];
    suggested_remediation: string;
    timeframe: string;
    cached_at: string;
    model: string;
    inputs_hash: string;
  };
  overrides?: {
    severity?: { from: FlagSeverity; to: FlagSeverity; actor_id: string; reason: string };
    confidence?: { from: number; to: number; actor_id: string; reason: string };
  };
  detector_metadata?: Record<string, any>;
}

export interface RedFlagEvidence {
  id: string;
  flag_id: string;
  evidence_type: EvidenceType;
  source_id: string | null;
  title: string | null;
  preview: string | null;
  citation: CitationData | null;
  importance: number | null;
  score: number | null;
  url: string | null;
  page_number: number | null;
  chunk_index: number | null;
  created_at: string;
}

export type CitationData =
  | { documentId: string; pageNumber: number; chunkIndex: number }
  | { alertId: string; severity: string }
  | { kpiId: string; value: number; threshold: number }
  | { newsId: string; source: string; published_at: string };

export interface RedFlagAction {
  id: string;
  flag_id: string;
  action_type: ActionType;
  actor_id: string | null;
  payload: ActionPayload;
  created_at: string;
}

export type ActionPayload =
  | { type: 'assign'; assignee_id: string; previous_owner_id: string | null }
  | { type: 'note'; text: string; is_internal: boolean }
  | { type: 'status_change'; from: FlagStatus; to: FlagStatus; reason?: string }
  | { type: 'snooze'; duration_days: number; until: string; reason: string }
  | { type: 'remediation'; plan: string; eta: string; stakeholders: string[] }
  | { type: 'override'; field: 'severity' | 'confidence'; from: any; to: any; reason: string };
```

---

## Validation & Constraints Summary

| Entity | Key Constraints |
|--------|----------------|
| **red_flag_runs** | finished_at >= started_at; status consistency with finished_at |
| **red_flags** | unique (entity_type, entity_id, fingerprint); title <= 255 chars; confidence 0-1; last_updated >= first_detected |
| **red_flag_evidence** | preview <= 200 chars; importance 0-1; cascade delete with flag |
| **red_flag_actions** | immutable (no updates/deletes); actor_id = auth.uid(); valid payload per type |

---

## Performance Considerations

1. **Indexes**: Multi-column indexes support common query patterns (entity + category + severity)
2. **Partial Indexes**: Severity index excludes resolved/false_positive flags
3. **JSONB**: meta column uses JSONB for flexible storage; consider GIN index if frequent JSONB queries
4. **Cascade Deletes**: Evidence and actions cascade delete when flag deleted (maintains referential integrity)
5. **RLS Functions**: user_has_entity_access is SECURITY DEFINER and should be cached by Postgres

---

## Future Enhancements (Phase 2)

1. **Full-text search**: Add GIN index on title + description for search
2. **Materialized view**: Pre-aggregate flag counts by category/severity for dashboard
3. **Partitioning**: Partition red_flag_actions by created_at if audit log grows large (>10M rows)
4. **JSONB GIN index**: If meta.explainer queries become common
5. **Time-series optimization**: Consider TimescaleDB for red_flag_runs time-series queries

---

This data model supports all functional requirements from spec.md and aligns with the research decisions documented in research.md.
