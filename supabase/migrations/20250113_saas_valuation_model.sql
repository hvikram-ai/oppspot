-- ============================================================================
-- SaaS Valuation Model Feature
-- ============================================================================
-- Creates tables for AI-powered SaaS valuation within data rooms
-- Supports revenue multiple, DCF, and comparable company analysis
-- Target: Generate "$75M-$120M" ranges to anchor M&A negotiations
--
-- Author: oppSpot Development Team
-- Date: 2025-01-13
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: saas_valuation_models
-- ============================================================================
-- Stores valuation models with inputs, outputs, and AI analysis
-- Each model is linked to a data room for access control

CREATE TABLE IF NOT EXISTS saas_valuation_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Model metadata
  model_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  fiscal_year_end TEXT, -- e.g., "2024-12-31" or "FY2024"

  -- Key financial inputs (can be AI-extracted or manual)
  arr NUMERIC(15, 2), -- Annual Recurring Revenue
  mrr NUMERIC(15, 2), -- Monthly Recurring Revenue
  revenue_growth_rate NUMERIC(5, 2), -- e.g., 45.00 for 45%
  gross_margin NUMERIC(5, 2), -- e.g., 75.00 for 75%
  net_revenue_retention NUMERIC(5, 2), -- e.g., 110.00 for 110% NRR
  cac_payback_months INTEGER, -- Customer Acquisition Cost payback period
  burn_rate NUMERIC(15, 2), -- Monthly cash burn
  runway_months INTEGER, -- Cash runway
  ebitda NUMERIC(15, 2), -- Earnings before interest, taxes, depreciation
  employees INTEGER, -- Headcount

  -- Valuation methodology settings
  valuation_method TEXT NOT NULL DEFAULT 'revenue_multiple'
    CHECK (valuation_method IN ('revenue_multiple', 'dcf', 'hybrid')),

  -- Calculated outputs
  revenue_multiple_low NUMERIC(5, 2), -- e.g., 8.0x
  revenue_multiple_mid NUMERIC(5, 2), -- e.g., 10.0x
  revenue_multiple_high NUMERIC(5, 2), -- e.g., 12.0x
  estimated_valuation_low NUMERIC(15, 2), -- Low estimate
  estimated_valuation_mid NUMERIC(15, 2), -- Base case estimate
  estimated_valuation_high NUMERIC(15, 2), -- High estimate
  valuation_confidence NUMERIC(3, 2), -- 0.00 to 1.00 confidence score

  -- Data sources and extraction
  source_documents UUID[], -- Array of document IDs used for extraction
  extraction_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (extraction_method IN ('manual', 'ai_extracted', 'companies_house', 'hybrid')),
  data_quality_score NUMERIC(3, 2), -- 0.00 to 1.00 quality score

  -- AI analysis and reasoning
  ai_insights JSONB, -- Structured AI insights: {reasoning, risks, opportunities, assumptions}
  ai_model TEXT, -- e.g., "anthropic/claude-3.5-sonnet"
  ai_processing_time_ms INTEGER, -- Time taken for AI analysis

  -- Calculation metadata
  calculation_details JSONB, -- Full calculation breakdown for transparency
  assumptions JSONB, -- User-defined assumptions and adjustments

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'extracting', 'calculating', 'complete', 'error')),
  error_message TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_arr CHECK (arr IS NULL OR arr >= 0),
  CONSTRAINT valid_growth CHECK (revenue_growth_rate IS NULL OR revenue_growth_rate >= -100),
  CONSTRAINT valid_margins CHECK (gross_margin IS NULL OR (gross_margin >= 0 AND gross_margin <= 100)),
  CONSTRAINT valid_confidence CHECK (valuation_confidence >= 0 AND valuation_confidence <= 1)
);

-- Indexes for performance
CREATE INDEX idx_saas_valuation_models_data_room ON saas_valuation_models(data_room_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_saas_valuation_models_created_by ON saas_valuation_models(created_by)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_saas_valuation_models_status ON saas_valuation_models(status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_saas_valuation_models_date ON saas_valuation_models(valuation_date DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: valuation_comparables
-- ============================================================================
-- Stores comparable companies for benchmarking
-- Used to calculate industry-standard revenue multiples

CREATE TABLE IF NOT EXISTS valuation_comparables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_model_id UUID NOT NULL REFERENCES saas_valuation_models(id) ON DELETE CASCADE,

  -- Comparable company identification
  company_name TEXT NOT NULL,
  ticker_symbol TEXT, -- Stock ticker if public
  industry TEXT NOT NULL,
  geography TEXT, -- e.g., "North America", "Europe", "Global"
  company_stage TEXT, -- e.g., "public", "late_stage", "growth"

  -- Financial metrics
  arr NUMERIC(15, 2),
  revenue NUMERIC(15, 2),
  revenue_growth_rate NUMERIC(5, 2),
  gross_margin NUMERIC(5, 2),
  ebitda_margin NUMERIC(5, 2),
  employees INTEGER,

  -- Valuation data
  revenue_multiple NUMERIC(5, 2) NOT NULL, -- e.g., 10.5x
  market_cap NUMERIC(15, 2), -- Market capitalization (if public)
  valuation NUMERIC(15, 2), -- Private valuation or market cap
  valuation_date DATE,

  -- Source attribution
  source TEXT NOT NULL, -- 'public_markets', 'manual', 'ai_research', 'industry_report'
  source_url TEXT,
  source_document_id UUID REFERENCES documents(id),
  data_quality_score NUMERIC(3, 2) DEFAULT 0.50, -- 0.00 to 1.00

  -- Relevance and weighting
  relevance_score NUMERIC(3, 2) DEFAULT 0.50, -- How similar to target company
  weight NUMERIC(3, 2) DEFAULT 1.00, -- Weight in average calculation

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_revenue_multiple CHECK (revenue_multiple > 0 AND revenue_multiple < 100),
  CONSTRAINT valid_relevance CHECK (relevance_score >= 0 AND relevance_score <= 1)
);

-- Indexes
CREATE INDEX idx_valuation_comparables_model ON valuation_comparables(valuation_model_id);
CREATE INDEX idx_valuation_comparables_industry ON valuation_comparables(industry);

-- ============================================================================
-- TABLE: valuation_scenarios
-- ============================================================================
-- Stores sensitivity analysis scenarios (optimistic, base, pessimistic)
-- Allows "what-if" analysis by adjusting key assumptions

CREATE TABLE IF NOT EXISTS valuation_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_model_id UUID NOT NULL REFERENCES saas_valuation_models(id) ON DELETE CASCADE,

  -- Scenario metadata
  scenario_name TEXT NOT NULL, -- 'base', 'optimistic', 'pessimistic', 'conservative', custom
  scenario_type TEXT NOT NULL
    CHECK (scenario_type IN ('base', 'optimistic', 'pessimistic', 'conservative', 'custom')),
  description TEXT,

  -- Adjusted input assumptions
  assumptions JSONB NOT NULL, -- Full set of adjusted inputs
  -- Example: {"arr": 10000000, "revenue_growth_rate": 50, "gross_margin": 80, ...}

  -- Calculated results
  revenue_multiple NUMERIC(5, 2),
  estimated_valuation NUMERIC(15, 2),

  -- Sensitivity analysis
  probability NUMERIC(3, 2), -- Estimated probability of this scenario (0.00 to 1.00)
  upside_downside NUMERIC(5, 2), -- % difference from base case (+/-)

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_probability CHECK (probability IS NULL OR (probability >= 0 AND probability <= 1))
);

-- Indexes
CREATE INDEX idx_valuation_scenarios_model ON valuation_scenarios(valuation_model_id);
CREATE INDEX idx_valuation_scenarios_type ON valuation_scenarios(scenario_type);

-- ============================================================================
-- TABLE: valuation_exports
-- ============================================================================
-- Tracks PDF/Excel exports for audit and regeneration

CREATE TABLE IF NOT EXISTS valuation_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valuation_model_id UUID NOT NULL REFERENCES saas_valuation_models(id) ON DELETE CASCADE,

  -- Export metadata
  export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'excel', 'powerpoint')),
  file_name TEXT NOT NULL,
  storage_path TEXT, -- Supabase storage path
  file_size_bytes BIGINT,

  -- Content configuration
  include_scenarios BOOLEAN DEFAULT true,
  include_comparables BOOLEAN DEFAULT true,
  include_methodology BOOLEAN DEFAULT true,

  -- Audit
  exported_by UUID NOT NULL REFERENCES profiles(id),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_valuation_exports_model ON valuation_exports(valuation_model_id);

-- ============================================================================
-- FUNCTION: update_valuation_updated_at
-- ============================================================================
-- Automatically update updated_at timestamp on row modification

CREATE OR REPLACE FUNCTION update_valuation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_update_valuation_models_updated_at
  BEFORE UPDATE ON saas_valuation_models
  FOR EACH ROW
  EXECUTE FUNCTION update_valuation_updated_at();

CREATE TRIGGER trigger_update_valuation_scenarios_updated_at
  BEFORE UPDATE ON valuation_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_valuation_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Inherit access control from data_rooms table
-- Users can access valuations in data rooms they have access to

-- Enable RLS
ALTER TABLE saas_valuation_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_exports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: saas_valuation_models
-- ============================================================================

-- SELECT: Users can view valuations in their accessible data rooms
CREATE POLICY saas_valuation_models_select ON saas_valuation_models
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = saas_valuation_models.data_room_id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
    )
  );

-- INSERT: Users with editor+ permissions can create valuations
CREATE POLICY saas_valuation_models_insert ON saas_valuation_models
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = saas_valuation_models.data_room_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- UPDATE: Users with editor+ permissions can update valuations
CREATE POLICY saas_valuation_models_update ON saas_valuation_models
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = saas_valuation_models.data_room_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- DELETE: Only owners can delete valuations (soft delete via deleted_at)
CREATE POLICY saas_valuation_models_delete ON saas_valuation_models
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = saas_valuation_models.data_room_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level = 'owner'
        AND dra.revoked_at IS NULL
    )
  );

-- ============================================================================
-- RLS POLICY: valuation_comparables
-- ============================================================================

-- SELECT: Inherit from valuation model
CREATE POLICY valuation_comparables_select ON valuation_comparables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_comparables.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
    )
  );

-- INSERT: Editor+ can add comparables
CREATE POLICY valuation_comparables_insert ON valuation_comparables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_comparables.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- UPDATE: Editor+ can update comparables
CREATE POLICY valuation_comparables_update ON valuation_comparables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_comparables.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- DELETE: Owner only
CREATE POLICY valuation_comparables_delete ON valuation_comparables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_comparables.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level = 'owner'
        AND dra.revoked_at IS NULL
    )
  );

-- ============================================================================
-- RLS POLICY: valuation_scenarios
-- ============================================================================

-- SELECT: Inherit from valuation model
CREATE POLICY valuation_scenarios_select ON valuation_scenarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_scenarios.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
    )
  );

-- INSERT: Editor+ can create scenarios
CREATE POLICY valuation_scenarios_insert ON valuation_scenarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_scenarios.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- UPDATE: Editor+ can update scenarios
CREATE POLICY valuation_scenarios_update ON valuation_scenarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_scenarios.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
    )
  );

-- DELETE: Owner only
CREATE POLICY valuation_scenarios_delete ON valuation_scenarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_scenarios.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.permission_level = 'owner'
        AND dra.revoked_at IS NULL
    )
  );

-- ============================================================================
-- RLS POLICY: valuation_exports
-- ============================================================================

-- SELECT: View export history for accessible valuations
CREATE POLICY valuation_exports_select ON valuation_exports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_exports.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
    )
  );

-- INSERT: All users can export (viewing permissions already checked)
CREATE POLICY valuation_exports_insert ON valuation_exports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saas_valuation_models svm
      JOIN data_room_access dra ON dra.data_room_id = svm.data_room_id
      WHERE svm.id = valuation_exports.valuation_model_id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
    )
  );

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: valuation_models_with_stats
-- Provides enriched valuation model data with calculated statistics
CREATE OR REPLACE VIEW valuation_models_with_stats AS
SELECT
  svm.*,
  dr.name AS data_room_name,
  p.full_name AS created_by_name,
  COUNT(DISTINCT vc.id) AS comparables_count,
  COUNT(DISTINCT vs.id) AS scenarios_count,
  COUNT(DISTINCT ve.id) AS exports_count,
  AVG(vc.revenue_multiple) AS avg_comparable_multiple,
  MAX(vc.revenue_multiple) AS max_comparable_multiple,
  MIN(vc.revenue_multiple) AS min_comparable_multiple
FROM saas_valuation_models svm
LEFT JOIN data_rooms dr ON dr.id = svm.data_room_id
LEFT JOIN profiles p ON p.id = svm.created_by
LEFT JOIN valuation_comparables vc ON vc.valuation_model_id = svm.id
LEFT JOIN valuation_scenarios vs ON vs.valuation_model_id = svm.id
LEFT JOIN valuation_exports ve ON ve.valuation_model_id = svm.id
WHERE svm.deleted_at IS NULL
GROUP BY svm.id, dr.name, p.full_name;

-- Grant access to authenticated users (RLS still applies)
GRANT SELECT ON valuation_models_with_stats TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE saas_valuation_models IS 'Stores SaaS company valuation models with inputs, outputs, and AI analysis for M&A negotiations';
COMMENT ON TABLE valuation_comparables IS 'Comparable companies used for benchmarking revenue multiples and market positioning';
COMMENT ON TABLE valuation_scenarios IS 'Sensitivity analysis scenarios showing valuation ranges under different assumptions';
COMMENT ON TABLE valuation_exports IS 'Audit trail of exported valuation reports (PDF, Excel, PowerPoint)';

COMMENT ON COLUMN saas_valuation_models.arr IS 'Annual Recurring Revenue in specified currency';
COMMENT ON COLUMN saas_valuation_models.revenue_multiple_mid IS 'Base case revenue multiple (e.g., 10.0x ARR)';
COMMENT ON COLUMN saas_valuation_models.estimated_valuation_mid IS 'Base case valuation estimate (e.g., $100M)';
COMMENT ON COLUMN saas_valuation_models.data_quality_score IS 'Confidence in input data quality (0.0 to 1.0)';
COMMENT ON COLUMN saas_valuation_models.ai_insights IS 'JSON structure: {reasoning, risks, opportunities, assumptions, comparable_companies}';
COMMENT ON COLUMN valuation_comparables.relevance_score IS 'How similar this comparable is to target company (0.0 to 1.0)';
COMMENT ON COLUMN valuation_scenarios.upside_downside IS 'Percentage difference from base case valuation';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
