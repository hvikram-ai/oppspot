/**
 * Integration Playbooks Schema
 * Auto-generated 100-day M&A integration plans
 *
 * Tables:
 * - integration_playbooks: Main playbook records
 * - integration_phases: 4 phases (Day 1-30, 31-60, 61-100, 100+)
 * - integration_workstreams: Functional areas (IT, HR, Finance, Operations, Commercial)
 * - integration_activities: Granular tasks with dependencies
 * - integration_day1_checklist: Critical Day 1 items
 * - integration_synergies: Cost/revenue synergies with tracking
 * - integration_risks: Risk register with mitigation
 * - integration_kpis: Success metrics
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE playbook_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE playbook_generation_status AS ENUM ('pending', 'generating', 'completed', 'failed');
CREATE TYPE deal_type AS ENUM ('acquisition', 'merger', 'investment', 'partnership', 'joint_venture');
CREATE TYPE phase_type AS ENUM ('day_1_30', 'day_31_60', 'day_61_100', 'post_100');
CREATE TYPE activity_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked', 'at_risk');
CREATE TYPE activity_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE activity_category AS ENUM ('planning', 'execution', 'monitoring', 'communication', 'approval');
CREATE TYPE responsible_party AS ENUM ('buyer', 'seller', 'joint');
CREATE TYPE synergy_type AS ENUM ('cost', 'revenue');
CREATE TYPE synergy_category AS ENUM ('headcount', 'facilities', 'procurement', 'IT', 'cross_sell', 'upsell', 'pricing', 'market_expansion', 'other');
CREATE TYPE synergy_status AS ENUM ('planned', 'in_progress', 'realized', 'at_risk', 'failed');
CREATE TYPE risk_impact AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE risk_probability AS ENUM ('low', 'medium', 'high');
CREATE TYPE risk_status AS ENUM ('open', 'mitigating', 'closed', 'realized');
CREATE TYPE kpi_category AS ENUM ('financial', 'customer', 'employee', 'operational', 'synergy');
CREATE TYPE kpi_status AS ENUM ('on_track', 'at_risk', 'off_track');

-- =====================================================
-- TABLE: integration_playbooks
-- =====================================================

CREATE TABLE integration_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Playbook metadata
  playbook_name TEXT NOT NULL,
  deal_type deal_type NOT NULL,
  deal_rationale TEXT,
  integration_objectives TEXT[],
  success_metrics JSONB,

  -- Status
  status playbook_status DEFAULT 'draft',
  generation_status playbook_generation_status DEFAULT 'pending',

  -- Aggregate metrics (auto-calculated by triggers)
  total_phases INTEGER DEFAULT 0,
  total_workstreams INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  completed_activities INTEGER DEFAULT 0,
  total_synergies NUMERIC(15,2) DEFAULT 0,
  realized_synergies NUMERIC(15,2) DEFAULT 0,
  total_risks INTEGER DEFAULT 0,
  high_risk_count INTEGER DEFAULT 0,

  -- AI metadata
  ai_model TEXT,
  generation_time_ms INTEGER,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  target_close_date DATE,
  actual_close_date DATE,
  deleted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT integration_playbooks_name_length CHECK (char_length(playbook_name) <= 255)
);

-- Indexes
CREATE INDEX idx_integration_playbooks_data_room ON integration_playbooks(data_room_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_integration_playbooks_created_by ON integration_playbooks(created_by);
CREATE INDEX idx_integration_playbooks_status ON integration_playbooks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_integration_playbooks_generation_status ON integration_playbooks(generation_status);

-- =====================================================
-- TABLE: integration_phases
-- =====================================================

CREATE TABLE integration_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  phase_name TEXT NOT NULL,
  phase_type phase_type NOT NULL,
  phase_order INTEGER NOT NULL,
  phase_description TEXT,

  -- Objectives
  objectives TEXT[],
  success_criteria TEXT[],
  key_milestones TEXT[],

  -- Dates
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,

  -- Progress (auto-calculated)
  total_activities INTEGER DEFAULT 0,
  completed_activities INTEGER DEFAULT 0,
  status activity_status DEFAULT 'not_started',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_phases_playbook ON integration_phases(playbook_id);
CREATE INDEX idx_integration_phases_type ON integration_phases(phase_type);
CREATE UNIQUE INDEX idx_integration_phases_order ON integration_phases(playbook_id, phase_order);

-- =====================================================
-- TABLE: integration_workstreams
-- =====================================================

CREATE TABLE integration_workstreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  workstream_name TEXT NOT NULL,
  workstream_description TEXT,
  workstream_lead UUID REFERENCES profiles(id),

  -- Objectives
  objectives TEXT[],
  key_deliverables TEXT[],

  -- Progress (auto-calculated)
  total_activities INTEGER DEFAULT 0,
  completed_activities INTEGER DEFAULT 0,
  status activity_status DEFAULT 'not_started',

  -- Budget
  budget_allocated NUMERIC(15,2),
  budget_spent NUMERIC(15,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_workstreams_playbook ON integration_workstreams(playbook_id);
CREATE INDEX idx_integration_workstreams_lead ON integration_workstreams(workstream_lead);

-- =====================================================
-- TABLE: integration_activities
-- =====================================================

CREATE TABLE integration_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES integration_phases(id) ON DELETE SET NULL,
  workstream_id UUID REFERENCES integration_workstreams(id) ON DELETE SET NULL,

  -- Activity details
  activity_name TEXT NOT NULL,
  description TEXT,
  category activity_category DEFAULT 'execution',

  -- Ownership
  owner_id UUID REFERENCES profiles(id),
  responsible_party responsible_party DEFAULT 'buyer',

  -- Scheduling
  target_start_date DATE,
  target_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  duration_days INTEGER,

  -- Dependencies
  depends_on UUID[], -- Array of activity IDs
  blocks_activity_ids UUID[], -- Activities blocked by this one
  critical_path BOOLEAN DEFAULT false,

  -- Priority and status
  priority activity_priority DEFAULT 'medium',
  status activity_status DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Deliverables
  deliverables TEXT[],
  deliverable_document_ids UUID[], -- Links to data_room documents

  -- Risks
  risk_level risk_impact,
  risk_description TEXT,
  mitigation_plan TEXT,

  -- Notes
  notes TEXT,
  blockers TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_activities_playbook ON integration_activities(playbook_id);
CREATE INDEX idx_integration_activities_phase ON integration_activities(phase_id);
CREATE INDEX idx_integration_activities_workstream ON integration_activities(workstream_id);
CREATE INDEX idx_integration_activities_owner ON integration_activities(owner_id);
CREATE INDEX idx_integration_activities_status ON integration_activities(status);
CREATE INDEX idx_integration_activities_priority ON integration_activities(priority);
CREATE INDEX idx_integration_activities_dates ON integration_activities(target_start_date, target_end_date);

-- =====================================================
-- TABLE: integration_day1_checklist
-- =====================================================

CREATE TABLE integration_day1_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  checklist_item TEXT NOT NULL,
  category TEXT NOT NULL, -- legal, communications, IT, HR, operations, finance
  item_order INTEGER,
  item_description TEXT,

  -- Ownership
  responsible_party responsible_party DEFAULT 'buyer',
  owner_id UUID REFERENCES profiles(id),

  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, not_applicable
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),

  -- Evidence
  evidence_document_id UUID REFERENCES documents(id),
  notes TEXT,

  -- Importance
  is_critical BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_day1_playbook ON integration_day1_checklist(playbook_id);
CREATE INDEX idx_integration_day1_category ON integration_day1_checklist(category);
CREATE INDEX idx_integration_day1_status ON integration_day1_checklist(status);
CREATE INDEX idx_integration_day1_critical ON integration_day1_checklist(is_critical) WHERE is_critical = true;

-- =====================================================
-- TABLE: integration_synergies
-- =====================================================

CREATE TABLE integration_synergies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  synergy_type synergy_type NOT NULL,
  category synergy_category NOT NULL,

  -- Description
  synergy_name TEXT NOT NULL,
  description TEXT,

  -- Financial projections
  year_1_target NUMERIC(15,2),
  year_2_target NUMERIC(15,2),
  year_3_target NUMERIC(15,2),
  total_target NUMERIC(15,2),

  -- Realization
  year_1_actual NUMERIC(15,2) DEFAULT 0,
  year_2_actual NUMERIC(15,2) DEFAULT 0,
  year_3_actual NUMERIC(15,2) DEFAULT 0,
  total_actual NUMERIC(15,2) DEFAULT 0,

  -- Implementation
  implementation_cost NUMERIC(15,2),
  implementation_timeline_days INTEGER,
  probability_of_realization INTEGER CHECK (probability_of_realization >= 0 AND probability_of_realization <= 100),
  risk_adjusted_value NUMERIC(15,2), -- target * probability / 100

  -- Ownership
  owner_id UUID REFERENCES profiles(id),
  workstream_id UUID REFERENCES integration_workstreams(id),

  -- Status
  status synergy_status DEFAULT 'planned',

  -- Tracking
  last_measured_date DATE,
  measurement_frequency TEXT, -- monthly, quarterly, annually

  -- Source (from hypothesis tracker)
  source_hypothesis_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_synergies_playbook ON integration_synergies(playbook_id);
CREATE INDEX idx_integration_synergies_type ON integration_synergies(synergy_type);
CREATE INDEX idx_integration_synergies_category ON integration_synergies(category);
CREATE INDEX idx_integration_synergies_status ON integration_synergies(status);
CREATE INDEX idx_integration_synergies_owner ON integration_synergies(owner_id);
CREATE INDEX idx_integration_synergies_workstream ON integration_synergies(workstream_id);
CREATE INDEX idx_integration_synergies_source ON integration_synergies(source_hypothesis_id) WHERE source_hypothesis_id IS NOT NULL;

-- =====================================================
-- TABLE: integration_risks
-- =====================================================

CREATE TABLE integration_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  risk_name TEXT NOT NULL,
  risk_description TEXT NOT NULL,
  risk_category TEXT NOT NULL, -- people, systems, customers, operations, regulatory, cultural

  -- Impact and probability
  impact risk_impact NOT NULL,
  probability risk_probability NOT NULL,
  risk_score INTEGER, -- Calculated: impact_weight * probability_weight (1-100)

  -- Mitigation
  mitigation_plan TEXT,
  mitigation_owner UUID REFERENCES profiles(id),
  contingency_plan TEXT,

  -- Status
  status risk_status DEFAULT 'open',
  realized_at TIMESTAMPTZ,
  realized_impact TEXT,

  -- Monitoring
  review_frequency TEXT, -- weekly, biweekly, monthly
  last_reviewed_date DATE,
  next_review_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_risks_playbook ON integration_risks(playbook_id);
CREATE INDEX idx_integration_risks_category ON integration_risks(risk_category);
CREATE INDEX idx_integration_risks_impact ON integration_risks(impact);
CREATE INDEX idx_integration_risks_status ON integration_risks(status);
CREATE INDEX idx_integration_risks_score ON integration_risks(risk_score DESC);

-- =====================================================
-- TABLE: integration_kpis
-- =====================================================

CREATE TABLE integration_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID NOT NULL REFERENCES integration_playbooks(id) ON DELETE CASCADE,

  kpi_name TEXT NOT NULL,
  kpi_category kpi_category NOT NULL,
  kpi_description TEXT,

  -- Measurement
  unit TEXT, -- %, USD, count, days, etc.
  target_value NUMERIC(15,2),
  current_value NUMERIC(15,2),
  baseline_value NUMERIC(15,2),

  -- Trend
  trend TEXT, -- improving, declining, stable
  variance_percentage NUMERIC(5,2), -- (current - target) / target * 100

  -- Ownership
  owner_id UUID REFERENCES profiles(id),

  -- Status
  status kpi_status,

  -- Measurement
  measurement_frequency TEXT, -- daily, weekly, monthly, quarterly
  last_measured_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_kpis_playbook ON integration_kpis(playbook_id);
CREATE INDEX idx_integration_kpis_category ON integration_kpis(kpi_category);
CREATE INDEX idx_integration_kpis_status ON integration_kpis(status);
CREATE INDEX idx_integration_kpis_owner ON integration_kpis(owner_id);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function: Update playbook progress counters
CREATE OR REPLACE FUNCTION update_playbook_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE integration_playbooks
  SET
    total_activities = (
      SELECT COUNT(*) FROM integration_activities
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
    ),
    completed_activities = (
      SELECT COUNT(*) FROM integration_activities
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
      AND status = 'completed'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playbook_id, OLD.playbook_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_playbook_progress_insert
AFTER INSERT ON integration_activities
FOR EACH ROW EXECUTE FUNCTION update_playbook_progress();

CREATE TRIGGER trigger_update_playbook_progress_update
AFTER UPDATE ON integration_activities
FOR EACH ROW EXECUTE FUNCTION update_playbook_progress();

CREATE TRIGGER trigger_update_playbook_progress_delete
AFTER DELETE ON integration_activities
FOR EACH ROW EXECUTE FUNCTION update_playbook_progress();

-- Function: Update phase progress counters
CREATE OR REPLACE FUNCTION update_phase_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase_id IS NOT NULL THEN
    UPDATE integration_phases
    SET
      total_activities = (
        SELECT COUNT(*) FROM integration_activities
        WHERE phase_id = NEW.phase_id
      ),
      completed_activities = (
        SELECT COUNT(*) FROM integration_activities
        WHERE phase_id = NEW.phase_id
        AND status = 'completed'
      ),
      status = CASE
        WHEN (SELECT COUNT(*) FROM integration_activities WHERE phase_id = NEW.phase_id AND status = 'completed') =
             (SELECT COUNT(*) FROM integration_activities WHERE phase_id = NEW.phase_id) THEN 'completed'
        WHEN (SELECT COUNT(*) FROM integration_activities WHERE phase_id = NEW.phase_id AND status IN ('in_progress', 'blocked', 'at_risk')) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END
    WHERE id = NEW.phase_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_phase_progress
AFTER INSERT OR UPDATE ON integration_activities
FOR EACH ROW EXECUTE FUNCTION update_phase_progress();

-- Function: Update workstream progress counters
CREATE OR REPLACE FUNCTION update_workstream_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.workstream_id IS NOT NULL THEN
    UPDATE integration_workstreams
    SET
      total_activities = (
        SELECT COUNT(*) FROM integration_activities
        WHERE workstream_id = NEW.workstream_id
      ),
      completed_activities = (
        SELECT COUNT(*) FROM integration_activities
        WHERE workstream_id = NEW.workstream_id
        AND status = 'completed'
      ),
      status = CASE
        WHEN (SELECT COUNT(*) FROM integration_activities WHERE workstream_id = NEW.workstream_id AND status = 'completed') =
             (SELECT COUNT(*) FROM integration_activities WHERE workstream_id = NEW.workstream_id) THEN 'completed'
        WHEN (SELECT COUNT(*) FROM integration_activities WHERE workstream_id = NEW.workstream_id AND status IN ('in_progress', 'blocked', 'at_risk')) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END
    WHERE id = NEW.workstream_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_workstream_progress
AFTER INSERT OR UPDATE ON integration_activities
FOR EACH ROW EXECUTE FUNCTION update_workstream_progress();

-- Function: Update synergy totals
CREATE OR REPLACE FUNCTION update_synergy_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE integration_playbooks
  SET
    total_synergies = (
      SELECT COALESCE(SUM(total_target), 0)
      FROM integration_synergies
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
    ),
    realized_synergies = (
      SELECT COALESCE(SUM(total_actual), 0)
      FROM integration_synergies
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playbook_id, OLD.playbook_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_synergy_totals_insert
AFTER INSERT ON integration_synergies
FOR EACH ROW EXECUTE FUNCTION update_synergy_totals();

CREATE TRIGGER trigger_update_synergy_totals_update
AFTER UPDATE ON integration_synergies
FOR EACH ROW EXECUTE FUNCTION update_synergy_totals();

CREATE TRIGGER trigger_update_synergy_totals_delete
AFTER DELETE ON integration_synergies
FOR EACH ROW EXECUTE FUNCTION update_synergy_totals();

-- Function: Update risk counts
CREATE OR REPLACE FUNCTION update_risk_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE integration_playbooks
  SET
    total_risks = (
      SELECT COUNT(*) FROM integration_risks
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
    ),
    high_risk_count = (
      SELECT COUNT(*) FROM integration_risks
      WHERE playbook_id = COALESCE(NEW.playbook_id, OLD.playbook_id)
      AND impact IN ('high', 'critical')
      AND status = 'open'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playbook_id, OLD.playbook_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_risk_counts_insert
AFTER INSERT ON integration_risks
FOR EACH ROW EXECUTE FUNCTION update_risk_counts();

CREATE TRIGGER trigger_update_risk_counts_update
AFTER UPDATE ON integration_risks
FOR EACH ROW EXECUTE FUNCTION update_risk_counts();

CREATE TRIGGER trigger_update_risk_counts_delete
AFTER DELETE ON integration_risks
FOR EACH ROW EXECUTE FUNCTION update_risk_counts();

-- Function: Calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score()
RETURNS TRIGGER AS $$
DECLARE
  impact_weight INTEGER;
  probability_weight INTEGER;
BEGIN
  -- Assign weights
  impact_weight := CASE NEW.impact
    WHEN 'low' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'high' THEN 3
    WHEN 'critical' THEN 4
  END;

  probability_weight := CASE NEW.probability
    WHEN 'low' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'high' THEN 3
  END;

  -- Calculate score (1-100 scale)
  NEW.risk_score := (impact_weight * probability_weight * 100) / 12;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_risk_score
BEFORE INSERT OR UPDATE ON integration_risks
FOR EACH ROW EXECUTE FUNCTION calculate_risk_score();

-- Function: Calculate synergy risk-adjusted value
CREATE OR REPLACE FUNCTION calculate_risk_adjusted_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_target IS NOT NULL AND NEW.probability_of_realization IS NOT NULL THEN
    NEW.risk_adjusted_value := (NEW.total_target * NEW.probability_of_realization) / 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_risk_adjusted_value
BEFORE INSERT OR UPDATE ON integration_synergies
FOR EACH ROW EXECUTE FUNCTION calculate_risk_adjusted_value();

-- Function: Update KPI variance
CREATE OR REPLACE FUNCTION update_kpi_variance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_value IS NOT NULL AND NEW.current_value IS NOT NULL AND NEW.target_value != 0 THEN
    NEW.variance_percentage := ((NEW.current_value - NEW.target_value) / NEW.target_value) * 100;

    -- Update status based on variance
    NEW.status := CASE
      WHEN ABS(NEW.variance_percentage) <= 10 THEN 'on_track'
      WHEN ABS(NEW.variance_percentage) <= 25 THEN 'at_risk'
      ELSE 'off_track'
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kpi_variance
BEFORE INSERT OR UPDATE ON integration_kpis
FOR EACH ROW EXECUTE FUNCTION update_kpi_variance();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE integration_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_day1_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_synergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_kpis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_playbooks
CREATE POLICY "Users can view playbooks in their data rooms"
ON integration_playbooks FOR SELECT
TO authenticated
USING (
  data_room_id IN (
    SELECT dr.id FROM data_rooms dr
    WHERE dr.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = dr.id
      AND dra.user_id = auth.uid()
      AND dra.revoked_at IS NULL
    )
  )
);

CREATE POLICY "Users can create playbooks in their data rooms"
ON integration_playbooks FOR INSERT
TO authenticated
WITH CHECK (
  data_room_id IN (
    SELECT dr.id FROM data_rooms dr
    WHERE dr.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = dr.id
      AND dra.user_id = auth.uid()
      AND dra.permission_level IN ('owner', 'editor')
      AND dra.revoked_at IS NULL
    )
  )
);

CREATE POLICY "Users can update playbooks in their data rooms"
ON integration_playbooks FOR UPDATE
TO authenticated
USING (
  data_room_id IN (
    SELECT dr.id FROM data_rooms dr
    WHERE dr.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = dr.id
      AND dra.user_id = auth.uid()
      AND dra.permission_level IN ('owner', 'editor')
      AND dra.revoked_at IS NULL
    )
  )
);

CREATE POLICY "Users can delete playbooks in their data rooms"
ON integration_playbooks FOR DELETE
TO authenticated
USING (
  data_room_id IN (
    SELECT dr.id FROM data_rooms dr
    WHERE dr.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = dr.id
      AND dra.user_id = auth.uid()
      AND dra.permission_level = 'owner'
      AND dra.revoked_at IS NULL
    )
  )
);

-- RLS Policies for child tables (phases, workstreams, activities, etc.)
-- Inherit access from parent playbook

CREATE POLICY "Users can view phases in accessible playbooks"
ON integration_phases FOR SELECT
TO authenticated
USING (
  playbook_id IN (
    SELECT id FROM integration_playbooks
    WHERE data_room_id IN (
      SELECT dr.id FROM data_rooms dr
      WHERE dr.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM data_room_access dra
        WHERE dra.data_room_id = dr.id
        AND dra.user_id = auth.uid()
        AND dra.revoked_at IS NULL
      )
    )
  )
);

CREATE POLICY "Users can modify phases in accessible playbooks"
ON integration_phases FOR ALL
TO authenticated
USING (
  playbook_id IN (
    SELECT id FROM integration_playbooks
    WHERE data_room_id IN (
      SELECT dr.id FROM data_rooms dr
      WHERE dr.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM data_room_access dra
        WHERE dra.data_room_id = dr.id
        AND dra.user_id = auth.uid()
        AND dra.permission_level IN ('owner', 'editor')
        AND dra.revoked_at IS NULL
      )
    )
  )
);

-- Repeat similar policies for other child tables
CREATE POLICY "Users can view workstreams in accessible playbooks"
ON integration_workstreams FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify workstreams in accessible playbooks"
ON integration_workstreams FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can view activities in accessible playbooks"
ON integration_activities FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify activities in accessible playbooks"
ON integration_activities FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can view day1 checklist in accessible playbooks"
ON integration_day1_checklist FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify day1 checklist in accessible playbooks"
ON integration_day1_checklist FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can view synergies in accessible playbooks"
ON integration_synergies FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify synergies in accessible playbooks"
ON integration_synergies FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can view risks in accessible playbooks"
ON integration_risks FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify risks in accessible playbooks"
ON integration_risks FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can view kpis in accessible playbooks"
ON integration_kpis FOR SELECT TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

CREATE POLICY "Users can modify kpis in accessible playbooks"
ON integration_kpis FOR ALL TO authenticated
USING (playbook_id IN (SELECT id FROM integration_playbooks));

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE integration_playbooks IS 'Main integration playbook records with AI-generated 100-day M&A plans';
COMMENT ON TABLE integration_phases IS 'Integration phases: Day 1-30, 31-60, 61-100, 100+';
COMMENT ON TABLE integration_workstreams IS 'Functional workstreams: IT, HR, Finance, Operations, Commercial';
COMMENT ON TABLE integration_activities IS 'Granular integration tasks with dependencies and tracking';
COMMENT ON TABLE integration_day1_checklist IS 'Critical Day 1 checklist items for closing day';
COMMENT ON TABLE integration_synergies IS 'Cost and revenue synergies with realization tracking';
COMMENT ON TABLE integration_risks IS 'Integration risk register with mitigation plans';
COMMENT ON TABLE integration_kpis IS 'Integration success metrics and KPI tracking';
