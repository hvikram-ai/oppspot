-- Stakeholder Tracking System Migration
-- Comprehensive stakeholder relationship management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Core stakeholder table
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Basic information
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url TEXT,
  
  -- Role and influence
  role_type VARCHAR(50) CHECK (role_type IN (
    'champion', 'influencer', 'decision_maker', 
    'gatekeeper', 'end_user', 'detractor', 'neutral'
  )),
  influence_level INTEGER CHECK (influence_level BETWEEN 1 AND 10),
  decision_authority BOOLEAN DEFAULT false,
  budget_authority BOOLEAN DEFAULT false,
  
  -- Relationship status
  relationship_status VARCHAR(50) CHECK (relationship_status IN (
    'not_contacted', 'initial_contact', 'developing', 
    'established', 'strong', 'at_risk', 'lost'
  )),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  
  -- Champion potential
  champion_score INTEGER CHECK (champion_score BETWEEN 0 AND 100),
  champion_status VARCHAR(50) CHECK (champion_status IN (
    'potential', 'developing', 'active', 'super', 'at_risk', 'lost'
  )),
  
  -- Tracking
  last_contact_date TIMESTAMPTZ,
  next_action_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[],
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, email)
);

-- 2. Champion tracking table
CREATE TABLE IF NOT EXISTS champion_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Champion metrics
  advocacy_level INTEGER CHECK (advocacy_level BETWEEN 1 AND 10),
  internal_influence INTEGER CHECK (internal_influence BETWEEN 1 AND 10),
  engagement_frequency VARCHAR(50) CHECK (engagement_frequency IN (
    'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'rare'
  )),
  
  -- Activities
  referrals_made INTEGER DEFAULT 0,
  meetings_facilitated INTEGER DEFAULT 0,
  internal_advocates INTEGER DEFAULT 0,
  success_stories_shared INTEGER DEFAULT 0,
  
  -- Development stage
  development_stage VARCHAR(50) CHECK (development_stage IN (
    'identified', 'qualifying', 'developing', 
    'activated', 'scaling', 'maintaining'
  )),
  development_actions JSONB DEFAULT '[]',
  
  -- Risk indicators
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors TEXT[],
  last_positive_interaction TIMESTAMPTZ,
  
  -- Goals and progress
  champion_goals JSONB DEFAULT '[]',
  cultivation_plan TEXT,
  next_milestone VARCHAR(255),
  milestone_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Detractor management table
CREATE TABLE IF NOT EXISTS detractor_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Detractor assessment
  detractor_level INTEGER CHECK (detractor_level BETWEEN 1 AND 10),
  opposition_reasons TEXT[],
  influence_radius VARCHAR(50) CHECK (influence_radius IN (
    'individual', 'team', 'department', 'division', 'company_wide'
  )),
  
  -- Impact analysis
  business_impact VARCHAR(20) CHECK (business_impact IN (
    'minimal', 'low', 'medium', 'high', 'critical'
  )),
  deal_risk_score INTEGER CHECK (deal_risk_score BETWEEN 0 AND 100),
  blocking_potential BOOLEAN DEFAULT false,
  
  -- Mitigation strategy
  mitigation_status VARCHAR(50) CHECK (mitigation_status IN (
    'not_started', 'in_progress', 'partial_success', 
    'converted', 'neutralized', 'escalated', 'abandoned'
  )),
  mitigation_strategy TEXT,
  mitigation_actions JSONB DEFAULT '[]',
  
  -- Conversion tracking
  conversion_potential INTEGER CHECK (conversion_potential BETWEEN 0 AND 100),
  conversion_barriers TEXT[],
  conversion_approach TEXT,
  
  -- Monitoring
  sentiment_trend VARCHAR(20) CHECK (sentiment_trend IN (
    'improving', 'stable', 'declining', 'volatile'
  )),
  last_assessment_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Influence scores table
CREATE TABLE IF NOT EXISTS influence_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Influence dimensions
  hierarchical_influence INTEGER CHECK (hierarchical_influence BETWEEN 0 AND 100),
  social_influence INTEGER CHECK (social_influence BETWEEN 0 AND 100),
  technical_influence INTEGER CHECK (technical_influence BETWEEN 0 AND 100),
  political_influence INTEGER CHECK (political_influence BETWEEN 0 AND 100),
  
  -- Composite scores
  overall_influence INTEGER CHECK (overall_influence BETWEEN 0 AND 100),
  decision_weight DECIMAL(3, 2) CHECK (decision_weight BETWEEN 0 AND 1),
  
  -- Network metrics
  network_centrality DECIMAL(3, 2),
  connection_count INTEGER DEFAULT 0,
  influence_reach VARCHAR(50),
  
  -- Behavioral indicators
  opinion_leader BOOLEAN DEFAULT false,
  early_adopter BOOLEAN DEFAULT false,
  change_agent BOOLEAN DEFAULT false,
  
  -- Calculation metadata
  calculation_method VARCHAR(50),
  confidence_score DECIMAL(3, 2),
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Role changes table
CREATE TABLE IF NOT EXISTS role_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Change details
  change_type VARCHAR(50) CHECK (change_type IN (
    'promotion', 'lateral_move', 'demotion', 
    'departure', 'return', 'new_hire', 'title_change'
  )),
  previous_role VARCHAR(255),
  new_role VARCHAR(255),
  previous_department VARCHAR(100),
  new_department VARCHAR(100),
  
  -- Impact assessment
  impact_on_relationship VARCHAR(20) CHECK (impact_on_relationship IN (
    'positive', 'neutral', 'negative', 'unknown'
  )),
  continuity_risk VARCHAR(20) CHECK (continuity_risk IN (
    'low', 'medium', 'high', 'critical'
  )),
  
  -- Successor information
  successor_id UUID REFERENCES stakeholders(id),
  handover_status VARCHAR(50),
  knowledge_transfer_notes TEXT,
  
  -- Response actions
  action_required BOOLEAN DEFAULT false,
  action_items JSONB DEFAULT '[]',
  action_deadline TIMESTAMPTZ,
  
  -- Tracking
  change_date TIMESTAMPTZ NOT NULL,
  detected_date TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_date TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Stakeholder engagement table
CREATE TABLE IF NOT EXISTS stakeholder_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Engagement details
  engagement_type VARCHAR(50) CHECK (engagement_type IN (
    'email', 'call', 'meeting', 'demo', 'presentation',
    'workshop', 'social', 'event', 'webinar', 'other'
  )),
  engagement_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  
  -- Content and outcome
  subject VARCHAR(255),
  description TEXT,
  outcome VARCHAR(50) CHECK (outcome IN (
    'positive', 'neutral', 'negative', 'no_response', 'follow_up_needed'
  )),
  sentiment_score INTEGER CHECK (sentiment_score BETWEEN -100 AND 100),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  follow_up_notes TEXT,
  
  -- Participants
  initiated_by UUID REFERENCES auth.users(id),
  participants JSONB DEFAULT '[]',
  
  -- Links and attachments
  meeting_link TEXT,
  recording_url TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 7. Stakeholder relationships table (connections between stakeholders)
CREATE TABLE IF NOT EXISTS stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  related_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Relationship details
  relationship_type VARCHAR(50) CHECK (relationship_type IN (
    'reports_to', 'peer', 'dotted_line', 'informal_influence',
    'mentor', 'sponsor', 'blocker', 'ally'
  )),
  strength INTEGER CHECK (strength BETWEEN 1 AND 10),
  influence_direction VARCHAR(20) CHECK (influence_direction IN (
    'mutual', 'one_way', 'none'
  )),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(stakeholder_id, related_stakeholder_id),
  CHECK (stakeholder_id != related_stakeholder_id)
);

-- 8. Champion cultivation actions table
CREATE TABLE IF NOT EXISTS champion_cultivation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  champion_tracking_id UUID REFERENCES champion_tracking(id) ON DELETE CASCADE,
  
  -- Action details
  action_type VARCHAR(50),
  action_description TEXT,
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status VARCHAR(20) CHECK (status IN (
    'pending', 'in_progress', 'completed', 'cancelled'
  )),
  
  -- Results
  outcome TEXT,
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 10),
  
  -- Metadata
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Stakeholder alerts table
CREATE TABLE IF NOT EXISTS stakeholder_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  
  -- Alert details
  alert_type VARCHAR(50) CHECK (alert_type IN (
    'role_change', 'risk_increase', 'engagement_drop',
    'milestone_due', 'no_contact', 'sentiment_decline',
    'champion_at_risk', 'detractor_active'
  )),
  severity VARCHAR(20) CHECK (severity IN (
    'info', 'warning', 'urgent', 'critical'
  )),
  
  -- Alert content
  title VARCHAR(255) NOT NULL,
  message TEXT,
  action_required TEXT,
  
  -- Status
  status VARCHAR(20) CHECK (status IN (
    'active', 'acknowledged', 'resolved', 'dismissed'
  )),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_stakeholders_company ON stakeholders(company_id);
CREATE INDEX idx_stakeholders_org ON stakeholders(org_id);
CREATE INDEX idx_stakeholders_role ON stakeholders(role_type);
CREATE INDEX idx_stakeholders_champion_status ON stakeholders(champion_status);
CREATE INDEX idx_stakeholders_email ON stakeholders(email);
CREATE INDEX idx_stakeholders_assigned ON stakeholders(assigned_to);

CREATE INDEX idx_champion_tracking_stakeholder ON champion_tracking(stakeholder_id);
CREATE INDEX idx_champion_tracking_stage ON champion_tracking(development_stage);
CREATE INDEX idx_champion_tracking_risk ON champion_tracking(risk_level);

CREATE INDEX idx_detractor_stakeholder ON detractor_management(stakeholder_id);
CREATE INDEX idx_detractor_status ON detractor_management(mitigation_status);

CREATE INDEX idx_influence_stakeholder ON influence_scores(stakeholder_id);
CREATE INDEX idx_influence_overall ON influence_scores(overall_influence);

CREATE INDEX idx_role_changes_stakeholder ON role_changes(stakeholder_id);
CREATE INDEX idx_role_changes_date ON role_changes(change_date);
CREATE INDEX idx_role_changes_type ON role_changes(change_type);

CREATE INDEX idx_engagement_stakeholder ON stakeholder_engagement(stakeholder_id);
CREATE INDEX idx_engagement_date ON stakeholder_engagement(engagement_date);
CREATE INDEX idx_engagement_type ON stakeholder_engagement(engagement_type);

CREATE INDEX idx_relationships_stakeholder ON stakeholder_relationships(stakeholder_id);
CREATE INDEX idx_relationships_related ON stakeholder_relationships(related_stakeholder_id);

CREATE INDEX idx_alerts_stakeholder ON stakeholder_alerts(stakeholder_id);
CREATE INDEX idx_alerts_type ON stakeholder_alerts(alert_type);
CREATE INDEX idx_alerts_status ON stakeholder_alerts(status);
CREATE INDEX idx_alerts_severity ON stakeholder_alerts(severity);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stakeholders_updated_at
  BEFORE UPDATE ON stakeholders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_champion_tracking_updated_at
  BEFORE UPDATE ON champion_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detractor_management_updated_at
  BEFORE UPDATE ON detractor_management
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influence_scores_updated_at
  BEFORE UPDATE ON influence_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_changes_updated_at
  BEFORE UPDATE ON role_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engagement_updated_at
  BEFORE UPDATE ON stakeholder_engagement
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON stakeholder_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultivation_actions_updated_at
  BEFORE UPDATE ON champion_cultivation_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE detractor_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE influence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_cultivation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (organization-based access)
CREATE POLICY "Users can view stakeholders in their organization"
  ON stakeholders FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage stakeholders in their organization"
  ON stakeholders FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view champion tracking in their organization"
  ON champion_tracking FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage champion tracking in their organization"
  ON champion_tracking FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add similar policies for remaining tables

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;