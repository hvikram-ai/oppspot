-- AI Agents Infrastructure
-- Created: 2025-10-02
-- Purpose: Enable autonomous AI agents (OpportunityBot, Scout Agent, etc.)

-- ============================================================================
-- AI Agents Configuration Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'opportunity_bot',
    'research_gpt',
    'scout_agent',
    'scoring_agent',
    'writer_agent',
    'relationship_agent'
  )),
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_cron TEXT, -- For scheduled agents (e.g., "0 9 * * *" = daily at 9am)
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Agent Execution History
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  metrics JSONB DEFAULT '{}', -- { items_processed, api_calls, tokens_used, cost }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Buying Signals Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS buying_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'funding_round',
    'executive_change',
    'job_posting',
    'technology_adoption',
    'expansion',
    'website_activity',
    'competitor_mention',
    'companies_house_filing',
    'news_mention',
    'social_media_activity'
  )),
  signal_strength TEXT NOT NULL CHECK (signal_strength IN ('very_strong', 'strong', 'moderate', 'weak')),
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  signal_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by TEXT NOT NULL, -- 'scout_agent', 'manual', 'integration', 'opportunity_bot'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acted_upon', 'expired', 'false_positive')),
  acted_upon_at TIMESTAMPTZ,
  acted_upon_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Agent Tasks Queue (for async execution)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1=lowest, 10=highest
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- AI Agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_org_id ON ai_agents(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_agent_type ON ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agents_next_run ON ai_agents(next_run_at) WHERE is_active = true;

-- Agent Executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_org_id ON agent_executions(org_id);

-- Buying Signals
CREATE INDEX IF NOT EXISTS idx_buying_signals_company_id ON buying_signals(company_id);
CREATE INDEX IF NOT EXISTS idx_buying_signals_org_id ON buying_signals(org_id);
CREATE INDEX IF NOT EXISTS idx_buying_signals_detected_at ON buying_signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_buying_signals_status ON buying_signals(status);
CREATE INDEX IF NOT EXISTS idx_buying_signals_signal_type ON buying_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_buying_signals_active ON buying_signals(status, detected_at DESC) WHERE status = 'active';

-- Agent Tasks
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_priority ON agent_tasks(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled ON agent_tasks(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_tasks_org_id ON agent_tasks(org_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- AI Agents policies
CREATE POLICY "Users can view their org's agents"
  ON ai_agents FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create agents for their org"
  ON ai_agents FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's agents"
  ON ai_agents FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org's agents"
  ON ai_agents FOR DELETE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Agent Executions policies
CREATE POLICY "Users can view their org's executions"
  ON agent_executions FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Buying Signals policies
CREATE POLICY "Users can view their org's signals"
  ON buying_signals FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create signals for their org"
  ON buying_signals FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's signals"
  ON buying_signals FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Agent Tasks policies
CREATE POLICY "Users can view their org's tasks"
  ON agent_tasks FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ai_agents
CREATE TRIGGER set_updated_at_ai_agents
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next run time based on cron
CREATE OR REPLACE FUNCTION calculate_next_run(cron_expr TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Simplified cron parsing (just for daily/hourly for now)
  -- TODO: Use pg_cron or more sophisticated parsing
  IF cron_expr LIKE '0 % * * *' THEN
    -- Daily at specific hour
    RETURN NOW() + INTERVAL '1 day';
  ELSIF cron_expr LIKE '% * * * *' THEN
    -- Every hour
    RETURN NOW() + INTERVAL '1 hour';
  ELSE
    RETURN NOW() + INTERVAL '1 day';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE ai_agents IS 'Configuration for autonomous AI agents';
COMMENT ON TABLE agent_executions IS 'History of agent execution runs with metrics';
COMMENT ON TABLE buying_signals IS 'Detected buying signals for companies';
COMMENT ON TABLE agent_tasks IS 'Queue for async agent task execution';

COMMENT ON COLUMN ai_agents.schedule_cron IS 'Cron expression for scheduled runs (e.g., "0 9 * * *" for daily at 9am)';
COMMENT ON COLUMN agent_executions.metrics IS 'JSON object with execution metrics: {items_processed, api_calls, tokens_used, cost}';
COMMENT ON COLUMN buying_signals.signal_data IS 'JSON data specific to signal type (job_posting, funding details, etc.)';
COMMENT ON COLUMN agent_tasks.priority IS 'Task priority 1-10 (1=lowest, 10=highest)';

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert a sample Scout Agent (commented out for production)
-- INSERT INTO ai_agents (org_id, agent_type, name, description, configuration, is_active)
-- VALUES (
--   (SELECT id FROM organizations LIMIT 1),
--   'scout_agent',
--   'Daily Signal Scout',
--   'Monitors buying signals daily',
--   '{"signals": ["job_posting", "funding_round"], "threshold": 0.7}'::jsonb,
--   true
-- );
