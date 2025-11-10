-- ================================================================
-- Add Missing Tables (8 of 12)
-- ================================================================
-- These tables should have been created but weren't
-- ================================================================

-- 5. analysis_access_grants
CREATE TABLE IF NOT EXISTS analysis_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(10) NOT NULL DEFAULT 'view'
    CHECK (access_level IN ('view', 'edit')),
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_method VARCHAR(20) CHECK (invitation_method IN ('email', 'user_selection')),
  invitation_email VARCHAR(255),
  UNIQUE(analysis_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_grants_analysis ON analysis_access_grants(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON analysis_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_revoked ON analysis_access_grants(revoked_at) WHERE revoked_at IS NULL;

-- 6. data_source_citations
CREATE TABLE IF NOT EXISTS data_source_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(255),
  url VARCHAR(500),
  access_date DATE NOT NULL DEFAULT CURRENT_DATE,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  analyst_notes TEXT,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_source_citations_analysis ON data_source_citations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_data_source_citations_type ON data_source_citations(source_type);

-- 7. feature_matrix_entries
CREATE TABLE IF NOT EXISTS feature_matrix_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50) NOT NULL
    CHECK (feature_category IN ('core', 'integrations', 'enterprise', 'mobile', 'analytics', 'security', 'other')),
  category_weight NUMERIC(3,2) DEFAULT 0.40,
  possessed_by JSONB DEFAULT '{}',
  source_type VARCHAR(50),
  source_citation_id UUID REFERENCES data_source_citations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_matrix_analysis ON feature_matrix_entries(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feature_matrix_category ON feature_matrix_entries(feature_category);

-- 8. feature_parity_scores
CREATE TABLE IF NOT EXISTS feature_parity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,
  parity_score NUMERIC(5,2) NOT NULL CHECK (parity_score >= 0 AND parity_score <= 100),
  overlap_score NUMERIC(5,2),
  differentiation_score NUMERIC(5,2),
  calculation_method VARCHAR(50) DEFAULT 'weighted_overlap_differentiation',
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feature_counts JSONB,
  UNIQUE(analysis_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS idx_parity_scores_analysis ON feature_parity_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_parity_scores_competitor ON feature_parity_scores(competitor_id);

-- 9. pricing_comparisons
CREATE TABLE IF NOT EXISTS pricing_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,
  pricing_model VARCHAR(50),
  billing_frequency VARCHAR(20),
  price_tiers JSONB,
  representative_price NUMERIC(12,2),
  relative_positioning VARCHAR(20) CHECK (relative_positioning IN ('premium', 'parity', 'discount')),
  price_delta_percent NUMERIC(5,2),
  pricing_strategy_assessment TEXT,
  source_citation_id UUID REFERENCES data_source_citations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_comparisons_analysis ON pricing_comparisons(analysis_id);
CREATE INDEX IF NOT EXISTS idx_pricing_comparisons_competitor ON pricing_comparisons(competitor_id);

-- 10. market_positioning
CREATE TABLE IF NOT EXISTS market_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,
  positioning_label VARCHAR(100),
  market_share_estimate NUMERIC(5,2),
  customer_segments TEXT[],
  geographic_presence TEXT[],
  differentiation_factors TEXT[],
  supporting_evidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS idx_market_positioning_analysis ON market_positioning(analysis_id);
CREATE INDEX IF NOT EXISTS idx_market_positioning_competitor ON market_positioning(competitor_id);

-- 11. industry_recognitions
CREATE TABLE IF NOT EXISTS industry_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_companies(id) ON DELETE CASCADE,
  recognition_type VARCHAR(100),
  source VARCHAR(100),
  category VARCHAR(100),
  position VARCHAR(50),
  date_received DATE,
  year INT,
  context_notes TEXT,
  url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_recognitions_competitor ON industry_recognitions(competitor_id);
CREATE INDEX IF NOT EXISTS idx_industry_recognitions_year ON industry_recognitions(year);

-- 12. analysis_snapshots
CREATE TABLE IF NOT EXISTS analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_trigger VARCHAR(50),
  created_by UUID REFERENCES auth.users(id),
  changes_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_analysis ON analysis_snapshots(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_date ON analysis_snapshots(snapshot_date DESC);

-- Verify all tables now exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%competitive%'
    OR table_name LIKE '%competitor%'
  )
ORDER BY table_name;
