-- ============================================
-- STREAM-AGENT INTEGRATION
-- Migration: 20251003000001_stream_agent_integration.sql
-- Description: Connect Streams (goals) with AI Agents for goal-oriented automation
-- ============================================

-- ============================================
-- 1. ENHANCE STREAMS TABLE WITH GOAL FIELDS
-- ============================================

-- Add goal-related columns to streams
ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS goal_template_id TEXT,
  ADD COLUMN IF NOT EXISTS goal_criteria JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_metrics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS success_criteria JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_progress JSONB DEFAULT '{"completed": 0, "total": 0, "percentage": 0}',
  ADD COLUMN IF NOT EXISTS goal_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS goal_status TEXT DEFAULT 'not_started' CHECK (goal_status IN (
    'not_started',
    'in_progress',
    'on_track',
    'at_risk',
    'completed',
    'failed',
    'paused'
  ));

-- Add comments
COMMENT ON COLUMN streams.goal_template_id IS 'Reference to predefined goal template (e.g., acquisition_targets, market_expansion)';
COMMENT ON COLUMN streams.goal_criteria IS 'Structured ICP/requirements: {industry: ["SaaS"], revenue: {min: 1000000, max: 10000000}, location: ["UK"]}';
COMMENT ON COLUMN streams.target_metrics IS 'Goal targets: {companies_to_find: 50, min_quality_score: 4.0, required_signals: ["funding", "hiring"]}';
COMMENT ON COLUMN streams.success_criteria IS 'Completion criteria: {min_qualified: 30, min_contacted: 10, min_meetings: 5}';
COMMENT ON COLUMN streams.current_progress IS 'Real-time progress: {completed: 35, total: 50, percentage: 70, last_updated: "2025-10-03T10:00:00Z"}';

-- ============================================
-- 2. ENHANCE AI_AGENTS TABLE WITH STREAM LINK
-- ============================================

-- Add stream relationship to agents
ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_role TEXT DEFAULT 'primary' CHECK (agent_role IN (
    'primary',      -- Main agent for the stream
    'enrichment',   -- Adds additional data
    'scoring',      -- Prioritizes/ranks results
    'monitoring',   -- Watches for signals
    'notification'  -- Alerts users
  )),
  ADD COLUMN IF NOT EXISTS execution_priority INTEGER DEFAULT 5 CHECK (execution_priority >= 1 AND execution_priority <= 10);

-- Add comments
COMMENT ON COLUMN ai_agents.stream_id IS 'Optional link to stream this agent works on (enables goal-oriented execution)';
COMMENT ON COLUMN ai_agents.agent_role IS 'Role of agent within stream workflow';
COMMENT ON COLUMN ai_agents.execution_priority IS 'Order of execution (1=first, 10=last) for multi-agent workflows';

-- Create index
CREATE INDEX IF NOT EXISTS idx_ai_agents_stream_id ON ai_agents(stream_id) WHERE stream_id IS NOT NULL;

-- ============================================
-- 3. STREAM-AGENT ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stream_agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Assignment details
  assignment_role TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_role IN (
    'primary', 'enrichment', 'scoring', 'monitoring', 'notification'
  )),
  execution_order INTEGER NOT NULL DEFAULT 1,

  -- Execution settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_execute BOOLEAN NOT NULL DEFAULT false,
  execution_frequency TEXT, -- 'daily', 'weekly', 'on_demand', 'triggered'
  execution_config JSONB DEFAULT '{}',

  -- Dependencies
  depends_on_agent_ids UUID[] DEFAULT '{}', -- Must wait for these agents to complete
  trigger_conditions JSONB DEFAULT '{}', -- Conditions to trigger execution

  -- Metrics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  avg_execution_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(stream_id, agent_id)
);

-- Comments
COMMENT ON TABLE stream_agent_assignments IS 'Junction table linking streams to agents with workflow configuration';
COMMENT ON COLUMN stream_agent_assignments.execution_order IS 'Order in workflow: 1 runs first, 2 runs after 1 completes, etc.';
COMMENT ON COLUMN stream_agent_assignments.depends_on_agent_ids IS 'Array of agent IDs that must complete before this agent runs';
COMMENT ON COLUMN stream_agent_assignments.trigger_conditions IS 'Conditions to auto-trigger: {min_items: 10, new_signals: true}';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stream_agent_assignments_stream ON stream_agent_assignments(stream_id, execution_order);
CREATE INDEX IF NOT EXISTS idx_stream_agent_assignments_agent ON stream_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_stream_agent_assignments_active ON stream_agent_assignments(stream_id, is_active) WHERE is_active = true;

-- ============================================
-- 4. GOAL TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS goal_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('acquisition', 'expansion', 'partnership', 'research', 'monitoring', 'custom')),
  icon TEXT DEFAULT '🎯',

  -- Template configuration
  default_criteria JSONB NOT NULL DEFAULT '{}',
  default_metrics JSONB NOT NULL DEFAULT '{}',
  default_success_criteria JSONB NOT NULL DEFAULT '{}',
  suggested_agents JSONB NOT NULL DEFAULT '[]', -- [{"agent_type": "opportunity_bot", "role": "primary", "order": 1}]

  -- Template metadata
  use_count INTEGER DEFAULT 0,
  avg_success_rate FLOAT,
  avg_completion_days INTEGER,

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE goal_templates IS 'Pre-built templates for common business goals';
COMMENT ON COLUMN goal_templates.suggested_agents IS 'Recommended agent workflow: agent type, role, execution order';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_templates_category ON goal_templates(category);
CREATE INDEX IF NOT EXISTS idx_goal_templates_public ON goal_templates(is_public) WHERE is_public = true;

-- ============================================
-- 5. STREAM INSIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stream_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,

  -- Insight details
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'progress_update',
    'quality_assessment',
    'recommendation',
    'risk_alert',
    'milestone_achieved',
    'optimization_suggestion'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Insight data
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'critical')),
  data JSONB DEFAULT '{}',

  -- Source
  generated_by TEXT NOT NULL, -- 'agent_id', 'system', 'user'
  agent_execution_id UUID REFERENCES agent_executions(id),

  -- Status
  is_read BOOLEAN DEFAULT false,
  is_actionable BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE stream_insights IS 'AI-generated insights and recommendations for streams';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stream_insights_stream ON stream_insights(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_insights_unread ON stream_insights(stream_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_stream_insights_actionable ON stream_insights(stream_id, is_actionable) WHERE is_actionable = true;

-- ============================================
-- 6. AGENT EXECUTION ENHANCEMENTS
-- ============================================

-- Add stream context to agent executions
ALTER TABLE agent_executions
  ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS goal_context JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS results_summary JSONB DEFAULT '{}';

-- Comments
COMMENT ON COLUMN agent_executions.stream_id IS 'Link to stream this execution was for (goal-oriented run)';
COMMENT ON COLUMN agent_executions.goal_context IS 'Snapshot of stream goal criteria at execution time';
COMMENT ON COLUMN agent_executions.results_summary IS 'Summary: {items_created: 45, items_qualified: 30, avg_score: 4.2}';

-- Index
CREATE INDEX IF NOT EXISTS idx_agent_executions_stream ON agent_executions(stream_id, created_at DESC) WHERE stream_id IS NOT NULL;

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE stream_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_insights ENABLE ROW LEVEL SECURITY;

-- Stream Agent Assignments Policies
CREATE POLICY "Users view assignments for their streams"
  ON stream_agent_assignments FOR SELECT
  USING (
    stream_id IN (
      SELECT stream_id FROM stream_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors manage stream agents"
  ON stream_agent_assignments FOR ALL
  USING (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Goal Templates Policies
CREATE POLICY "Everyone views public templates"
  ON goal_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users create templates"
  ON goal_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators update own templates"
  ON goal_templates FOR UPDATE
  USING (created_by = auth.uid());

-- Stream Insights Policies
CREATE POLICY "Members view stream insights"
  ON stream_insights FOR SELECT
  USING (
    stream_id IN (
      SELECT stream_id FROM stream_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System creates insights"
  ON stream_insights FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 8. FUNCTIONS
-- ============================================

-- Function: Update stream progress
CREATE OR REPLACE FUNCTION update_stream_progress(
  p_stream_id UUID,
  p_completed INTEGER,
  p_total INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE streams
  SET
    current_progress = jsonb_build_object(
      'completed', p_completed,
      'total', p_total,
      'percentage', CASE WHEN p_total > 0 THEN (p_completed::float / p_total * 100)::int ELSE 0 END,
      'last_updated', NOW()
    ),
    goal_status = CASE
      WHEN p_completed >= p_total THEN 'completed'
      WHEN p_completed::float / p_total >= 0.8 THEN 'on_track'
      WHEN p_completed::float / p_total >= 0.5 THEN 'in_progress'
      WHEN p_completed::float / p_total >= 0.3 THEN 'at_risk'
      ELSE 'in_progress'
    END,
    updated_at = NOW()
  WHERE id = p_stream_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate stream quality score
CREATE OR REPLACE FUNCTION calculate_stream_quality_score(p_stream_id UUID)
RETURNS FLOAT AS $$
DECLARE
  avg_score FLOAT;
BEGIN
  SELECT AVG((metadata->>'quality_score')::float)
  INTO avg_score
  FROM stream_items
  WHERE stream_id = p_stream_id
    AND metadata->>'quality_score' IS NOT NULL;

  RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-trigger dependent agents
CREATE OR REPLACE FUNCTION trigger_dependent_agents()
RETURNS TRIGGER AS $$
DECLARE
  assignment RECORD;
BEGIN
  -- When an agent execution completes successfully
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Find agents that depend on this one
    FOR assignment IN
      SELECT DISTINCT saa.*
      FROM stream_agent_assignments saa
      WHERE saa.stream_id = NEW.stream_id
        AND NEW.agent_id = ANY(saa.depends_on_agent_ids)
        AND saa.is_active = true
        AND saa.auto_execute = true
    LOOP
      -- Create task for dependent agent
      INSERT INTO agent_tasks (
        agent_id,
        org_id,
        task_type,
        priority,
        payload
      ) VALUES (
        assignment.agent_id,
        NEW.org_id,
        'stream_execution',
        assignment.execution_order,
        jsonb_build_object(
          'stream_id', NEW.stream_id,
          'triggered_by_execution_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-trigger dependent agents
CREATE TRIGGER trigger_dependent_agents_on_completion
  AFTER UPDATE ON agent_executions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dependent_agents();

-- ============================================
-- 9. SEED DATA - GOAL TEMPLATES
-- ============================================

INSERT INTO goal_templates (id, name, description, category, icon, default_criteria, default_metrics, default_success_criteria, suggested_agents) VALUES

('acquisition_targets',
 'Identify Acquisition Targets',
 'Find companies that match your M&A criteria for potential acquisition',
 'acquisition',
 '🎯',
 '{"industry": [], "revenue": {"min": 1000000, "max": 50000000}, "location": [], "growth_rate": {"min": 20}, "employee_count": {"min": 10, "max": 500}}'::jsonb,
 '{"companies_to_find": 50, "min_quality_score": 4.0, "required_signals": ["growth", "profitability"]}'::jsonb,
 '{"min_qualified": 30, "min_researched": 20}'::jsonb,
 '[{"agent_type": "opportunity_bot", "role": "primary", "order": 1}, {"agent_type": "research_gpt", "role": "enrichment", "order": 2}, {"agent_type": "scoring_agent", "role": "scoring", "order": 3}]'::jsonb),

('market_expansion',
 'Expand into New Market',
 'Identify opportunities in a new geographic or vertical market',
 'expansion',
 '🌍',
 '{"target_market": "", "market_size": {"min": 1000000}, "competition_level": "moderate", "regulatory_barriers": "low"}'::jsonb,
 '{"opportunities_to_find": 100, "top_targets": 20}'::jsonb,
 '{"market_validated": true, "competitors_analyzed": 10, "entry_strategy_defined": true}'::jsonb,
 '[{"agent_type": "scout_agent", "role": "primary", "order": 1}, {"agent_type": "research_gpt", "role": "enrichment", "order": 2}]'::jsonb),

('partnership_opportunities',
 'Find Partnership Opportunities',
 'Discover companies for strategic partnerships or alliances',
 'partnership',
 '🤝',
 '{"complementary_offerings": true, "customer_overlap": {"min": 20, "max": 60}, "values_alignment": true}'::jsonb,
 '{"partners_to_find": 30, "meetings_to_schedule": 10}'::jsonb,
 '{"partnerships_initiated": 5, "agreements_signed": 2}'::jsonb,
 '[{"agent_type": "opportunity_bot", "role": "primary", "order": 1}]'::jsonb),

('investment_opportunities',
 'Discover Investment Opportunities',
 'Find companies matching your investment thesis',
 'research',
 '💰',
 '{"funding_stage": ["seed", "series_a"], "sector": [], "valuation": {"max": 50000000}, "growth_metrics": {"revenue_growth": 100}}'::jsonb,
 '{"companies_to_review": 100, "deep_dives": 20, "investments": 3}'::jsonb,
 '{"due_diligence_completed": 15, "term_sheets_issued": 3}'::jsonb,
 '[{"agent_type": "scout_agent", "role": "primary", "order": 1}, {"agent_type": "research_gpt", "role": "enrichment", "order": 2}]'::jsonb),

('competitor_monitoring',
 'Monitor Competitors',
 'Track competitor activities, signals, and market moves',
 'monitoring',
 '👀',
 '{"competitors": [], "signal_types": ["funding", "product_launch", "hiring", "expansion"]}'::jsonb,
 '{"signals_to_track": 50, "alerts_per_week": 5}'::jsonb,
 '{"comprehensive_tracking": true, "weekly_reports": true}'::jsonb,
 '[{"agent_type": "scout_agent", "role": "monitoring", "order": 1}]'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON stream_agent_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON goal_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stream_insights TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Stream-Agent integration is ready!
-- Streams can now be used as goal-oriented workspaces with AI automation
