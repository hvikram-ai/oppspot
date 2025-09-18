-- QUALIFICATION WORKFLOWS DATABASE SCHEMA
-- This migration creates all tables needed for the advanced qualification workflow system

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
  qualification_confidence DECIMAL(3,2) CHECK (qualification_confidence >= 0 AND qualification_confidence <= 1),
  forecast_category TEXT CHECK (forecast_category IN ('commit', 'best_case', 'pipeline', 'omitted')),

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
  next_review_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Routing Rules
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- Will reference organizations table when available
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Conditions for when this rule applies
  conditions JSONB NOT NULL DEFAULT '{}',

  -- Routing configuration
  routing_algorithm TEXT CHECK (routing_algorithm IN (
    'round_robin', 'weighted', 'skill_based',
    'territory', 'account_based', 'ai_optimized'
  )) DEFAULT 'round_robin',
  assignment_target JSONB DEFAULT '{}',
  sla_hours INTEGER DEFAULT 24,

  -- Additional settings
  settings JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Assignments
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  routing_rule_id UUID REFERENCES lead_routing_rules(id),

  -- Assignment details
  assignment_reason TEXT,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')) DEFAULT 'medium',
  sla_deadline TIMESTAMPTZ,

  -- Status tracking
  status TEXT CHECK (status IN ('assigned', 'accepted', 'working', 'completed', 'reassigned')) DEFAULT 'assigned',
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Additional metadata
  routing_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qualification Checklists
CREATE TABLE IF NOT EXISTS qualification_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  template_id UUID, -- References checklist templates
  framework TEXT CHECK (framework IN ('BANT', 'MEDDIC', 'CUSTOM')) DEFAULT 'BANT',

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Status
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')) DEFAULT 'not_started',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID REFERENCES qualification_checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Status tracking
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'na')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Validation configuration
  is_required BOOLEAN DEFAULT false,
  validation_type TEXT CHECK (validation_type IN ('manual', 'automatic', 'hybrid')) DEFAULT 'manual',
  validation_data JSONB DEFAULT '{}',

  -- Scoring impact
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0),
  score_impact INTEGER DEFAULT 0,

  -- Dependencies and rules
  dependencies JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Recycling Rules
CREATE TABLE IF NOT EXISTS lead_recycling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- Will reference organizations table when available
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Conditions that trigger recycling
  trigger_conditions JSONB NOT NULL DEFAULT '{}',

  -- What to do when recycling
  recycling_action TEXT CHECK (recycling_action IN (
    're_engage', 'nurture', 're_qualify', 'archive'
  )) DEFAULT 'nurture',
  assignment_strategy TEXT,
  nurture_campaign_id UUID,

  -- Additional settings
  settings JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Recycling History
CREATE TABLE IF NOT EXISTS lead_recycling_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES lead_recycling_rules(id),

  -- Recycling details
  previous_status TEXT,
  new_status TEXT,
  recycling_reason TEXT,
  recycled_from UUID REFERENCES auth.users(id),
  recycled_to UUID REFERENCES auth.users(id),

  -- Track outcomes
  outcome TEXT CHECK (outcome IN ('re_qualified', 'still_nurturing', 'archived', 'converted', 'pending')),
  outcome_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advanced Alert Configurations (extends existing scoring_alerts)
CREATE TABLE IF NOT EXISTS advanced_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- Will reference organizations table when available
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT CHECK (alert_type IN (
    'score_threshold', 'score_velocity', 'engagement_spike',
    'buying_signal', 'risk_indicator', 'qualification_milestone'
  )) NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Trigger configuration
  trigger_conditions JSONB NOT NULL DEFAULT '{}',

  -- Multi-factor conditions
  compound_conditions JSONB DEFAULT '{}',

  -- Actions to take
  actions JSONB NOT NULL DEFAULT '{}',

  -- Smart features configuration
  intelligence_config JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES advanced_alert_configs(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,

  -- What triggered the alert
  trigger_type TEXT NOT NULL,
  trigger_value JSONB DEFAULT '{}',

  -- Actions taken
  actions_taken JSONB DEFAULT '{}',

  -- Status
  status TEXT CHECK (status IN ('triggered', 'acknowledged', 'resolved', 'escalated')) DEFAULT 'triggered',
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
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
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to ON lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON lead_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_sla ON lead_assignments(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_checklists_lead_id ON qualification_checklists(lead_id);
CREATE INDEX IF NOT EXISTS idx_checklists_status ON qualification_checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON checklist_items(status);

CREATE INDEX IF NOT EXISTS idx_recycling_rules_active ON lead_recycling_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recycling_history_lead_id ON lead_recycling_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_recycling_history_outcome ON lead_recycling_history(outcome);

CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON advanced_alert_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON advanced_alert_configs(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_lead_id ON alert_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);

-- Row Level Security Policies
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

-- RLS Policies for authenticated users
CREATE POLICY "Users can view their assigned qualifications" ON bant_qualifications
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can view their assigned MEDDIC qualifications" ON meddic_qualifications
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage routing rules" ON lead_routing_rules
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can view their assignments" ON lead_assignments
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage checklists" ON qualification_checklists
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage checklist items" ON checklist_items
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage recycling rules" ON lead_recycling_rules
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can view recycling history" ON lead_recycling_history
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can manage alert configs" ON advanced_alert_configs
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Users can view alert history" ON alert_history
  FOR ALL TO authenticated
  USING (true);

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_bant_qualifications_updated_at
  BEFORE UPDATE ON bant_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meddic_qualifications_updated_at
  BEFORE UPDATE ON meddic_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lead_routing_rules_updated_at
  BEFORE UPDATE ON lead_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lead_assignments_updated_at
  BEFORE UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_qualification_checklists_updated_at
  BEFORE UPDATE ON qualification_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lead_recycling_rules_updated_at
  BEFORE UPDATE ON lead_recycling_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_advanced_alert_configs_updated_at
  BEFORE UPDATE ON advanced_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();