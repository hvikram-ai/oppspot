-- ============================================
-- TimeTravel™ Predictive Intelligence System
-- Predict buying intent 30-90 days before active search
-- FIXED VERSION: Handles missing dependencies
-- ============================================

-- 1. Predictive Scores Table
CREATE TABLE IF NOT EXISTS predictive_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID, -- Made nullable to avoid org dependency

  -- Core Prediction
  buying_probability DECIMAL(5,2) NOT NULL CHECK (buying_probability >= 0 AND buying_probability <= 100),
  predicted_timeline_days INTEGER NOT NULL, -- 30, 60, 90
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),

  -- Signal Analysis
  signal_count_30d INTEGER DEFAULT 0,
  signal_count_60d INTEGER DEFAULT 0,
  signal_count_90d INTEGER DEFAULT 0,
  signal_velocity DECIMAL(5,2), -- Rate of signal acceleration
  strongest_signals TEXT[], -- Array of signal types

  -- Feature Data
  features_used JSONB NOT NULL DEFAULT '{}',
  composite_signals TEXT[], -- Combined patterns (e.g., 'funding_hiring')

  -- Model Metadata
  model_version TEXT NOT NULL DEFAULT '1.0.0',
  model_type TEXT NOT NULL DEFAULT 'rule_based', -- 'rule_based', 'ml', 'hybrid'
  model_confidence DECIMAL(5,2), -- Model's confidence in prediction

  -- Recommendations
  recommended_actions TEXT[],
  priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),

  -- Outcome Tracking (for model improvement)
  actual_purchase_date TIMESTAMPTZ,
  actual_timeline_days INTEGER,
  prediction_accurate BOOLEAN,
  accuracy_score DECIMAL(5,2), -- How accurate was the prediction?

  -- Timestamps
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Predictions have a shelf life
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint to prevent duplicate predictions
  UNIQUE(company_id, org_id)
);

-- 2. Prediction History Table (Track changes over time)
CREATE TABLE IF NOT EXISTS prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictive_scores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Snapshot of prediction at this point
  buying_probability DECIMAL(5,2) NOT NULL,
  predicted_timeline_days INTEGER NOT NULL,
  confidence_level TEXT NOT NULL,
  signal_count INTEGER DEFAULT 0,

  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'initial',
    'signal_increase',
    'signal_decrease',
    'probability_increase',
    'probability_decrease',
    'timeline_adjusted',
    'confidence_change',
    'outcome_recorded'
  )),
  change_reason TEXT,
  changed_features JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Signal Aggregates (Pre-computed for performance)
CREATE TABLE IF NOT EXISTS signal_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Time windows
  signals_7d INTEGER DEFAULT 0,
  signals_30d INTEGER DEFAULT 0,
  signals_60d INTEGER DEFAULT 0,
  signals_90d INTEGER DEFAULT 0,

  -- Signal breakdown by type
  funding_signals INTEGER DEFAULT 0,
  hiring_signals INTEGER DEFAULT 0,
  technology_signals INTEGER DEFAULT 0,
  expansion_signals INTEGER DEFAULT 0,
  executive_signals INTEGER DEFAULT 0,
  financial_signals INTEGER DEFAULT 0,

  -- Velocity metrics
  signal_velocity_7d DECIMAL(5,2),
  signal_velocity_30d DECIMAL(5,2),
  signal_momentum TEXT CHECK (signal_momentum IN ('accelerating', 'stable', 'decelerating')),

  -- Composite patterns
  has_funding_hiring_combo BOOLEAN DEFAULT FALSE,
  has_expansion_tech_combo BOOLEAN DEFAULT FALSE,

  -- Last updated
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id)
);

-- 4. Prediction Alerts (High-priority predictions)
CREATE TABLE IF NOT EXISTS prediction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictive_scores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID, -- Made nullable

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'high_probability',
    'sudden_increase',
    'timeline_shortened',
    'composite_signal'
  )),
  alert_priority TEXT NOT NULL CHECK (alert_priority IN ('critical', 'high', 'medium')),
  alert_message TEXT NOT NULL,

  -- Status
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID, -- Removed FK constraint
  actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMPTZ,
  action_taken TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_predictive_scores_company ON predictive_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_predictive_scores_org ON predictive_scores(org_id, prediction_date DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_predictive_scores_probability ON predictive_scores(buying_probability DESC);
CREATE INDEX IF NOT EXISTS idx_predictive_scores_timeline ON predictive_scores(predicted_timeline_days);
CREATE INDEX IF NOT EXISTS idx_predictive_scores_priority ON predictive_scores(priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_history_prediction ON prediction_history(prediction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_history_company ON prediction_history(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signal_aggregates_company ON signal_aggregates(company_id);
CREATE INDEX IF NOT EXISTS idx_signal_aggregates_velocity ON signal_aggregates(signal_velocity_30d DESC) WHERE signal_velocity_30d IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_alerts_org ON prediction_alerts(org_id, created_at DESC) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prediction_alerts_priority ON prediction_alerts(alert_priority, dismissed);

-- 6. Enable Row Level Security
ALTER TABLE predictive_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_alerts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Simplified to avoid dependencies)

-- Predictive Scores - Allow all authenticated users for now
DROP POLICY IF EXISTS "Users view their org's predictions" ON predictive_scores;
CREATE POLICY "Users view predictions" ON predictive_scores
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System creates predictions" ON predictive_scores;
CREATE POLICY "System creates predictions" ON predictive_scores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System updates predictions" ON predictive_scores;
CREATE POLICY "System updates predictions" ON predictive_scores
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Prediction History
DROP POLICY IF EXISTS "Users view their org's prediction history" ON prediction_history;
CREATE POLICY "Users view prediction history" ON prediction_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System creates history" ON prediction_history;
CREATE POLICY "System creates history" ON prediction_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Signal Aggregates
DROP POLICY IF EXISTS "Users view signal aggregates" ON signal_aggregates;
CREATE POLICY "Users view signal aggregates" ON signal_aggregates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System manages aggregates" ON signal_aggregates;
CREATE POLICY "System manages aggregates" ON signal_aggregates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Prediction Alerts
DROP POLICY IF EXISTS "Users view their org's alerts" ON prediction_alerts;
CREATE POLICY "Users view alerts" ON prediction_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users dismiss alerts" ON prediction_alerts;
CREATE POLICY "Users dismiss alerts" ON prediction_alerts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System creates alerts" ON prediction_alerts;
CREATE POLICY "System creates alerts" ON prediction_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Create function to update prediction history
CREATE OR REPLACE FUNCTION log_prediction_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if significant change
  IF (TG_OP = 'UPDATE' AND (
    OLD.buying_probability IS DISTINCT FROM NEW.buying_probability OR
    OLD.predicted_timeline_days IS DISTINCT FROM NEW.predicted_timeline_days OR
    OLD.confidence_level IS DISTINCT FROM NEW.confidence_level
  )) THEN
    INSERT INTO prediction_history (
      prediction_id,
      company_id,
      buying_probability,
      predicted_timeline_days,
      confidence_level,
      signal_count,
      change_type,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.company_id,
      NEW.buying_probability,
      NEW.predicted_timeline_days,
      NEW.confidence_level,
      NEW.signal_count_30d,
      CASE
        WHEN NEW.buying_probability > OLD.buying_probability THEN 'probability_increase'
        WHEN NEW.buying_probability < OLD.buying_probability THEN 'probability_decrease'
        WHEN NEW.predicted_timeline_days < OLD.predicted_timeline_days THEN 'timeline_adjusted'
        ELSE 'confidence_change'
      END,
      'Automatic update'
    );
  END IF;

  -- Log initial prediction
  IF TG_OP = 'INSERT' THEN
    INSERT INTO prediction_history (
      prediction_id,
      company_id,
      buying_probability,
      predicted_timeline_days,
      confidence_level,
      signal_count,
      change_type,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.company_id,
      NEW.buying_probability,
      NEW.predicted_timeline_days,
      NEW.confidence_level,
      NEW.signal_count_30d,
      'initial',
      'Initial prediction'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger for prediction history (drop first if exists)
DROP TRIGGER IF EXISTS trigger_log_prediction_change ON predictive_scores;
CREATE TRIGGER trigger_log_prediction_change
  AFTER INSERT OR UPDATE ON predictive_scores
  FOR EACH ROW
  EXECUTE FUNCTION log_prediction_change();

-- 10. Create function to refresh signal aggregates (handles missing buying_signals table)
CREATE OR REPLACE FUNCTION refresh_signal_aggregates(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_signals_7d INTEGER := 0;
  v_signals_30d INTEGER := 0;
  v_signals_60d INTEGER := 0;
  v_signals_90d INTEGER := 0;
  v_funding INTEGER := 0;
  v_hiring INTEGER := 0;
  v_technology INTEGER := 0;
  v_expansion INTEGER := 0;
  v_executive INTEGER := 0;
  v_financial INTEGER := 0;
  v_table_exists BOOLEAN;
BEGIN
  -- Check if buying_signals table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'buying_signals'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    -- Count signals in time windows
    SELECT COUNT(*) INTO v_signals_7d
    FROM buying_signals
    WHERE company_id = p_company_id
      AND detected_at >= NOW() - INTERVAL '7 days';

    SELECT COUNT(*) INTO v_signals_30d
    FROM buying_signals
    WHERE company_id = p_company_id
      AND detected_at >= NOW() - INTERVAL '30 days';

    SELECT COUNT(*) INTO v_signals_60d
    FROM buying_signals
    WHERE company_id = p_company_id
      AND detected_at >= NOW() - INTERVAL '60 days';

    SELECT COUNT(*) INTO v_signals_90d
    FROM buying_signals
    WHERE company_id = p_company_id
      AND detected_at >= NOW() - INTERVAL '90 days';

    -- Count by type
    SELECT
      COUNT(*) FILTER (WHERE signal_type LIKE '%fund%') AS funding,
      COUNT(*) FILTER (WHERE signal_type LIKE '%job%' OR signal_type LIKE '%hire%') AS hiring,
      COUNT(*) FILTER (WHERE signal_type LIKE '%tech%') AS technology,
      COUNT(*) FILTER (WHERE signal_type LIKE '%expan%' OR signal_type LIKE '%office%') AS expansion,
      COUNT(*) FILTER (WHERE signal_type LIKE '%executive%' OR signal_type LIKE '%ceo%' OR signal_type LIKE '%cto%') AS executive,
      COUNT(*) FILTER (WHERE signal_type LIKE '%revenue%' OR signal_type LIKE '%financial%') AS financial
    INTO v_funding, v_hiring, v_technology, v_expansion, v_executive, v_financial
    FROM buying_signals
    WHERE company_id = p_company_id
      AND detected_at >= NOW() - INTERVAL '90 days';
  END IF;

  -- Upsert aggregate (works even if no buying_signals exist)
  INSERT INTO signal_aggregates (
    company_id,
    signals_7d,
    signals_30d,
    signals_60d,
    signals_90d,
    funding_signals,
    hiring_signals,
    technology_signals,
    expansion_signals,
    executive_signals,
    financial_signals,
    signal_velocity_7d,
    signal_velocity_30d,
    signal_momentum,
    has_funding_hiring_combo,
    has_expansion_tech_combo,
    last_calculated
  ) VALUES (
    p_company_id,
    v_signals_7d,
    v_signals_30d,
    v_signals_60d,
    v_signals_90d,
    v_funding,
    v_hiring,
    v_technology,
    v_expansion,
    v_executive,
    v_financial,
    CASE WHEN v_signals_30d > 0 THEN v_signals_7d::DECIMAL / v_signals_30d ELSE 0 END,
    CASE WHEN v_signals_60d > 0 THEN v_signals_30d::DECIMAL / v_signals_60d ELSE 0 END,
    CASE
      WHEN v_signals_7d > v_signals_30d * 0.3 THEN 'accelerating'
      WHEN v_signals_7d < v_signals_30d * 0.1 THEN 'decelerating'
      ELSE 'stable'
    END,
    v_funding > 0 AND v_hiring > 0,
    v_expansion > 0 AND v_technology > 0,
    NOW()
  )
  ON CONFLICT (company_id) DO UPDATE SET
    signals_7d = EXCLUDED.signals_7d,
    signals_30d = EXCLUDED.signals_30d,
    signals_60d = EXCLUDED.signals_60d,
    signals_90d = EXCLUDED.signals_90d,
    funding_signals = EXCLUDED.funding_signals,
    hiring_signals = EXCLUDED.hiring_signals,
    technology_signals = EXCLUDED.technology_signals,
    expansion_signals = EXCLUDED.expansion_signals,
    executive_signals = EXCLUDED.executive_signals,
    financial_signals = EXCLUDED.financial_signals,
    signal_velocity_7d = EXCLUDED.signal_velocity_7d,
    signal_velocity_30d = EXCLUDED.signal_velocity_30d,
    signal_momentum = EXCLUDED.signal_momentum,
    has_funding_hiring_combo = EXCLUDED.has_funding_hiring_combo,
    has_expansion_tech_combo = EXCLUDED.has_expansion_tech_combo,
    last_calculated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT SELECT ON predictive_scores TO authenticated;
GRANT SELECT ON prediction_history TO authenticated;
GRANT SELECT ON signal_aggregates TO authenticated;
GRANT SELECT, UPDATE ON prediction_alerts TO authenticated;

-- Done!
