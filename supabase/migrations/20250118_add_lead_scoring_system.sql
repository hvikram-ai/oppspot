-- Migration: Add AI-Powered Lead Scoring System
-- Description: Create tables for intelligent lead scoring and qualification
-- Author: Claude Code AI Assistant
-- Date: 2025-01-18

-- Create lead_scores table for storing company scoring data
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  company_number TEXT, -- Companies House reference
  company_name TEXT NOT NULL,

  -- Individual score components (0-100 scale)
  overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
  financial_health_score INTEGER DEFAULT 0 CHECK (financial_health_score >= 0 AND financial_health_score <= 100),
  technology_fit_score INTEGER DEFAULT 0 CHECK (technology_fit_score >= 0 AND technology_fit_score <= 100),
  industry_alignment_score INTEGER DEFAULT 0 CHECK (industry_alignment_score >= 0 AND industry_alignment_score <= 100),
  growth_indicator_score INTEGER DEFAULT 0 CHECK (growth_indicator_score >= 0 AND growth_indicator_score <= 100),
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),

  -- Detailed breakdown and metadata
  score_breakdown JSONB DEFAULT '{}',
  confidence_level TEXT DEFAULT 'low' CHECK (confidence_level IN ('high', 'medium', 'low')),
  scoring_metadata JSONB DEFAULT '{}',

  -- Scoring factors and explanations
  financial_factors JSONB DEFAULT '{}',
  technology_factors JSONB DEFAULT '{}',
  industry_factors JSONB DEFAULT '{}',
  growth_factors JSONB DEFAULT '{}',
  engagement_factors JSONB DEFAULT '{}',

  -- Timestamps
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT unique_company_score UNIQUE(company_id),
  INDEX idx_lead_scores_company_number (company_number),
  INDEX idx_lead_scores_overall_score (overall_score DESC),
  INDEX idx_lead_scores_last_calculated (last_calculated_at DESC)
);

-- Create scoring_criteria table for customizable scoring rules
CREATE TABLE IF NOT EXISTS scoring_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('financial', 'technology', 'industry', 'growth', 'engagement')),

  -- Scoring configuration
  weight DECIMAL(3,2) DEFAULT 0.20 CHECK (weight >= 0 AND weight <= 1),
  thresholds JSONB DEFAULT '{}', -- {"excellent": 90, "good": 70, "average": 50, "poor": 30}
  custom_rules JSONB DEFAULT '{}',
  scoring_formula TEXT, -- Optional custom scoring formula

  -- Specific criteria settings
  data_sources TEXT[] DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  optional_fields TEXT[] DEFAULT '{}',

  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique criteria per org and type
  CONSTRAINT unique_org_criteria UNIQUE(org_id, criteria_name),
  INDEX idx_scoring_criteria_org (org_id),
  INDEX idx_scoring_criteria_type (criteria_type)
);

-- Create engagement_events table for tracking company interactions
CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  company_number TEXT,
  user_id UUID REFERENCES auth.users(id),

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'email_open', 'email_click', 'email_reply',
    'page_view', 'document_download', 'form_submit',
    'meeting_scheduled', 'meeting_attended', 'meeting_cancelled',
    'phone_call', 'linkedin_interaction', 'demo_request',
    'proposal_sent', 'proposal_viewed', 'contract_sent'
  )),
  event_data JSONB DEFAULT '{}',
  event_source TEXT, -- 'email', 'web', 'crm', 'manual'

  -- Scoring impact
  engagement_score_impact INTEGER DEFAULT 0,
  engagement_weight DECIMAL(3,2) DEFAULT 1.0,

  -- Session tracking
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for analytics
  INDEX idx_engagement_company (company_id),
  INDEX idx_engagement_type (event_type),
  INDEX idx_engagement_created (created_at DESC),
  INDEX idx_engagement_session (session_id)
);

-- Create scoring_history table for tracking score changes over time
CREATE TABLE IF NOT EXISTS scoring_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_score_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Historical scores
  overall_score INTEGER,
  financial_health_score INTEGER,
  technology_fit_score INTEGER,
  industry_alignment_score INTEGER,
  growth_indicator_score INTEGER,
  engagement_score INTEGER,

  -- Change tracking
  score_change INTEGER, -- Difference from previous score
  change_reason TEXT,
  triggered_by TEXT, -- 'manual', 'scheduled', 'event', 'data_update'

  -- Snapshot data
  snapshot_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_scoring_history_lead (lead_score_id),
  INDEX idx_scoring_history_created (created_at DESC)
);

-- Create scoring_alerts table for threshold-based notifications
CREATE TABLE IF NOT EXISTS scoring_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  alert_name TEXT NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('threshold_crossed', 'score_increased', 'score_decreased', 'high_engagement', 'buying_signal')),

  -- Alert configuration
  is_active BOOLEAN DEFAULT true,
  criteria JSONB NOT NULL, -- {"score_type": "overall", "operator": ">=", "value": 80}
  notification_channels TEXT[] DEFAULT '{"email"}',
  recipients UUID[] DEFAULT '{}', -- User IDs to notify

  -- Alert metadata
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_scoring_alerts_org (org_id),
  INDEX idx_scoring_alerts_active (is_active)
);

-- Create financial_metrics table for storing extracted financial data
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  company_number TEXT,

  -- Key financial indicators
  revenue BIGINT,
  revenue_growth_rate DECIMAL(10,2),
  ebitda BIGINT,
  ebitda_margin DECIMAL(10,2),
  net_income BIGINT,
  total_assets BIGINT,
  total_liabilities BIGINT,
  current_ratio DECIMAL(10,2),
  debt_to_equity_ratio DECIMAL(10,2),
  return_on_assets DECIMAL(10,2),
  return_on_equity DECIMAL(10,2),

  -- Additional metrics
  employee_count INTEGER,
  employee_growth_rate DECIMAL(10,2),
  cash_flow BIGINT,
  working_capital BIGINT,

  -- Period information
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  reporting_date DATE,

  -- Data source and quality
  data_source TEXT, -- 'companies_house', 'manual', 'third_party'
  data_quality_score INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_company_period UNIQUE(company_id, fiscal_year, fiscal_quarter),
  INDEX idx_financial_metrics_company (company_id),
  INDEX idx_financial_metrics_number (company_number)
);

-- Create default scoring criteria for new organizations
CREATE OR REPLACE FUNCTION create_default_scoring_criteria()
RETURNS TRIGGER AS $$
BEGIN
  -- Financial Health Criteria
  INSERT INTO scoring_criteria (
    org_id, criteria_name, criteria_type, weight, thresholds, data_sources
  ) VALUES (
    NEW.id,
    'Financial Health',
    'financial',
    0.30,
    '{"excellent": 90, "good": 70, "average": 50, "poor": 30}'::jsonb,
    ARRAY['companies_house', 'financial_statements']
  );

  -- Technology Fit Criteria
  INSERT INTO scoring_criteria (
    org_id, criteria_name, criteria_type, weight, thresholds, data_sources
  ) VALUES (
    NEW.id,
    'Technology Fit',
    'technology',
    0.20,
    '{"excellent": 90, "good": 70, "average": 50, "poor": 30}'::jsonb,
    ARRAY['website_analysis', 'tech_stack_detection']
  );

  -- Industry Alignment Criteria
  INSERT INTO scoring_criteria (
    org_id, criteria_name, criteria_type, weight, thresholds, data_sources
  ) VALUES (
    NEW.id,
    'Industry Alignment',
    'industry',
    0.20,
    '{"excellent": 90, "good": 70, "average": 50, "poor": 30}'::jsonb,
    ARRAY['sic_codes', 'industry_classification']
  );

  -- Growth Indicators Criteria
  INSERT INTO scoring_criteria (
    org_id, criteria_name, criteria_type, weight, thresholds, data_sources
  ) VALUES (
    NEW.id,
    'Growth Indicators',
    'growth',
    0.20,
    '{"excellent": 90, "good": 70, "average": 50, "poor": 30}'::jsonb,
    ARRAY['job_postings', 'news_mentions', 'funding_events']
  );

  -- Engagement Level Criteria
  INSERT INTO scoring_criteria (
    org_id, criteria_name, criteria_type, weight, thresholds, data_sources
  ) VALUES (
    NEW.id,
    'Engagement Level',
    'engagement',
    0.10,
    '{"excellent": 90, "good": 70, "average": 50, "poor": 30}'::jsonb,
    ARRAY['email_tracking', 'website_visits', 'meeting_history']
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default scoring criteria
CREATE TRIGGER create_default_scoring_criteria_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_scoring_criteria();

-- Function to calculate overall score based on weighted components
CREATE OR REPLACE FUNCTION calculate_overall_lead_score(
  p_financial_score INTEGER,
  p_technology_score INTEGER,
  p_industry_score INTEGER,
  p_growth_score INTEGER,
  p_engagement_score INTEGER,
  p_org_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_weights RECORD;
  v_overall_score DECIMAL;
BEGIN
  -- Get custom weights for organization or use defaults
  IF p_org_id IS NOT NULL THEN
    SELECT
      COALESCE(MAX(CASE WHEN criteria_type = 'financial' THEN weight END), 0.30) as financial_weight,
      COALESCE(MAX(CASE WHEN criteria_type = 'technology' THEN weight END), 0.20) as technology_weight,
      COALESCE(MAX(CASE WHEN criteria_type = 'industry' THEN weight END), 0.20) as industry_weight,
      COALESCE(MAX(CASE WHEN criteria_type = 'growth' THEN weight END), 0.20) as growth_weight,
      COALESCE(MAX(CASE WHEN criteria_type = 'engagement' THEN weight END), 0.10) as engagement_weight
    INTO v_weights
    FROM scoring_criteria
    WHERE org_id = p_org_id AND is_active = true;
  ELSE
    -- Use default weights
    v_weights := ROW(0.30, 0.20, 0.20, 0.20, 0.10);
  END IF;

  -- Calculate weighted overall score
  v_overall_score :=
    (p_financial_score * v_weights.financial_weight) +
    (p_technology_score * v_weights.technology_weight) +
    (p_industry_score * v_weights.industry_weight) +
    (p_growth_score * v_weights.growth_weight) +
    (p_engagement_score * v_weights.engagement_weight);

  RETURN ROUND(v_overall_score)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to track score changes
CREATE OR REPLACE FUNCTION track_score_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if score actually changed
  IF OLD.overall_score != NEW.overall_score THEN
    INSERT INTO scoring_history (
      lead_score_id,
      company_id,
      overall_score,
      financial_health_score,
      technology_fit_score,
      industry_alignment_score,
      growth_indicator_score,
      engagement_score,
      score_change,
      change_reason,
      triggered_by,
      snapshot_data
    ) VALUES (
      NEW.id,
      NEW.company_id,
      NEW.overall_score,
      NEW.financial_health_score,
      NEW.technology_fit_score,
      NEW.industry_alignment_score,
      NEW.growth_indicator_score,
      NEW.engagement_score,
      NEW.overall_score - OLD.overall_score,
      'Score recalculation',
      'system',
      jsonb_build_object(
        'old_score', OLD.overall_score,
        'new_score', NEW.overall_score,
        'factors', NEW.score_breakdown
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for score tracking
CREATE TRIGGER track_lead_score_changes
  AFTER UPDATE ON lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION track_score_change();

-- Create RLS policies for lead scoring tables
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for lead_scores
CREATE POLICY "Users can view all lead scores" ON lead_scores
  FOR SELECT USING (true);

CREATE POLICY "Users can insert lead scores" ON lead_scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update lead scores" ON lead_scores
  FOR UPDATE USING (true);

-- Policies for scoring_criteria (org-specific)
CREATE POLICY "Users can view their org's criteria" ON scoring_criteria
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their org's criteria" ON scoring_criteria
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policies for engagement_events
CREATE POLICY "Users can view all engagement events" ON engagement_events
  FOR SELECT USING (true);

CREATE POLICY "Users can create engagement events" ON engagement_events
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_lead_scores_high_scorers ON lead_scores(overall_score DESC) WHERE overall_score >= 70;
CREATE INDEX idx_engagement_recent ON engagement_events(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';
CREATE INDEX idx_financial_metrics_recent ON financial_metrics(company_id, fiscal_year DESC, fiscal_quarter DESC);

-- Add comments for documentation
COMMENT ON TABLE lead_scores IS 'Stores AI-powered lead scoring data for companies';
COMMENT ON TABLE scoring_criteria IS 'Customizable scoring criteria and weights per organization';
COMMENT ON TABLE engagement_events IS 'Tracks all engagement activities with companies';
COMMENT ON TABLE scoring_history IS 'Historical record of score changes over time';
COMMENT ON TABLE scoring_alerts IS 'Alert configurations for score-based notifications';
COMMENT ON TABLE financial_metrics IS 'Extracted and calculated financial metrics for scoring';

COMMENT ON COLUMN lead_scores.overall_score IS 'Weighted average of all component scores (0-100)';
COMMENT ON COLUMN lead_scores.confidence_level IS 'Confidence in score accuracy based on data completeness';
COMMENT ON COLUMN scoring_criteria.weight IS 'Weight factor for this criteria in overall score calculation';
COMMENT ON COLUMN engagement_events.engagement_score_impact IS 'Points added to engagement score for this event';