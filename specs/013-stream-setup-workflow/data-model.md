# Data Model: Stream Setup Workflow

**Feature**: Stream Setup Workflow with Goal-Oriented Configuration
**Date**: 2025-10-31
**Status**: Finalized

## Overview

This document defines the complete data model for the Stream Setup Workflow feature, including new tables, enhanced existing tables, and entity relationships.

---

## Entity Relationship Diagram

```
organizations (existing)
    ↓ 1:N
business_profiles (NEW)
    ↓ 1:N
streams (ENHANCED)
    ↓ 1:N
stream_items (existing)
    ↓ references
[companies, research_reports, search_queries, notes, tasks, documents, links, insights, data_rooms, hypotheses]

goal_templates (EXISTING, needs types)
    ↓ 1:N
streams (ENHANCED)

profiles (existing users)
    ↓ user_metadata.active_stream_id
streams (ENHANCED)
```

---

## New Tables

### 1. business_profiles

**Purpose**: Store org-level business profiles for personalization (FR-011 org-scoped)

```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,  -- User-friendly name (e.g., "TechCorp Acquisition Profile")
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,

  -- AI-Extracted Data (FR-007: 11 fields)
  industry TEXT,
  description TEXT,  -- Max 500 chars
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  location TEXT,  -- City, Country format
  revenue_range TEXT,  -- "$0-1M", "$1-10M", "$10-50M", "$50-100M", "$100M+"
  tech_stack TEXT[] DEFAULT '{}',  -- Max 10 technologies
  products_services TEXT[] DEFAULT '{}',  -- Max 5 offerings
  target_markets TEXT[] DEFAULT '{}',  -- Max 5 markets/industries
  key_differentiators TEXT[] DEFAULT '{}',  -- Max 3 unique selling points
  employee_count INTEGER,

  -- Manual Overrides (FR-010: user can edit after AI generation)
  manual_edits JSONB DEFAULT '{}',  -- Tracks which fields user manually changed

  -- Analysis Metadata
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_metadata JSONB DEFAULT '{}',  -- AI response metadata, error messages if failed
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(org_id, website_url),  -- Prevent duplicate profiles for same website
  UNIQUE(org_id, name)  -- Profile names must be unique within org
);

-- Indexes
CREATE INDEX idx_business_profiles_org_id ON business_profiles(org_id);
CREATE INDEX idx_business_profiles_status ON business_profiles(analysis_status) WHERE analysis_status != 'completed';
CREATE INDEX idx_business_profiles_created_by ON business_profiles(created_by);

-- RLS Policies
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their org"
  ON business_profiles FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create profiles for their org"
  ON business_profiles FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update profiles in their org"
  ON business_profiles FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete profiles they created"
  ON business_profiles FOR DELETE
  USING (created_by = auth.uid() OR org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'org_admin'
  ));

-- Comments
COMMENT ON TABLE business_profiles IS 'Org-scoped business profiles for search personalization (FR-011)';
COMMENT ON COLUMN business_profiles.tech_stack IS 'Technologies used by user''s company (extracted from website)';
COMMENT ON COLUMN business_profiles.target_markets IS 'Industries/markets the user''s company serves';
COMMENT ON COLUMN business_profiles.manual_edits IS 'JSONB tracking user modifications: {field_name: {original: value, edited: value, edited_at: timestamp}}';
```

---

### 2. goal_templates (Enhance Existing)

**Purpose**: Predefined goal types for stream creation (FR-002: 7 goal types)

```sql
-- Table may already exist from prior work, but needs proper schema
CREATE TABLE IF NOT EXISTS goal_templates (
  id TEXT PRIMARY KEY,  -- Slug format: 'due_diligence', 'discover_companies'
  name TEXT NOT NULL,  -- Display name: 'Conduct Due Diligence'
  description TEXT,
  category TEXT CHECK (category IN ('acquisition', 'expansion', 'research')),
  icon TEXT,  -- Emoji or icon identifier

  -- Defaults (merged with user input during stream creation)
  default_criteria JSONB DEFAULT '{}',
  default_metrics JSONB DEFAULT '{}',
  default_success_criteria JSONB DEFAULT '{}',

  -- Suggested Workflow
  suggested_stages JSONB DEFAULT '[]',  -- Custom workflow stages for this goal type
  suggested_agents JSONB DEFAULT '[]',  -- AI agents to auto-assign

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,  -- Incremented when used (analytics)
  display_order INTEGER DEFAULT 0,  -- UI ordering

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Data (FR-002 clarification: 7 goal types)
INSERT INTO goal_templates (id, name, description, category, icon, display_order) VALUES
  ('due_diligence', 'Conduct Due Diligence', 'Deep analysis of specific acquisition target', 'acquisition', '🔍', 1),
  ('discover_companies', 'Discover Companies', 'Find and qualify potential acquisition targets', 'expansion', '🎯', 2),
  ('market_research', 'Market Research', 'Analyze market trends and competitive landscape', 'research', '📊', 3),
  ('competitive_analysis', 'Competitive Analysis', 'Compare competitors and identify differentiation', 'research', '⚔️', 4),
  ('territory_expansion', 'Territory Expansion', 'Explore new geographic or vertical markets', 'expansion', '🌍', 5),
  ('investment_pipeline', 'Investment Pipeline', 'Build and manage deal flow pipeline', 'acquisition', '💼', 6),
  ('partnership_opportunities', 'Partnership Opportunities', 'Identify strategic partnership candidates', 'expansion', '🤝', 7)
ON CONFLICT (id) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category) WHERE is_active = true;

-- Comments
COMMENT ON TABLE goal_templates IS 'Predefined goal types for stream creation (FR-002: 7 types)';
COMMENT ON COLUMN goal_templates.use_count IS 'Analytics: tracks popularity of goal types';
```

---

## Enhanced Existing Tables

### 1. streams (Add business_profile_id)

**Changes**: Link streams to business profiles for personalization

```sql
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS business_profile_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_streams_business_profile_id ON streams(business_profile_id);

-- Update existing goal-related columns (already exist from migration 20251003000001)
-- goal_template_id TEXT
-- goal_criteria JSONB DEFAULT '{}'
-- target_metrics JSONB DEFAULT '{}'
-- success_criteria JSONB DEFAULT '{}'
-- current_progress JSONB DEFAULT '{"completed": 0, "total": 0, "percentage": 0}'
-- goal_deadline TIMESTAMPTZ
-- goal_status TEXT DEFAULT 'not_started'

COMMENT ON COLUMN streams.business_profile_id IS 'Links stream to business profile for personalization (FR-018)';
```

---

### 2. profiles (user_metadata for stream context)

**Changes**: Store active stream ID in user metadata (FR-013)

```sql
-- No schema change needed - uses Supabase auth.users.raw_user_meta_data
-- Updated via supabase.auth.updateUser({ data: { active_stream_id: 'uuid' } })

-- Virtual column for queries (materialized in application layer)
-- profiles.active_stream_id -> fetched from auth.users.raw_user_meta_data->>'active_stream_id'
```

**Application Layer**:
```typescript
// lib/hooks/use-stream-context.ts
export function useStreamContext() {
  const { data: { user } } = await supabase.auth.getUser()
  const activeStreamId = user?.user_metadata?.active_stream_id
  return { activeStreamId, setActiveStream, clearActiveStream }
}
```

---

### 3. stream_items (Asset Association)

**No Changes Needed**: Existing table already supports all asset types (FR-014, FR-017)

**Existing Schema** (from migration 20250130000001):
```sql
CREATE TABLE stream_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL CHECK (item_type IN (
    'company',           -- ✅ FR-014
    'search_query',      -- ✅ FR-014
    'list',
    'note',              -- ✅ FR-014
    'ai_research',       -- ✅ FR-014 (Research Reports)
    'opportunity',
    'stakeholder',
    'task',              -- ✅ FR-014
    'file',              -- ✅ FR-014 (Documents)
    'link'               -- ✅ FR-014 (Links)
  )),

  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  list_id UUID REFERENCES business_lists(id) ON DELETE CASCADE,
  research_id UUID,

  title TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}',  -- Stores references to insights, data_rooms, hypotheses
  -- ... other fields
);
```

**Extended item_type Support** (via content JSONB):
- `insights` → item_type: 'note', content: { insight_id: 'uuid' }
- `data_rooms` → item_type: 'file', content: { data_room_id: 'uuid' }
- `hypotheses` → item_type: 'note', content: { hypothesis_id: 'uuid' }

---

## TypeScript Interfaces

### BusinessProfile

```typescript
export interface BusinessProfile {
  id: string
  org_id: string
  name: string
  company_name: string
  website_url: string

  // AI-Extracted (FR-007)
  industry: string | null
  description: string | null
  company_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
  location: string | null
  revenue_range: '$0-1M' | '$1-10M' | '$10-50M' | '$50-100M' | '$100M+' | null
  tech_stack: string[]
  products_services: string[]
  target_markets: string[]
  key_differentiators: string[]
  employee_count: number | null

  // Manual Overrides
  manual_edits: Record<string, { original: unknown; edited: unknown; edited_at: string }>

  // Analysis Metadata
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed'
  analysis_metadata: {
    model?: string
    tokens_used?: number
    analysis_time_ms?: number
    error_message?: string
  }
  analysis_started_at: string | null
  analysis_completed_at: string | null

  // Ownership
  created_by: string
  updated_by: string | null

  // Timestamps
  created_at: string
  updated_at: string
}
```

### GoalTemplate

```typescript
export interface GoalTemplate {
  id: string
  name: string
  description: string | null
  category: 'acquisition' | 'expansion' | 'research'
  icon: string | null

  // Defaults
  default_criteria: Record<string, unknown>
  default_metrics: Record<string, unknown>
  default_success_criteria: Record<string, unknown>

  // Suggested Workflow
  suggested_stages: Array<{ id: string; name: string; color: string }>
  suggested_agents: Array<{
    agent_type: string
    role: string
    order: number
    config: Record<string, unknown>
  }>

  // Metadata
  is_active: boolean
  use_count: number
  display_order: number

  created_at: string
  updated_at: string
}
```

### Stream (Enhanced)

```typescript
export interface Stream {
  id: string
  org_id: string
  name: string
  description: string | null
  emoji: string
  color: string
  stream_type: 'project' | 'deal' | 'campaign' | 'research' | 'territory'

  // Goal-Oriented Fields (existing)
  goal_template_id: string | null
  goal_criteria: Record<string, unknown>
  target_metrics: Record<string, unknown>
  success_criteria: Record<string, unknown>
  current_progress: {
    completed: number
    total: number
    percentage: number
  }
  goal_deadline: string | null
  goal_status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed' | 'failed' | 'paused'

  // NEW: Profile Link
  business_profile_id: string | null

  // ... other existing fields
  status: 'active' | 'archived' | 'completed'
  created_by: string
  created_at: string
  updated_at: string
}
```

### WizardState

```typescript
export interface WizardState {
  currentStep: 1 | 2 | 3
  goalType: string | null  // goal_template_id
  businessImpact: {
    description: string
    custom_criteria?: Record<string, unknown>
  }
  selectedProfileId: string | null
  newProfileData: {
    name: string
    company_name: string
    website_url: string
    // ... other fields populated by AI
  } | null
  isAnalyzing: boolean
  analysisProgress: {
    stage: 'idle' | 'fetching' | 'analyzing' | 'complete' | 'failed'
    message: string
  }
}
```

---

## Validation Rules

### Business Profile Creation
- ✅ website_url must be valid HTTP/HTTPS URL
- ✅ website_url must be unique per org (UNIQUE constraint)
- ✅ name must be unique per org (UNIQUE constraint)
- ✅ company_size enum validation
- ✅ revenue_range enum validation
- ✅ Arrays (tech_stack, products_services, etc.) max lengths enforced in application layer

### Stream Creation with Profile
- ✅ business_profile_id must belong to user's org
- ✅ goal_template_id must exist in goal_templates
- ✅ goal_deadline must be future date (if provided)
- ✅ At least one of (goal_criteria, business_impact description) must be provided

---

## State Transitions

### Profile Analysis Status
```
pending → analyzing → completed
                   ↘ failed
```

**Transitions**:
1. `pending`: Profile created, website_url provided, analysis not started
2. `analyzing`: POST /api/profiles/analyze triggered, AI processing
3. `completed`: AI successfully extracted data, profile ready for use
4. `failed`: Website unreachable, AI timeout, or parsing error

**Recovery**: Failed profiles can be manually edited (FR-009 graceful error handling)

### Stream Goal Status
```
not_started → in_progress → on_track → completed
                         ↘ at_risk ↗
                         ↘ paused
                         ↘ failed
```

**Transitions** (existing from streams migration):
- Automated by AI agents based on progress metrics
- Manual override by user via dashboard

---

## Data Retention & Privacy

### GDPR Compliance
- ✅ business_profiles.website_url: Public information (company websites)
- ✅ business_profiles.description: AI-extracted public information
- ✅ User-initiated deletion: Cascade DELETE from business_profiles removes all stream associations
- ✅ Org deletion: CASCADE to business_profiles, streams, stream_items

### Archival
- Streams can be archived (status: 'archived'), preserving profiles
- Archived streams excluded from active dashboards but accessible via "View Archived"

---

## Performance Considerations

### Indexes
```sql
-- High-frequency queries
CREATE INDEX idx_business_profiles_org_id ON business_profiles(org_id);
CREATE INDEX idx_streams_business_profile_id ON streams(business_profile_id);
CREATE INDEX idx_goal_templates_category ON goal_templates(category) WHERE is_active = true;

-- Dashboard queries (stream items by stream)
-- Already exists: CREATE INDEX idx_stream_items_stream_id ON stream_items(stream_id);
```

### Query Optimization
```sql
-- Dashboard: Get stream with profile and assets
SELECT
  s.*,
  bp.name AS profile_name,
  bp.company_name AS profile_company,
  COUNT(DISTINCT si.id) AS total_assets,
  COUNT(DISTINCT si.id) FILTER (WHERE si.item_type = 'company') AS companies_count,
  COUNT(DISTINCT si.id) FILTER (WHERE si.item_type = 'ai_research') AS research_reports_count
  -- ... other asset type counts
FROM streams s
LEFT JOIN business_profiles bp ON s.business_profile_id = bp.id
LEFT JOIN stream_items si ON s.id = si.stream_id
WHERE s.id = $1
GROUP BY s.id, bp.name, bp.company_name;
```

---

## Migration Plan

**File**: `supabase/migrations/20251031000003_stream_workflow.sql`

**Order of Operations**:
1. Create business_profiles table with RLS
2. Create/update goal_templates table, seed 7 goal types
3. ALTER streams ADD COLUMN business_profile_id
4. Add indexes
5. Update existing stream_items RLS (if needed for new asset types)

**Rollback Strategy**:
- business_profile_id is nullable (backwards compatible)
- goal_templates inserts use ON CONFLICT DO NOTHING (idempotent)
- Existing streams unaffected by new columns

---

## Summary

**New Tables**: 1 (business_profiles)
**Enhanced Tables**: 2 (streams, goal_templates)
**New Indexes**: 3
**New RLS Policies**: 4 (business_profiles CRUD)
**Seed Data**: 7 goal_templates

**Ready for**: API contract generation (Phase 1, next step)
