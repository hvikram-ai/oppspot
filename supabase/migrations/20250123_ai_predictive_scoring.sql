-- AI-Powered Predictive Lead Scoring System
-- Enhanced scoring with deal probability, timing predictions, and ML insights

-- 1. AI Lead Scores table with predictive analytics
CREATE TABLE IF NOT EXISTS ai_lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),

  -- Core Scoring
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  previous_score INTEGER,
  score_trend VARCHAR(20) CHECK (score_trend IN ('improving', 'stable', 'declining', 'volatile')),

  -- AI Predictions
  deal_probability DECIMAL(5, 2) CHECK (deal_probability BETWEEN 0 AND 100),
  conversion_likelihood VARCHAR(20) CHECK (conversion_likelihood IN ('very_high', 'high', 'medium', 'low', 'very_low')),
  optimal_engagement_timing VARCHAR(50) CHECK (optimal_engagement_timing IN (
    'immediate', 'within_24h', 'within_week', '1_3_months', '3_6_months', '6_12_months', 'not_ready'
  )),
  estimated_deal_size DECIMAL(12, 2),
  estimated_close_date DATE,

  -- Component Scores
  buying_signals_score INTEGER CHECK (buying_signals_score BETWEEN 0 AND 100),
  financial_health_score INTEGER CHECK (financial_health_score BETWEEN 0 AND 100),
  technology_fit_score INTEGER CHECK (technology_fit_score BETWEEN 0 AND 100),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  stakeholder_score INTEGER CHECK (stakeholder_score BETWEEN 0 AND 100),
  market_timing_score INTEGER CHECK (market_timing_score BETWEEN 0 AND 100),

  -- AI Insights
  key_strengths TEXT[],
  risk_factors TEXT[],
  recommended_actions JSONB DEFAULT '[]',
  competitive_position VARCHAR(50) CHECK (competitive_position IN (
    'sole_vendor', 'preferred', 'competing', 'outsider', 'unknown'
  )),

  -- Success Predictors
  success_indicators JSONB DEFAULT '[]',
  failure_warnings JSONB DEFAULT '[]',
  critical_requirements_met BOOLEAN DEFAULT false,

  -- Model Metadata
  model_version VARCHAR(20) DEFAULT 'v2.0',
  model_confidence DECIMAL(5, 2) CHECK (model_confidence BETWEEN 0 AND 100),
  data_completeness DECIMAL(5, 2) CHECK (data_completeness BETWEEN 0 AND 100),
  scoring_method VARCHAR(50) DEFAULT 'hybrid_ai_ml',

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  next_calculation TIMESTAMPTZ,

  UNIQUE(company_id, org_id)
);

-- 2. AI Scoring History for trend analysis
CREATE TABLE IF NOT EXISTS ai_scoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_id UUID REFERENCES ai_lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Historical scores
  overall_score INTEGER,
  deal_probability DECIMAL(5, 2),
  component_scores JSONB,

  -- What changed
  score_change INTEGER,
  change_reason TEXT,
  significant_events TEXT[],

  -- Snapshot timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Scoring Factors - What influences the score
CREATE TABLE IF NOT EXISTS ai_scoring_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_id UUID REFERENCES ai_lead_scores(id) ON DELETE CASCADE,

  -- Factor details
  factor_category VARCHAR(50) CHECK (factor_category IN (
    'buying_signal', 'financial', 'engagement', 'competitive',
    'market', 'technology', 'stakeholder', 'timing'
  )),
  factor_name VARCHAR(255) NOT NULL,
  factor_value DECIMAL(10, 2),
  factor_weight DECIMAL(3, 2) CHECK (factor_weight BETWEEN 0 AND 1),
  impact_on_score INTEGER CHECK (impact_on_score BETWEEN -100 AND 100),

  -- Explanation
  explanation TEXT,
  data_source VARCHAR(100),
  confidence_level DECIMAL(3, 2) CHECK (confidence_level BETWEEN 0 AND 1),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Predictive Patterns - ML learned patterns
CREATE TABLE IF NOT EXISTS predictive_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type VARCHAR(50) CHECK (pattern_type IN (
    'conversion', 'churn', 'expansion', 'timing', 'competitive_win'
  )),

  -- Pattern definition
  pattern_name VARCHAR(255) NOT NULL,
  pattern_conditions JSONB NOT NULL,
  pattern_outcome VARCHAR(100),

  -- Statistics
  occurrence_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),
  confidence_level DECIMAL(5, 2),

  -- Applicability
  industry_codes TEXT[],
  company_size_range INT4RANGE,
  geographic_regions TEXT[],

  -- Metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- 5. Engagement Recommendations
CREATE TABLE IF NOT EXISTS ai_engagement_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_id UUID REFERENCES ai_lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Recommendation details
  recommendation_type VARCHAR(50) CHECK (recommendation_type IN (
    'outreach', 'content', 'demo', 'proposal', 'nurture',
    'event', 'referral', 'executive_engagement', 'technical_validation'
  )),
  priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Action details
  recommended_action TEXT NOT NULL,
  action_reason TEXT,
  expected_impact VARCHAR(100),
  success_probability DECIMAL(5, 2),

  -- Timing
  recommended_date DATE,
  expiry_date DATE,
  is_time_sensitive BOOLEAN DEFAULT false,

  -- Personalization
  personalization_factors JSONB DEFAULT '{}',
  suggested_message_points TEXT[],
  avoid_topics TEXT[],

  -- Status
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'expired')) DEFAULT 'pending',
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES auth.users(id),
  outcome TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Score Thresholds and Rules
CREATE TABLE IF NOT EXISTS ai_scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),

  -- Rule definition
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) CHECK (rule_type IN (
    'threshold', 'combination', 'pattern', 'override', 'boost', 'penalty'
  )),
  rule_conditions JSONB NOT NULL,
  rule_action JSONB NOT NULL,

  -- Applicability
  applies_to VARCHAR(50) CHECK (applies_to IN ('all', 'industry', 'segment', 'custom')),
  filter_criteria JSONB DEFAULT '{}',

  -- Configuration
  weight_adjustment DECIMAL(3, 2),
  score_adjustment INTEGER,
  priority INTEGER DEFAULT 100,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 7. Model Performance Tracking
CREATE TABLE IF NOT EXISTS ai_model_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Model identification
  model_version VARCHAR(20),
  model_type VARCHAR(50),

  -- Performance metrics
  accuracy DECIMAL(5, 2),
  precision_score DECIMAL(5, 2),
  recall_score DECIMAL(5, 2),
  f1_score DECIMAL(5, 2),

  -- Business metrics
  conversion_rate_improvement DECIMAL(5, 2),
  false_positive_rate DECIMAL(5, 2),
  false_negative_rate DECIMAL(5, 2),

  -- Sample data
  total_predictions INTEGER,
  correct_predictions INTEGER,
  evaluation_period TSTZRANGE,

  -- Metadata
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_ai_scores_company ON ai_lead_scores(company_id);
CREATE INDEX idx_ai_scores_deal_probability ON ai_lead_scores(deal_probability DESC);
CREATE INDEX idx_ai_scores_overall ON ai_lead_scores(overall_score DESC);
CREATE INDEX idx_ai_scores_timing ON ai_lead_scores(optimal_engagement_timing);
CREATE INDEX idx_ai_scores_updated ON ai_lead_scores(updated_at DESC);

CREATE INDEX idx_scoring_history_company ON ai_scoring_history(company_id, recorded_at DESC);
CREATE INDEX idx_scoring_factors_score ON ai_scoring_factors(score_id);
CREATE INDEX idx_recommendations_company ON ai_engagement_recommendations(company_id, priority);
CREATE INDEX idx_recommendations_status ON ai_engagement_recommendations(status, recommended_date);

-- Enable Row Level Security
ALTER TABLE ai_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scoring_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_engagement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scoring_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view AI scores in their organization"
  ON ai_lead_scores FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage AI scores in their organization"
  ON ai_lead_scores FOR ALL
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables
CREATE POLICY "Users can view scoring history in their organization"
  ON ai_scoring_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM ai_lead_scores
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view recommendations in their organization"
  ON ai_engagement_recommendations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM ai_lead_scores
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage recommendations in their organization"
  ON ai_engagement_recommendations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM ai_lead_scores
      WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Create a view for easy access to current scores with company details
CREATE OR REPLACE VIEW ai_lead_scores_dashboard AS
SELECT
  s.*,
  b.name as company_name,
  b.website,
  b.employee_count_min,
  b.employee_count_max,
  b.city,
  b.country,
  COUNT(DISTINCT bs.id) as active_buying_signals,
  COUNT(DISTINCT st.id) as tracked_stakeholders,
  MAX(bs.detected_at) as latest_signal_date
FROM ai_lead_scores s
JOIN businesses b ON s.company_id = b.id
LEFT JOIN buying_signals bs ON b.id = bs.company_id
  AND bs.detected_at > NOW() - INTERVAL '30 days'
  AND bs.signal_strength >= 70
LEFT JOIN stakeholders st ON b.id = st.company_id
GROUP BY s.id, b.id;

-- Function to trigger score recalculation
CREATE OR REPLACE FUNCTION trigger_ai_score_recalculation(
  p_company_id UUID,
  p_reason TEXT DEFAULT 'manual_trigger'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Mark for recalculation
  UPDATE ai_lead_scores
  SET next_calculation = NOW()
  WHERE company_id = p_company_id;

  -- Log the trigger
  INSERT INTO ai_scoring_history (
    score_id,
    company_id,
    change_reason,
    recorded_at
  )
  SELECT
    id,
    company_id,
    p_reason,
    NOW()
  FROM ai_lead_scores
  WHERE company_id = p_company_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_ai_score_recalculation TO authenticated;

COMMENT ON TABLE ai_lead_scores IS 'AI-powered predictive lead scoring with deal probability and timing recommendations';
COMMENT ON TABLE ai_engagement_recommendations IS 'Personalized AI-generated engagement recommendations for each lead';