-- Qualification Workflows System Migration
-- Comprehensive BANT/MEDDIC frameworks, routing, alerts, checklists, and recycling

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. BANT Qualification Scores
CREATE TABLE IF NOT EXISTS bant_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  org_id UUID REFERENCES organizations(id),

  -- BANT Scores (0-100)
  budget_score INTEGER CHECK (budget_score >= 0 AND budget_score <= 100),
  authority_score INTEGER CHECK (authority_score >= 0 AND authority_score <= 100),
  need_score INTEGER CHECK (need_score >= 0 AND need_score <= 100),
  timeline_score INTEGER CHECK (timeline_score >= 0 AND timeline_score <= 100),

  -- Overall qualification
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  qualification_status TEXT CHECK (qualification_status IN ('qualified', 'nurture', 'disqualified')),

  -- Detailed data
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id, company_id)
);

-- 2. MEDDIC Qualification Scores
CREATE TABLE IF NOT EXISTS meddic_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  org_id UUID REFERENCES organizations(id),

  -- MEDDIC Scores (0-100)
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

  -- Detailed data
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id, company_id)
);

-- 3. Lead Routing Rules
CREATE TABLE IF NOT EXISTS lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Conditions for triggering this rule
  conditions JSONB NOT NULL DEFAULT '{}',

  -- Routing algorithm to use
  routing_algorithm TEXT CHECK (routing_algorithm IN (
    'round_robin', 'weighted', 'skill_based',
    'territory', 'account_based', 'ai_optimized'
  )),

  -- Assignment target (team, individual, or queue)
  assignment_type TEXT CHECK (assignment_type IN ('team', 'individual', 'queue')),
  assignment_target JSONB DEFAULT '{}',

  -- SLA and escalation
  sla_hours INTEGER,
  escalation_hours INTEGER,
  escalation_target JSONB,

  -- Advanced settings
  settings JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Lead Assignments
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  org_id UUID REFERENCES organizations(id),

  -- Assignment details
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  routing_rule_id UUID REFERENCES lead_routing_rules(id),

  assignment_reason TEXT,
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  sla_deadline TIMESTAMPTZ,

  -- Status tracking
  status TEXT CHECK (status IN ('assigned', 'accepted', 'working', 'completed', 'reassigned', 'expired')),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reassigned_at TIMESTAMPTZ,

  -- Performance tracking
  response_time_minutes INTEGER,
  resolution_time_hours INTEGER,

  -- Metadata
  routing_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Threshold Alert Configurations
CREATE TABLE IF NOT EXISTS threshold_alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Alert type and conditions
  alert_type TEXT CHECK (alert_type IN (
    'score_threshold', 'score_velocity', 'engagement_spike',
    'buying_signal', 'risk_indicator', 'qualification_milestone'
  )),

  -- Trigger conditions
  trigger_conditions JSONB NOT NULL,

  -- Compound conditions (AND/OR logic)
  compound_conditions JSONB,

  -- Actions to take when triggered
  actions JSONB DEFAULT '{}',

  -- Intelligence features
  use_ml_prediction BOOLEAN DEFAULT false,
  use_anomaly_detection BOOLEAN DEFAULT false,
  use_peer_comparison BOOLEAN DEFAULT false,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Qualification Checklists
CREATE TABLE IF NOT EXISTS qualification_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  org_id UUID REFERENCES organizations(id),

  template_id UUID,
  framework TEXT CHECK (framework IN ('BANT', 'MEDDIC', 'CUSTOM')),

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id, company_id, framework)
);

-- 7. Checklist Items
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES qualification_checklists(id) ON DELETE CASCADE,

  -- Item details
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,

  -- Status and completion
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'na')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Answer/Evidence
  answer TEXT,
  evidence JSONB DEFAULT '[]',

  -- Validation
  is_required BOOLEAN DEFAULT false,
  validation_type TEXT CHECK (validation_type IN ('manual', 'automatic', 'hybrid')),
  validation_data JSONB DEFAULT '{}',

  -- Scoring impact
  weight DECIMAL(3,2) DEFAULT 1.0,
  score_impact INTEGER DEFAULT 0,

  -- Dependencies and conditions
  dependencies JSONB DEFAULT '{}',
  conditional_display JSONB DEFAULT '{}',

  -- Auto-population
  auto_populate BOOLEAN DEFAULT false,
  data_source TEXT,
  ml_suggestion TEXT,
  confidence_score DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Lead Recycling Rules
CREATE TABLE IF NOT EXISTS lead_recycling_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  -- Trigger conditions for recycling
  trigger_conditions JSONB NOT NULL,

  -- Recycling strategy
  recycling_action TEXT CHECK (recycling_action IN (
    're_engage', 'nurture', 're_qualify', 'archive'
  )),

  assignment_strategy TEXT CHECK (assignment_strategy IN (
    'original_rep', 'new_rep', 'nurture_team', 'marketing', 'round_robin'
  )),

  nurture_campaign_id UUID,
  recycling_delay_days INTEGER DEFAULT 0,

  -- AI optimization settings
  use_ai_optimization BOOLEAN DEFAULT false,
  personalization_level TEXT CHECK (personalization_level IN ('high', 'medium', 'low')),

  -- Settings
  settings JSONB DEFAULT '{}',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Lead Recycling History
CREATE TABLE IF NOT EXISTS lead_recycling_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  rule_id UUID REFERENCES lead_recycling_rules(id),

  -- Recycling details
  previous_status TEXT,
  new_status TEXT,
  recycling_reason TEXT,
  recycled_from UUID REFERENCES auth.users(id),
  recycled_to UUID REFERENCES auth.users(id),

  -- Outcome tracking
  outcome TEXT CHECK (outcome IN ('re_qualified', 'still_nurturing', 'archived', 'converted', 'lost')),
  outcome_date TIMESTAMPTZ,
  outcome_details JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Nurture Campaigns
CREATE TABLE IF NOT EXISTS nurture_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,

  -- Campaign type and trigger
  campaign_type TEXT CHECK (campaign_type IN (
    'not_ready', 'no_budget', 'lost_to_competitor',
    'bad_timing', 'price_objection', 'general'
  )),

  trigger_reason TEXT,

  -- Campaign flow
  sequence_steps JSONB DEFAULT '[]',
  branching_logic JSONB DEFAULT '{}',
  exit_criteria JSONB DEFAULT '{}',

  -- Personalization settings
  use_dynamic_content BOOLEAN DEFAULT false,
  use_ai_copywriting BOOLEAN DEFAULT false,
  personalization_rules JSONB DEFAULT '{}',

  -- Performance metrics
  total_leads INTEGER DEFAULT 0,
  re_engagement_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  avg_nurture_days INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Qualification Activities Log
CREATE TABLE IF NOT EXISTS qualification_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES lead_scores(id),
  company_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES auth.users(id),

  -- Activity details
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  activity_data JSONB DEFAULT '{}',

  -- Impact on qualification
  score_impact INTEGER DEFAULT 0,
  framework_affected TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_bant_lead_company ON bant_qualifications(lead_id, company_id);
CREATE INDEX idx_bant_status ON bant_qualifications(qualification_status);
CREATE INDEX idx_bant_overall_score ON bant_qualifications(overall_score DESC);

CREATE INDEX idx_meddic_lead_company ON meddic_qualifications(lead_id, company_id);
CREATE INDEX idx_meddic_forecast ON meddic_qualifications(forecast_category);
CREATE INDEX idx_meddic_overall_score ON meddic_qualifications(overall_score DESC);

CREATE INDEX idx_routing_rules_org ON lead_routing_rules(org_id);
CREATE INDEX idx_routing_rules_active ON lead_routing_rules(is_active, priority DESC);

CREATE INDEX idx_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX idx_assignments_assigned_to ON lead_assignments(assigned_to);
CREATE INDEX idx_assignments_status ON lead_assignments(status);
CREATE INDEX idx_assignments_sla ON lead_assignments(sla_deadline);

CREATE INDEX idx_alert_configs_org ON threshold_alert_configs(org_id);
CREATE INDEX idx_alert_configs_active ON threshold_alert_configs(is_active);
CREATE INDEX idx_alert_configs_type ON threshold_alert_configs(alert_type);

CREATE INDEX idx_checklists_lead ON qualification_checklists(lead_id, company_id);
CREATE INDEX idx_checklists_status ON qualification_checklists(status);
CREATE INDEX idx_checklists_framework ON qualification_checklists(framework);

CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_status ON checklist_items(status);

CREATE INDEX idx_recycling_rules_org ON lead_recycling_rules(org_id);
CREATE INDEX idx_recycling_rules_active ON lead_recycling_rules(is_active, priority DESC);

CREATE INDEX idx_recycling_history_lead ON lead_recycling_history(lead_id);
CREATE INDEX idx_recycling_history_outcome ON lead_recycling_history(outcome);

CREATE INDEX idx_nurture_campaigns_org ON nurture_campaigns(org_id);
CREATE INDEX idx_nurture_campaigns_type ON nurture_campaigns(campaign_type);

CREATE INDEX idx_qualification_activities_lead ON qualification_activities(lead_id);
CREATE INDEX idx_qualification_activities_created ON qualification_activities(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bant_updated_at
  BEFORE UPDATE ON bant_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meddic_updated_at
  BEFORE UPDATE ON meddic_qualifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at
  BEFORE UPDATE ON lead_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_configs_updated_at
  BEFORE UPDATE ON threshold_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON qualification_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recycling_rules_updated_at
  BEFORE UPDATE ON lead_recycling_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nurture_campaigns_updated_at
  BEFORE UPDATE ON nurture_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE bant_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meddic_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE threshold_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_recycling_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_recycling_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurture_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (organization-based access)
CREATE POLICY "Users can view BANT qualifications in their organization"
  ON bant_qualifications FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage BANT qualifications in their organization"
  ON bant_qualifications FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view MEDDIC qualifications in their organization"
  ON meddic_qualifications FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage MEDDIC qualifications in their organization"
  ON meddic_qualifications FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;