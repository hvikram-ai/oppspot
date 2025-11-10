-- ================================================================
-- Competitive Intelligence - Fixed Migration
-- ================================================================
-- This version creates tables first, then adds RLS policies
-- ================================================================

BEGIN;

-- Disable RLS temporarily during creation
ALTER TABLE IF EXISTS competitive_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analysis_access_grants DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- Competitive Intelligence Dashboard - Database Schema
-- Created: 2025-10-31
-- Feature: 014-1-competitive-intelligence
-- ================================================================

-- ================================================================
-- 1. COMPETITOR COMPANIES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS competitor_companies (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Identification
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Company Details
  industry VARCHAR(100),
  company_size_band VARCHAR(50),
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
CREATE INDEX IF NOT EXISTS idx_competitor_companies_name ON competitor_companies(name);
CREATE INDEX IF NOT EXISTS idx_competitor_companies_website ON competitor_companies(website);
CREATE INDEX IF NOT EXISTS idx_competitor_companies_business_id ON competitor_companies(business_id);

-- RLS

  ON competitor_companies FOR SELECT
  TO authenticated
  USING (true);

  ON competitor_companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================================
-- 2. COMPETITIVE ANALYSES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Access
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,

  -- Analysis Metadata
  target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  target_company_name VARCHAR(255) NOT NULL,
  target_company_website VARCHAR(500),

  -- Analysis Configuration
  title VARCHAR(255) NOT NULL,
  description TEXT,
  market_segment VARCHAR(100),
  geography VARCHAR(100),

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

  -- Computed Metrics
  competitor_count INT DEFAULT 0,
  avg_feature_parity_score NUMERIC(5,2),
  overall_moat_score NUMERIC(5,2),

  -- Soft Delete
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comp_analyses_created_by ON competitive_analyses(created_by)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_org ON competitive_analyses(organization_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_status ON competitive_analyses(status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comp_analyses_last_viewed ON competitive_analyses(last_viewed_at DESC);

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_competitive_analyses_updated_at ON competitive_analyses;
CREATE TRIGGER update_competitive_analyses_updated_at
  BEFORE UPDATE ON competitive_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS

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

  ON competitive_analyses FOR INSERT
  WITH CHECK (created_by = auth.uid());

  ON competitive_analyses FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

  ON competitive_analyses FOR DELETE
  USING (created_by = auth.uid());

-- ================================================================
-- 3. COMPETITIVE ANALYSIS COMPETITORS (JUNCTION TABLE)
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_analysis_competitors (
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
CREATE INDEX IF NOT EXISTS idx_comp_analysis_competitors_analysis ON competitive_analysis_competitors(analysis_id);
CREATE INDEX IF NOT EXISTS idx_comp_analysis_competitors_competitor ON competitive_analysis_competitors(competitor_id);

-- RLS

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

  ON competitive_analysis_competitors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_competitors.analysis_id
        AND created_by = auth.uid()
    )
  );

-- ================================================================
-- 4. ANALYSIS ACCESS GRANTS
-- ================================================================

CREATE TABLE IF NOT EXISTS analysis_access_grants (
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
CREATE INDEX IF NOT EXISTS idx_access_grants_analysis ON analysis_access_grants(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON analysis_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_revoked ON analysis_access_grants(revoked_at) WHERE revoked_at IS NULL;

-- RLS

  ON analysis_access_grants FOR SELECT
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM competitive_analyses
                 WHERE id = analysis_access_grants.analysis_id
                   AND created_by = auth.uid()));

  ON analysis_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_access_grants.analysis_id
        AND created_by = auth.uid()
    )
  );

-- ================================================================
-- 5. DATA SOURCE CITATIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS data_source_citations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Source Details
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(255),
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
CREATE INDEX IF NOT EXISTS idx_data_source_citations_analysis ON data_source_citations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_data_source_citations_type ON data_source_citations(source_type);

-- RLS

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

-- ================================================================
-- 6. FEATURE MATRIX ENTRIES
-- ================================================================

CREATE TABLE IF NOT EXISTS feature_matrix_entries (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Feature Definition
  feature_name VARCHAR(255) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50) NOT NULL
    CHECK (feature_category IN ('core', 'integrations', 'enterprise', 'mobile', 'analytics', 'security', 'other')),
  category_weight NUMERIC(3,2) DEFAULT 0.40,

  -- Feature Possession (JSONB)
  possessed_by JSONB NOT NULL DEFAULT '{}',

  -- Source Attribution
  source_type VARCHAR(50),
  source_citation_id UUID REFERENCES data_source_citations(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_matrix_analysis ON feature_matrix_entries(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feature_matrix_category ON feature_matrix_entries(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_matrix_possessed_by ON feature_matrix_entries USING GIN(possessed_by);

-- RLS

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

-- ================================================================
-- 7. FEATURE PARITY SCORES
-- ================================================================

CREATE TABLE IF NOT EXISTS feature_parity_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Scoring Components
  parity_score NUMERIC(5,2) NOT NULL CHECK (parity_score >= 0 AND parity_score <= 100),
  overlap_score NUMERIC(5,2),
  differentiation_score NUMERIC(5,2),

  -- Score Metadata
  calculation_method VARCHAR(50) DEFAULT 'weighted_overlap_differentiation',
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Feature Breakdown
  feature_counts JSONB,

  -- Unique constraint
  UNIQUE(analysis_id, competitor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parity_scores_analysis ON feature_parity_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_parity_scores_competitor ON feature_parity_scores(competitor_id);
CREATE INDEX IF NOT EXISTS idx_parity_scores_score ON feature_parity_scores(parity_score DESC);

-- RLS

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

-- ================================================================
-- 8. PRICING COMPARISONS
-- ================================================================

CREATE TABLE IF NOT EXISTS pricing_comparisons (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Pricing Model
  pricing_model VARCHAR(50),
  billing_frequency VARCHAR(20),

  -- Price Points (JSONB)
  price_tiers JSONB,
  representative_price NUMERIC(10,2),

  -- Positioning
  relative_positioning VARCHAR(20) CHECK (relative_positioning IN ('premium', 'parity', 'discount')),
  price_delta_percent NUMERIC(6,2),

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
CREATE INDEX IF NOT EXISTS idx_pricing_comparisons_analysis ON pricing_comparisons(analysis_id);

-- RLS

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

-- ================================================================
-- 9. MARKET POSITIONING
-- ================================================================

CREATE TABLE IF NOT EXISTS market_positioning (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Positioning
  positioning_label VARCHAR(100),
  market_share_estimate NUMERIC(5,2),
  customer_segments JSONB,
  geographic_presence JSONB,

  -- Differentiation
  differentiation_factors TEXT[],

  -- Supporting Evidence
  supporting_evidence TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(analysis_id, competitor_id)
);

-- RLS

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

-- ================================================================
-- 10. COMPETITIVE MOAT SCORES
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_moat_scores (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Overall Score
  moat_score NUMERIC(5,2) NOT NULL CHECK (moat_score >= 0 AND moat_score <= 100),

  -- Component Scores
  feature_differentiation_score NUMERIC(5,2),
  pricing_power_score NUMERIC(5,2),
  brand_recognition_score NUMERIC(5,2),
  customer_lock_in_score NUMERIC(5,2),
  network_effects_score NUMERIC(5,2),

  -- Supporting Evidence
  supporting_evidence JSONB,
  risk_factors TEXT[],

  -- Timestamps
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One moat score per analysis
  UNIQUE(analysis_id)
);

-- RLS

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

-- ================================================================
-- 11. INDUSTRY RECOGNITIONS
-- ================================================================

CREATE TABLE IF NOT EXISTS industry_recognitions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,

  -- Recognition Details
  recognition_type VARCHAR(100),
  source VARCHAR(100),
  category VARCHAR(100),
  position VARCHAR(50),

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
CREATE INDEX IF NOT EXISTS idx_industry_recognitions_competitor ON industry_recognitions(competitor_id);
CREATE INDEX IF NOT EXISTS idx_industry_recognitions_source ON industry_recognitions(source);

-- RLS

  ON industry_recognitions FOR SELECT
  TO authenticated
  USING (true);

-- ================================================================
-- 12. ANALYSIS SNAPSHOTS
-- ================================================================

CREATE TABLE IF NOT EXISTS analysis_snapshots (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,

  -- Snapshot Data (JSONB)
  snapshot_data JSONB NOT NULL,

  -- Snapshot Metadata
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_trigger VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),

  -- Change Indicators
  changes_summary JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_analysis ON analysis_snapshots(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_date ON analysis_snapshots(snapshot_date DESC);

-- RLS

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

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-update competitor_count in competitive_analyses
CREATE OR REPLACE FUNCTION update_competitor_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE competitive_analyses
    SET competitor_count = (
      SELECT COUNT(*) FROM competitive_analysis_competitors
      WHERE analysis_id = OLD.analysis_id
    ),
    updated_at = NOW()
    WHERE id = OLD.analysis_id;
    RETURN OLD;
  ELSE
    UPDATE competitive_analyses
    SET competitor_count = (
      SELECT COUNT(*) FROM competitive_analysis_competitors
      WHERE analysis_id = NEW.analysis_id
    ),
    updated_at = NOW()
    WHERE id = NEW.analysis_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_competitor_count ON competitive_analysis_competitors;
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

DROP TRIGGER IF EXISTS trigger_update_avg_parity_score ON feature_parity_scores;
CREATE TRIGGER trigger_update_avg_parity_score
AFTER INSERT OR UPDATE ON feature_parity_scores
FOR EACH ROW EXECUTE FUNCTION update_avg_parity_score();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

COMMIT;
