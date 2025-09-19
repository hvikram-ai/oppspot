-- QUALIFICATION WORKFLOWS DATABASE SCHEMA (FIXED)
-- This migration creates all tables needed for the advanced qualification workflow system
-- Fixed version that doesn't depend on non-existent lead_scores table

-- First create lead_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  score_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BANT Qualification Scores
CREATE TABLE IF NOT EXISTS bant_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- BANT Scores (0-100 scale)
  budget_score INTEGER CHECK (budget_score >= 0 AND budget_score <= 100),
  authority_score INTEGER CHECK (authority_score >= 0 AND authority_score <= 100),
  need_score INTEGER CHECK (need_score >= 0 AND need_score <= 100),
  timeline_score INTEGER CHECK (timeline_score >= 0 AND timeline_score <= 100),

  -- Overall qualification
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  qualification_status TEXT CHECK (qualification_status IN ('qualified', 'nurture', 'disqualified')),

  -- Detailed data for each dimension
  budget_details JSONB DEFAULT '{}',
  authority_details JSONB DEFAULT '{}',
  need_details JSONB DEFAULT '{}',
  timeline_details JSONB DEFAULT '{}',

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES auth.users(id),
  next_review_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDDIC Qualification Scores
CREATE TABLE IF NOT EXISTS meddic_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- MEDDIC Scores (0-100 scale)
  metrics_score INTEGER CHECK (metrics_score >= 0 AND metrics_score <= 100),
  economic_buyer_score INTEGER CHECK (economic_buyer_score >= 0 AND economic_buyer_score <= 100),
  decision_criteria_score INTEGER CHECK (decision_criteria_score >= 0 AND decision_criteria_score <= 100),
  decision_process_score INTEGER CHECK (decision_process_score >= 0 AND decision_process_score <= 100),
  identify_pain_score INTEGER CHECK (identify_pain_score >= 0 AND identify_pain_score <= 100),
  champion_score INTEGER CHECK (champion_score >= 0 AND champion_score <= 100),

  -- Overall qualification
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  forecast_category TEXT CHECK (forecast_category IN ('commit', 'best_case', 'pipeline', 'omitted')),
  deal_value DECIMAL(15, 2),
  close_probability INTEGER CHECK (close_probability >= 0 AND close_probability <= 100),

  -- Detailed data for each dimension
  metrics_details JSONB DEFAULT '{}',
  economic_buyer_details JSONB DEFAULT '{}',
  decision_criteria_details JSONB DEFAULT '{}',
  decision_process_details JSONB DEFAULT '{}',
  identify_pain_details JSONB DEFAULT '{}',
  champion_details JSONB DEFAULT '{}',

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES auth.users(id),
  expected_close_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Routing Rules
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('round_robin', 'weighted', 'skill_based', 'territory', 'account_based', 'ai_optimized')),

  -- Rule criteria
  criteria JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Assignment configuration
  assignee_pool JSONB DEFAULT '[]', -- Array of user IDs or team IDs
  weight_distribution JSONB DEFAULT '{}',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Assignments
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Assignment details
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assignment_reason TEXT,
  routing_rule_id UUID REFERENCES lead_routing_rules(id),

  -- Status tracking
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted', 'recycled')),
  response_time_hours DECIMAL(10, 2),

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_met BOOLEAN,

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qualification Checklists
CREATE TABLE IF NOT EXISTS qualification_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Checklist metadata
  template_name TEXT,
  checklist_type TEXT CHECK (checklist_type IN ('standard', 'custom', 'industry_specific')),

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),

  created_by UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES qualification_checklists(id) ON DELETE CASCADE,

  -- Item details
  item_text TEXT NOT NULL,
  category TEXT,
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,

  -- Auto-population
  auto_populate_field TEXT,
  auto_populate_value TEXT,

  -- Notes
  notes TEXT,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Recycling Rules
CREATE TABLE IF NOT EXISTS lead_recycling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,

  -- Trigger conditions
  trigger_after_days INTEGER,
  trigger_on_status TEXT[],
  trigger_on_inactivity BOOLEAN DEFAULT false,

  -- Recycling actions
  new_assignee_logic TEXT CHECK (new_assignee_logic IN ('next_in_rotation', 'original_owner', 'team_lead', 'ai_selected')),
  reset_qualification_score BOOLEAN DEFAULT false,
  add_to_nurture_campaign BOOLEAN DEFAULT true,

  -- Criteria
  criteria JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Recycling History
CREATE TABLE IF NOT EXISTS lead_recycling_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Recycling details
  recycling_rule_id UUID REFERENCES lead_recycling_rules(id),
  original_assignee UUID REFERENCES auth.users(id),
  new_assignee UUID REFERENCES auth.users(id),

  -- Reason and outcome
  recycling_reason TEXT,
  outcome TEXT CHECK (outcome IN ('requalified', 'converted', 'disqualified', 'pending')),

  recycled_at TIMESTAMPTZ DEFAULT NOW(),
  outcome_at TIMESTAMPTZ
);

-- Advanced Alert Configurations (extends existing alert system)
CREATE TABLE IF NOT EXISTS advanced_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT CHECK (alert_type IN ('threshold', 'trend', 'anomaly', 'milestone', 'deadline')),

  -- Target configuration
  target_metric TEXT NOT NULL,
  target_entity TEXT CHECK (target_entity IN ('lead', 'company', 'user', 'team')),
  target_entity_id UUID,

  -- Alert conditions
  condition_operator TEXT CHECK (condition_operator IN ('greater_than', 'less_than', 'equals', 'between', 'trend_up', 'trend_down')),
  threshold_value DECIMAL(15, 2),
  threshold_percentage DECIMAL(5, 2),

  -- Notification settings
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  notification_recipients UUID[],
  escalation_rules JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES advanced_alert_configs(id) ON DELETE CASCADE,

  -- Trigger details
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  triggered_value DECIMAL(15, 2),

  -- Notification details
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[],
  recipients UUID[],

  -- Response tracking
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  action_taken TEXT,

  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Similarity Analyses table for the similar companies feature
CREATE TABLE IF NOT EXISTS similarity_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_company_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  configuration JSONB DEFAULT '{}',
  results JSONB,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_scores_company ON lead_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_bant_lead_id ON bant_qualifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_bant_company_id ON bant_qualifications(company_id);
CREATE INDEX IF NOT EXISTS idx_bant_status ON bant_qualifications(qualification_status);
CREATE INDEX IF NOT EXISTS idx_bant_overall_score ON bant_qualifications(overall_score);

CREATE INDEX IF NOT EXISTS idx_meddic_lead_id ON meddic_qualifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_meddic_company_id ON meddic_qualifications(company_id);
CREATE INDEX IF NOT EXISTS idx_meddic_forecast ON meddic_qualifications(forecast_category);
CREATE INDEX IF NOT EXISTS idx_meddic_overall_score ON meddic_qualifications(overall_score);

CREATE INDEX IF NOT EXISTS idx_routing_rules_active ON lead_routing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_routing_rules_priority ON lead_routing_rules(priority);

CREATE INDEX IF NOT EXISTS idx_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignee ON lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON lead_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_sla ON lead_assignments(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_checklists_lead_id ON qualification_checklists(lead_id);
CREATE INDEX IF NOT EXISTS idx_checklists_status ON qualification_checklists(status);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON checklist_items(is_completed);

CREATE INDEX IF NOT EXISTS idx_recycling_rules_active ON lead_recycling_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recycling_history_lead ON lead_recycling_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_recycling_history_outcome ON lead_recycling_history(outcome);

CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON advanced_alert_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON advanced_alert_configs(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_lead ON alert_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(notification_sent);

CREATE INDEX IF NOT EXISTS idx_similarity_analyses_user ON similarity_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_status ON similarity_analyses(status);

-- Row Level Security Policies
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE bant_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meddic_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_recycling_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_recycling_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view their assigned BANT qualifications" ON bant_qualifications
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their assigned MEDDIC qualifications" ON meddic_qualifications
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage routing rules" ON lead_routing_rules
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their assignments" ON lead_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage checklists" ON qualification_checklists
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage checklist items" ON checklist_items
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage recycling rules" ON lead_recycling_rules
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view recycling history" ON lead_recycling_history
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage alert configs" ON advanced_alert_configs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view alert history" ON alert_history
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their similarity analyses" ON similarity_analyses
  FOR ALL USING (auth.uid() IS NOT NULL OR user_id IS NULL);

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_lead_scores_updated_at BEFORE UPDATE ON lead_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bant_qualifications_updated_at BEFORE UPDATE ON bant_qualifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meddic_qualifications_updated_at BEFORE UPDATE ON meddic_qualifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_routing_rules_updated_at BEFORE UPDATE ON lead_routing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_assignments_updated_at BEFORE UPDATE ON lead_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_checklists_updated_at BEFORE UPDATE ON qualification_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_recycling_rules_updated_at BEFORE UPDATE ON lead_recycling_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advanced_alert_configs_updated_at BEFORE UPDATE ON advanced_alert_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();