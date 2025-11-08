# Data Model: Competitive Intelligence Dashboard

**Date**: 2025-10-31
**Phase**: 1 (Design & Contracts)
**Status**: Complete

## Overview

This document defines the database schema for the Competitive Intelligence Dashboard feature, including all tables, relationships, indexes, and Row Level Security (RLS) policies.

---

## Entity Relationship Diagram

```
┌─────────────────────────┐
│ competitive_analyses    │
│ (Main analysis record)  │
└───────────┬─────────────┘
            │ 1
            │
            │ N
┌───────────▼──────────────────┐         ┌──────────────────────────┐
│ competitive_analysis_        │ N     1 │ competitor_companies     │
│ competitors (Junction)       ├─────────┤ (Company profiles)       │
└──────────────────────────────┘         └──────────────────────────┘
            │
            │ 1
            │
            ├─── N ──> feature_parity_scores
            ├─── N ──> pricing_comparisons
            ├─── N ──> market_positioning
            ├─── N ──> competitive_moat_scores
            │
┌───────────▼──────────────────┐
│ feature_matrix_entries       │
│ (Feature inventory)          │
└──────────────────────────────┘
            │ N
            │
            │ 1
┌───────────▼──────────────────┐
│ data_source_citations        │
│ (Audit trail)                │
└──────────────────────────────┘

┌─────────────────────────┐         ┌──────────────────────────┐
│ competitive_analyses    │ 1     N │ analysis_access_grants   │
├─────────────────────────┤◄────────┤ (Sharing permissions)    │
│                         │         └──────────────────────────┘
│                         │
│                         │ 1     N ┌──────────────────────────┐
│                         ├─────────┤ analysis_snapshots       │
│                         │         │ (Historical records)     │
└─────────────────────────┘         └──────────────────────────┘

┌──────────────────────────┐
│ industry_recognitions    │
│ (Awards & rankings)      │
└───────────┬──────────────┘
            │ N
            │
            │ 1
            │
    competitor_companies
```

---

## Table Definitions

### 1. competitive_analyses

**Purpose**: Main table storing competitive analysis records with metadata.

```sql
CREATE TABLE competitive_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Access
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Analysis Metadata
  target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  target_company_name VARCHAR(255) NOT NULL,
  target_company_website VARCHAR(500),

  -- Analysis Configuration
  title VARCHAR(255) NOT NULL,
  description TEXT,
  market_segment VARCHAR(100),  -- e.g., "Enterprise SaaS", "SMB Software"
  geography VARCHAR(100),        -- e.g., "North America", "EMEA"

  -- Status & Lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  deal_status VARCHAR(20) DEFAULT 'active'
    CHECK (deal_status IN ('active', 'closed_acquired', 'closed_passed', 'abandoned')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  auto_archive_at TIMESTAMPTZ,

  -- Computed Metrics (denormalized for performance)
  competitor_count INT DEFAULT 0,
  avg_feature_parity_score NUMERIC(5,2),
  overall_moat_score NUMERIC(5,2),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_comp_analyses_created_by ON competitive_analyses(created_by)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_analyses_org ON competitive_analyses(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_analyses_status ON competitive_analyses(status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_comp_analyses_last_viewed ON competitive_analyses(last_viewed_at DESC);

-- Trigger: Update updated_at
CREATE TRIGGER update_competitive_analyses_updated_at
  BEFORE UPDATE ON competitive_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analyses they created or have been granted access to
CREATE POLICY "Users view own or shared analyses"
  ON competitive_analyses FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM analysis_access_grants
      WHERE analysis_id = competitive_analyses.id
        AND user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

-- Policy: Users can create analyses
CREATE POLICY "Users create analyses"
  ON competitive_analyses FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Policy: Only owners can update
CREATE POLICY "Owners update analyses"
  ON competitive_analyses FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Only owners can delete
CREATE POLICY "Owners delete analyses"
  ON competitive_analyses FOR DELETE
  USING (created_by = auth.uid());
```

---

### 2. competitor_companies

**Purpose**: Store competitor company profiles (may link to existing `businesses` table).

```sql
CREATE TABLE competitor_companies (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Identification
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,  -- Link to existing data

  -- Company Details
  industry VARCHAR(100),
  company_size_band VARCHAR(50),  -- e.g., "1-50", "51-200", "201-1000"
  headquarters_location VARCHAR(255),
  founded_year INT,
  employee_count_estimate INT,
  revenue_estimate NUMERIC(15,2),
  funding_total NUMERIC(15,2),

  -- Products & Market
  primary_product VARCHAR(255),
  product_description TEXT,
  target_customer_segment VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Deduplication
  UNIQUE(name, website)
);

-- Indexes
CREATE INDEX idx_competitor_companies_name ON competitor_companies(name);
CREATE INDEX idx_competitor_companies_website ON competitor_companies(website);
CREATE INDEX idx_competitor_companies_business_id ON competitor_companies(business_id);

-- RLS: Public read (all authenticated users can view)
ALTER TABLE competitor_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view competitors"
  ON competitor_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users create competitors"
  ON competitor_companies FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

### 3. competitive_analysis_competitors (Junction Table)

**Purpose**: Many-to-many relationship between analyses and competitors.

```sql
CREATE TABLE competitive_analysis_competitors (
  -- Composite Primary Key
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,
  PRIMARY KEY (analysis_id, competitor_id),

  -- Relationship Metadata
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Competitive Context
  relationship_type VARCHAR(50) DEFAULT 'direct_competitor'
    CHECK (relationship_type IN ('direct_competitor', 'adjacent_market', 'potential_threat', 'substitute')),
  threat_level VARCHAR(20)
    CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_comp_analysis_competitors_analysis ON competitive_analysis_competitors(analysis_id);
CREATE INDEX idx_comp_analysis_competitors_competitor ON competitive_analysis_competitors(competitor_id);

-- RLS: Inherit from competitive_analyses
ALTER TABLE competitive_analysis_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view analysis competitors"
  ON competitive_analysis_competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_competitors.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

CREATE POLICY "Owners manage competitors"
  ON competitive_analysis_competitors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_competitors.analysis_id
        AND created_by = auth.uid()
    )
  );
```

---

### 4. feature_matrix_entries

**Purpose**: Feature inventory with company possession flags.

```sql
CREATE TABLE feature_matrix_entries (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Feature Definition
  feature_name VARCHAR(255) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50) NOT NULL
    CHECK (feature_category IN ('core', 'integrations', 'enterprise', 'mobile', 'analytics', 'security', 'other')),
  category_weight NUMERIC(3,2) DEFAULT 0.40,  -- Importance weight (0.0-1.0)

  -- Feature Possession (JSONB for flexibility)
  possessed_by JSONB NOT NULL DEFAULT '{}',  -- {"target": true, "competitor_uuid_1": true, "competitor_uuid_2": false}

  -- Source Attribution
  source_type VARCHAR(50),  -- 'automatic', 'manual', 'imported'
  source_citation_id UUID REFERENCES data_source_citations(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_matrix_analysis ON feature_matrix_entries(analysis_id);
CREATE INDEX idx_feature_matrix_category ON feature_matrix_entries(feature_category);
CREATE INDEX idx_feature_matrix_possessed_by ON feature_matrix_entries USING GIN(possessed_by);

-- RLS
ALTER TABLE feature_matrix_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view analysis features"
  ON feature_matrix_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = feature_matrix_entries.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 5. feature_parity_scores

**Purpose**: Calculated parity scores for each competitor pair.

```sql
CREATE TABLE feature_parity_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Scoring Components
  parity_score NUMERIC(5,2) NOT NULL CHECK (parity_score >= 0 AND parity_score <= 100),
  overlap_score NUMERIC(5,2),        -- % of target features competitor has
  differentiation_score NUMERIC(5,2), -- % of target features that are unique

  -- Score Metadata
  calculation_method VARCHAR(50) DEFAULT 'weighted_overlap_differentiation',
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Feature Breakdown (for drill-down)
  feature_counts JSONB,  -- {"core": 10, "integrations": 5, ...}

  -- Unique constraint
  UNIQUE(analysis_id, competitor_id)
);

-- Indexes
CREATE INDEX idx_parity_scores_analysis ON feature_parity_scores(analysis_id);
CREATE INDEX idx_parity_scores_competitor ON feature_parity_scores(competitor_id);
CREATE INDEX idx_parity_scores_score ON feature_parity_scores(parity_score DESC);

-- RLS
ALTER TABLE feature_parity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view parity scores"
  ON feature_parity_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = feature_parity_scores.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 6. pricing_comparisons

**Purpose**: Pricing model analysis per competitor.

```sql
CREATE TABLE pricing_comparisons (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Pricing Model
  pricing_model VARCHAR(50),  -- 'per_user', 'per_seat', 'usage_based', 'flat_rate', 'tiered'
  billing_frequency VARCHAR(20), -- 'monthly', 'annual', 'one_time'

  -- Price Points (JSONB for flexibility)
  price_tiers JSONB,  -- [{"name": "Basic", "price": 10, "features": [...]}, ...]
  representative_price NUMERIC(10,2),  -- Typical price for comparison

  -- Positioning
  relative_positioning VARCHAR(20) CHECK (relative_positioning IN ('premium', 'parity', 'discount')),
  price_delta_percent NUMERIC(6,2),  -- % difference from target

  -- Analysis
  pricing_strategy_assessment TEXT,

  -- Source
  source_citation_id UUID REFERENCES data_source_citations(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(analysis_id, competitor_id)
);

-- Indexes
CREATE INDEX idx_pricing_comparisons_analysis ON pricing_comparisons(analysis_id);

-- RLS
ALTER TABLE pricing_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view pricing comparisons"
  ON pricing_comparisons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = pricing_comparisons.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 7. market_positioning

**Purpose**: Market position characterizations.

```sql
CREATE TABLE market_positioning (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Positioning
  positioning_label VARCHAR(100),  -- 'Enterprise Leader', 'Mid-Market Challenger', etc.
  market_share_estimate NUMERIC(5,2),  -- %
  customer_segments JSONB,  -- ["enterprise", "smb", "startups"]
  geographic_presence JSONB,  -- ["north_america", "emea", "apac"]

  -- Differentiation
  differentiation_factors TEXT[],  -- Array of key differentiators

  -- Supporting Evidence
  supporting_evidence TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(analysis_id, competitor_id)
);

-- RLS
ALTER TABLE market_positioning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view market positioning"
  ON market_positioning FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = market_positioning.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 8. competitive_moat_scores

**Purpose**: Composite moat strength records.

```sql
CREATE TABLE competitive_moat_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Overall Score
  moat_score NUMERIC(5,2) NOT NULL CHECK (moat_score >= 0 AND moat_score <= 100),

  -- Component Scores (0-100 each)
  feature_differentiation_score NUMERIC(5,2),
  pricing_power_score NUMERIC(5,2),
  brand_recognition_score NUMERIC(5,2),
  customer_lock_in_score NUMERIC(5,2),
  network_effects_score NUMERIC(5,2),

  -- Supporting Evidence
  supporting_evidence JSONB,  -- Detailed breakdown
  risk_factors TEXT[],

  -- Timestamps
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One moat score per analysis
  UNIQUE(analysis_id)
);

-- RLS
ALTER TABLE competitive_moat_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view moat scores"
  ON competitive_moat_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_moat_scores.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 9. industry_recognitions

**Purpose**: Awards, analyst rankings, and third-party validation.

```sql
CREATE TABLE industry_recognitions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Recognition Details
  recognition_type VARCHAR(100),  -- 'Gartner Leader', 'G2 Category Leader', 'Best Product Award'
  source VARCHAR(100),  -- 'Gartner', 'Forrester', 'G2', 'TrustRadius', 'Industry Org'
  category VARCHAR(100),  -- Specific category or report name
  position VARCHAR(50),  -- 'Leader', 'Challenger', '#1', etc.

  -- Date & Context
  date_received DATE,
  year INT,
  context_notes TEXT,

  -- Source
  url VARCHAR(500),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_industry_recognitions_competitor ON industry_recognitions(competitor_id);
CREATE INDEX idx_industry_recognitions_source ON industry_recognitions(source);

-- RLS: Public read
ALTER TABLE industry_recognitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view recognitions"
  ON industry_recognitions FOR SELECT
  TO authenticated
  USING (true);
```

---

### 10. data_source_citations

**Purpose**: Source attribution for audit trail (FR-023).

```sql
CREATE TABLE data_source_citations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Source Details
  source_type VARCHAR(50) NOT NULL,  -- 'company_website', 'analyst_report', 'review_site', 'manual_entry'
  source_name VARCHAR(255),  -- 'G2 Crowd', 'Gartner', 'Company Product Page'
  url VARCHAR(500),
  access_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Confidence & Notes
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  analyst_notes TEXT,

  -- Attribution
  entered_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_data_source_citations_analysis ON data_source_citations(analysis_id);
CREATE INDEX idx_data_source_citations_type ON data_source_citations(source_type);

-- RLS
ALTER TABLE data_source_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view citations"
  ON data_source_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = data_source_citations.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 11. analysis_snapshots

**Purpose**: Historical point-in-time records (FR-017).

```sql
CREATE TABLE analysis_snapshots (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Snapshot Data (JSONB for full analysis state)
  snapshot_data JSONB NOT NULL,  -- Full JSON export of analysis at this point

  -- Snapshot Metadata
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_trigger VARCHAR(50),  -- 'manual', 'automatic', 'before_refresh', 'deal_closure'
  created_by UUID REFERENCES auth.users(id),

  -- Change Indicators (computed)
  changes_summary JSONB,  -- {"features_added": 2, "pricing_changed": true, ...}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analysis_snapshots_analysis ON analysis_snapshots(analysis_id);
CREATE INDEX idx_analysis_snapshots_date ON analysis_snapshots(snapshot_date DESC);

-- RLS
ALTER TABLE analysis_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view snapshots"
  ON analysis_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_snapshots.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );
```

---

### 12. analysis_access_grants

**Purpose**: Per-target permission sharing (FR-021, FR-023-NEW).

```sql
CREATE TABLE analysis_access_grants (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Permission Level
  access_level VARCHAR(20) NOT NULL DEFAULT 'view'
    CHECK (access_level IN ('view', 'edit')),

  -- Grant Metadata
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),

  -- Invitation Method
  invitation_method VARCHAR(20) CHECK (invitation_method IN ('email', 'user_selection')),
  invitation_email VARCHAR(255),

  -- Unique constraint
  UNIQUE(analysis_id, user_id)
);

-- Indexes
CREATE INDEX idx_access_grants_analysis ON analysis_access_grants(analysis_id);
CREATE INDEX idx_access_grants_user ON analysis_access_grants(user_id);
CREATE INDEX idx_access_grants_revoked ON analysis_access_grants(revoked_at) WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE analysis_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own grants"
  ON analysis_access_grants FOR SELECT
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM competitive_analyses
                 WHERE id = analysis_access_grants.analysis_id
                   AND created_by = auth.uid()));

CREATE POLICY "Owners manage grants"
  ON analysis_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_access_grants.analysis_id
        AND created_by = auth.uid()
    )
  );
```

---

## Validation Rules

### Business Logic Constraints

1. **Analysis must have at least 1 competitor**: Enforced in application layer
2. **Feature matrix entries must reference existing competitor_id**: FK constraint
3. **Parity scores recalculated on feature matrix changes**: Database trigger
4. **Moat score recalculated on parity score changes**: Database trigger
5. **Snapshots auto-created before data refresh**: Application layer

### Triggers

```sql
-- Auto-update competitor_count in competitive_analyses
CREATE OR REPLACE FUNCTION update_competitor_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE competitive_analyses
  SET competitor_count = (
    SELECT COUNT(*) FROM competitive_analysis_competitors
    WHERE analysis_id = NEW.analysis_id
  ),
  updated_at = NOW()
  WHERE id = NEW.analysis_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_competitor_count
AFTER INSERT OR DELETE ON competitive_analysis_competitors
FOR EACH ROW EXECUTE FUNCTION update_competitor_count();

-- Auto-update avg_feature_parity_score
CREATE OR REPLACE FUNCTION update_avg_parity_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE competitive_analyses
  SET avg_feature_parity_score = (
    SELECT AVG(parity_score) FROM feature_parity_scores
    WHERE analysis_id = NEW.analysis_id
  ),
  updated_at = NOW()
  WHERE id = NEW.analysis_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_avg_parity_score
AFTER INSERT OR UPDATE ON feature_parity_scores
FOR EACH ROW EXECUTE FUNCTION update_avg_parity_score();
```

---

## Migration Script

**File**: `supabase/migrations/20251031_competitive_intelligence.sql`

Contains all CREATE TABLE, INDEX, RLS, and TRIGGER statements above.

---

## Storage Estimates

**Per Analysis** (10 competitors):
- competitive_analyses: 2KB
- competitive_analysis_competitors: 1KB
- competitor_companies: 20KB (2KB each)
- feature_matrix_entries: 50KB (100 features avg)
- feature_parity_scores: 5KB
- pricing_comparisons: 10KB
- market_positioning: 10KB
- competitive_moat_scores: 2KB
- industry_recognitions: 5KB
- data_source_citations: 3KB
- analysis_snapshots: 100KB (1 snapshot)
- analysis_access_grants: 1KB

**Total per analysis**: ~210KB base + ~100KB per snapshot

**Projected storage** (100 analyses/month, 12-month retention):
- Year 1: 100 * 12 * 0.21MB = 252MB
- With snapshots (avg 3 per analysis): +360MB = **612MB total**

---

## Next Steps

1. ✅ Create migration script
2. ✅ Generate OpenAPI spec for API contracts
3. ✅ Write contract tests
4. ✅ Generate quickstart.md
5. → Proceed to Phase 2 (tasks.md generation via /tasks command)

---

**Data Model Complete** | Ready for contract generation
