-- ================================================
-- M&A TARGET PREDICTION ALGORITHM
-- Feature: 011-m-a-target
-- Date: 2025-10-30
-- Description: Database schema for M&A prediction feature including
--              predictions, factors, valuations, acquirer profiles,
--              historical deals, queue processing, and audit logging
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector" SCHEMA extensions;

-- ================================================
-- TABLE 1: ma_predictions
-- Core prediction records with scores and categories
-- ================================================

CREATE TABLE IF NOT EXISTS ma_predictions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Prediction scores
  prediction_score INTEGER NOT NULL CHECK (prediction_score >= 0 AND prediction_score <= 100),
  likelihood_category TEXT NOT NULL CHECK (likelihood_category IN ('Low', 'Medium', 'High', 'Very High')),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),

  -- Versioning
  analysis_version TEXT NOT NULL DEFAULT '1.0',
  algorithm_type TEXT NOT NULL DEFAULT 'hybrid_ai_rule_based',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_last_refreshed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Performance tracking
  calculation_time_ms INTEGER,

  -- Constraints
  CONSTRAINT ma_predictions_unique_active UNIQUE(company_id) WHERE (is_active = TRUE)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_predictions_company ON ma_predictions(company_id);
CREATE INDEX IF NOT EXISTS idx_ma_predictions_likelihood ON ma_predictions(likelihood_category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ma_predictions_score ON ma_predictions(prediction_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ma_predictions_updated ON ma_predictions(updated_at DESC);

-- Comments
COMMENT ON TABLE ma_predictions IS 'Core M&A target predictions with scores and categories';
COMMENT ON COLUMN ma_predictions.prediction_score IS 'M&A likelihood score from 0-100';
COMMENT ON COLUMN ma_predictions.likelihood_category IS 'Categorized likelihood: Low (0-25), Medium (26-50), High (51-75), Very High (76-100)';
COMMENT ON COLUMN ma_predictions.is_active IS 'Only one active prediction per company (latest version)';

-- ================================================
-- TABLE 2: ma_prediction_factors
-- Top 5 contributing factors for each prediction
-- ================================================

CREATE TABLE IF NOT EXISTS ma_prediction_factors (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,

  -- Factor details
  factor_type TEXT NOT NULL CHECK (factor_type IN ('financial', 'operational', 'market', 'historical')),
  factor_name TEXT NOT NULL,
  factor_description TEXT NOT NULL,
  impact_weight DECIMAL(5,2) NOT NULL CHECK (impact_weight >= 0 AND impact_weight <= 100),
  impact_direction TEXT CHECK (impact_direction IN ('positive', 'negative', 'neutral')),

  -- Supporting data (JSON)
  supporting_value JSONB,

  -- Ordering
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ma_factors_unique_rank UNIQUE(prediction_id, rank)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_factors_prediction ON ma_prediction_factors(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ma_factors_type ON ma_prediction_factors(factor_type);

-- Comments
COMMENT ON TABLE ma_prediction_factors IS 'Top 5 contributing factors for each M&A prediction';
COMMENT ON COLUMN ma_prediction_factors.impact_weight IS 'Percentage contribution to final prediction score (0-100)';

-- ================================================
-- TABLE 3: ma_valuation_estimates
-- Estimated acquisition price ranges
-- ================================================

CREATE TABLE IF NOT EXISTS ma_valuation_estimates (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,

  -- Valuation range
  min_valuation_gbp BIGINT NOT NULL CHECK (min_valuation_gbp > 0),
  max_valuation_gbp BIGINT NOT NULL CHECK (max_valuation_gbp >= min_valuation_gbp),
  currency TEXT NOT NULL DEFAULT 'GBP',

  -- Methodology
  valuation_method TEXT NOT NULL,
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('High', 'Medium', 'Low')),

  -- Assumptions (JSON)
  key_assumptions JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ma_valuations_unique_prediction UNIQUE(prediction_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_valuations_prediction ON ma_valuation_estimates(prediction_id);

-- Comments
COMMENT ON TABLE ma_valuation_estimates IS 'Estimated acquisition price ranges for Medium+ likelihood targets';
COMMENT ON COLUMN ma_valuation_estimates.valuation_method IS 'Methodology used (e.g., revenue_multiple, ebitda_multiple, comparable_deals)';

-- ================================================
-- TABLE 4: ma_acquirer_profiles
-- Potential acquiring companies
-- ================================================

CREATE TABLE IF NOT EXISTS ma_acquirer_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  prediction_id UUID NOT NULL REFERENCES ma_predictions(id) ON DELETE CASCADE,
  potential_acquirer_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Acquirer characteristics
  industry_match TEXT NOT NULL,
  size_ratio_description TEXT NOT NULL,
  geographic_proximity TEXT NOT NULL,
  strategic_rationale TEXT NOT NULL CHECK (strategic_rationale IN (
    'horizontal_integration',
    'vertical_integration',
    'technology_acquisition',
    'market_expansion',
    'talent_acquisition',
    'other'
  )),
  strategic_rationale_description TEXT NOT NULL,

  -- Matching scores
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),

  -- Ordering
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ma_acquirers_unique_rank UNIQUE(prediction_id, rank)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_acquirers_prediction ON ma_acquirer_profiles(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ma_acquirers_company ON ma_acquirer_profiles(potential_acquirer_id) WHERE potential_acquirer_id IS NOT NULL;

-- Comments
COMMENT ON TABLE ma_acquirer_profiles IS 'Potential acquirer company profiles for High/Very High likelihood targets';
COMMENT ON COLUMN ma_acquirer_profiles.match_score IS 'How well this acquirer profile matches (0-100)';

-- ================================================
-- TABLE 5: ma_historical_deals
-- Reference dataset of past M&A transactions
-- ================================================

CREATE TABLE IF NOT EXISTS ma_historical_deals (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deal parties
  target_company_name TEXT NOT NULL,
  target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  acquirer_company_name TEXT NOT NULL,
  acquirer_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Deal details
  deal_date DATE NOT NULL,
  deal_value_gbp BIGINT,
  deal_type TEXT CHECK (deal_type IN ('acquisition', 'merger', 'asset_purchase', 'other')),

  -- Target characteristics at acquisition
  target_sic_code TEXT,
  target_industry_description TEXT,
  target_employee_count_at_deal INTEGER,
  target_revenue_at_deal_gbp BIGINT,
  target_age_years INTEGER,

  -- Acquirer characteristics
  acquirer_sic_code TEXT,
  acquirer_industry_description TEXT,
  acquirer_size_category TEXT CHECK (acquirer_size_category IN ('SME', 'Mid-Market', 'Enterprise', 'PE_Firm')),

  -- Strategic context
  deal_rationale TEXT CHECK (deal_rationale IN (
    'horizontal_integration',
    'vertical_integration',
    'technology_acquisition',
    'market_expansion',
    'talent_acquisition',
    'distressed_acquisition',
    'other'
  )),
  deal_rationale_notes TEXT,

  -- Data sources
  data_source TEXT NOT NULL,
  source_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_deals_date ON ma_historical_deals(deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_ma_deals_target_sic ON ma_historical_deals(target_sic_code);
CREATE INDEX IF NOT EXISTS idx_ma_deals_acquirer_sic ON ma_historical_deals(acquirer_sic_code);
CREATE INDEX IF NOT EXISTS idx_ma_deals_verified ON ma_historical_deals(verified) WHERE verified = TRUE;

-- Comments
COMMENT ON TABLE ma_historical_deals IS 'Reference dataset of past UK/Ireland M&A transactions for pattern matching';
COMMENT ON COLUMN ma_historical_deals.verified IS 'Data quality flag - TRUE if manually verified';

-- ================================================
-- TABLE 6: ma_prediction_queue
-- Real-time recalculation job queue
-- ================================================

CREATE TABLE IF NOT EXISTS ma_prediction_queue (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Trigger details
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('data_update', 'manual_request', 'scheduled_batch')),
  trigger_metadata JSONB,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ma_queue_unique_pending UNIQUE(company_id, status) WHERE (status IN ('pending', 'processing'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_queue_status ON ma_prediction_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ma_queue_company ON ma_prediction_queue(company_id);

-- Comments
COMMENT ON TABLE ma_prediction_queue IS 'Queue for companies requiring M&A prediction recalculation';
COMMENT ON COLUMN ma_prediction_queue.trigger_type IS 'What triggered recalculation: data_update, manual_request, or scheduled_batch';

-- ================================================
-- TABLE 7: ma_prediction_audit_log
-- Immutable compliance audit trail
-- ================================================

CREATE TABLE IF NOT EXISTS ma_prediction_audit_log (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES ma_predictions(id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN ('view_prediction', 'export_pdf', 'export_excel', 'export_csv')),
  request_ip TEXT,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ma_audit_user ON ma_prediction_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ma_audit_company ON ma_prediction_audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ma_audit_created ON ma_prediction_audit_log(created_at DESC);

-- Comments
COMMENT ON TABLE ma_prediction_audit_log IS 'Immutable audit trail of all M&A prediction requests for compliance (FR-028)';
COMMENT ON COLUMN ma_prediction_audit_log.action_type IS 'Type of action performed: view, export_pdf, export_excel, export_csv';

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE ma_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_prediction_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_valuation_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_acquirer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_historical_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_prediction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_prediction_audit_log ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES: ma_predictions
-- ================================================

CREATE POLICY "ma_predictions_select_authenticated"
  ON ma_predictions FOR SELECT
  TO authenticated
  USING (TRUE); -- All authenticated users can view (FR-026)

CREATE POLICY "ma_predictions_insert_service"
  ON ma_predictions FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "ma_predictions_update_service"
  ON ma_predictions FOR UPDATE
  TO service_role
  USING (TRUE);

-- ================================================
-- RLS POLICIES: ma_prediction_factors
-- ================================================

CREATE POLICY "ma_factors_select_authenticated"
  ON ma_prediction_factors FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_factors_insert_service"
  ON ma_prediction_factors FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ================================================
-- RLS POLICIES: ma_valuation_estimates
-- ================================================

CREATE POLICY "ma_valuations_select_authenticated"
  ON ma_valuation_estimates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_valuations_insert_service"
  ON ma_valuation_estimates FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ================================================
-- RLS POLICIES: ma_acquirer_profiles
-- ================================================

CREATE POLICY "ma_acquirers_select_authenticated"
  ON ma_acquirer_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_acquirers_insert_service"
  ON ma_acquirer_profiles FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ================================================
-- RLS POLICIES: ma_historical_deals
-- ================================================

CREATE POLICY "ma_deals_select_authenticated"
  ON ma_historical_deals FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "ma_deals_insert_admin"
  ON ma_historical_deals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "ma_deals_insert_service"
  ON ma_historical_deals FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- ================================================
-- RLS POLICIES: ma_prediction_queue
-- ================================================

CREATE POLICY "ma_queue_select_service"
  ON ma_prediction_queue FOR SELECT
  TO service_role
  USING (TRUE);

CREATE POLICY "ma_queue_insert_service"
  ON ma_prediction_queue FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "ma_queue_update_service"
  ON ma_prediction_queue FOR UPDATE
  TO service_role
  USING (TRUE);

-- ================================================
-- RLS POLICIES: ma_prediction_audit_log
-- ================================================

CREATE POLICY "ma_audit_insert_service"
  ON ma_prediction_audit_log FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "ma_audit_select_own"
  ON ma_prediction_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ma_audit_select_admin"
  ON ma_prediction_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Prevent updates and deletes on audit log (immutable)
CREATE POLICY "ma_audit_no_update"
  ON ma_prediction_audit_log FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY "ma_audit_no_delete"
  ON ma_prediction_audit_log FOR DELETE
  TO authenticated
  USING (FALSE);

-- ================================================
-- DATABASE TRIGGER: Real-Time Recalculation
-- Automatically queue predictions when business data changes
-- ================================================

CREATE OR REPLACE FUNCTION trigger_ma_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger if financial/operational fields changed
  IF (OLD.revenue IS DISTINCT FROM NEW.revenue) OR
     (OLD.profitability IS DISTINCT FROM NEW.profitability) OR
     (OLD.employees IS DISTINCT FROM NEW.employees) THEN

    -- Insert job into prediction queue
    INSERT INTO ma_prediction_queue (company_id, trigger_type, trigger_metadata)
    VALUES (
      NEW.id,
      'data_update',
      jsonb_build_object(
        'updated_fields', ARRAY_REMOVE(ARRAY[
          CASE WHEN OLD.revenue IS DISTINCT FROM NEW.revenue THEN 'revenue' END,
          CASE WHEN OLD.profitability IS DISTINCT FROM NEW.profitability THEN 'profitability' END,
          CASE WHEN OLD.employees IS DISTINCT FROM NEW.employees THEN 'employees' END
        ], NULL)
      )
    )
    ON CONFLICT (company_id, status) WHERE (status IN ('pending', 'processing'))
    DO NOTHING; -- Avoid duplicate queued jobs
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to businesses table
DROP TRIGGER IF EXISTS businesses_update_trigger ON businesses;
CREATE TRIGGER businesses_update_trigger
  AFTER UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ma_recalculation();

-- Comments
COMMENT ON FUNCTION trigger_ma_recalculation() IS 'Automatically queue M&A prediction recalculation when company data changes (FR-009)';

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

-- Grant authenticated users read access
GRANT SELECT ON ma_predictions TO authenticated;
GRANT SELECT ON ma_prediction_factors TO authenticated;
GRANT SELECT ON ma_valuation_estimates TO authenticated;
GRANT SELECT ON ma_acquirer_profiles TO authenticated;
GRANT SELECT ON ma_historical_deals TO authenticated;
GRANT SELECT ON ma_prediction_audit_log TO authenticated;

-- Grant service role full access
GRANT ALL ON ma_predictions TO service_role;
GRANT ALL ON ma_prediction_factors TO service_role;
GRANT ALL ON ma_valuation_estimates TO service_role;
GRANT ALL ON ma_acquirer_profiles TO service_role;
GRANT ALL ON ma_historical_deals TO service_role;
GRANT ALL ON ma_prediction_queue TO service_role;
GRANT ALL ON ma_prediction_audit_log TO service_role;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Verify tables created
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE 'ma_%';

  IF table_count < 7 THEN
    RAISE EXCEPTION 'Migration incomplete: Expected 7 tables, found %', table_count;
  ELSE
    RAISE NOTICE '✅ Migration complete: % M&A prediction tables created', table_count;
  END IF;
END $$;
