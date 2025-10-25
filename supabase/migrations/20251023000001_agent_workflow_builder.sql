-- Agent Workflow Builder Schema
-- Enables visual chaining of agents with DAG execution

-- Workflow templates
CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',

  -- Workflow structure (DAG)
  nodes JSONB NOT NULL DEFAULT '[]', -- Array of workflow nodes
  edges JSONB NOT NULL DEFAULT '[]', -- Array of edges connecting nodes

  -- Metadata
  is_template BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',

  -- Organization & ownership
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS agent_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,

  -- Execution context
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'api')),

  -- Input/Output
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',

  -- Execution state
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_node_id TEXT,

  -- Node execution results
  node_results JSONB DEFAULT '{}', -- { nodeId: { status, output, error, duration } }

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Metrics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow execution logs (for real-time monitoring)
CREATE TABLE IF NOT EXISTS agent_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES agent_workflow_executions(id) ON DELETE CASCADE,

  -- Log details
  node_id TEXT,
  level TEXT DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved workflow templates (for quick reuse)
CREATE TABLE IF NOT EXISTS agent_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'research', 'enrichment', 'scoring', etc.

  -- Template structure
  workflow_config JSONB NOT NULL,

  -- Visibility
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_workflows_org ON agent_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_created_by ON agent_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_status ON agent_workflows(status);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_tags ON agent_workflows USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON agent_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON agent_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_triggered_by ON agent_workflow_executions(triggered_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON agent_workflow_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_execution ON agent_workflow_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created_at ON agent_workflow_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON agent_workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON agent_workflow_templates(is_public);

-- RLS Policies
ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_workflow_templates ENABLE ROW LEVEL SECURITY;

-- Workflows: Users can view workflows in their organization
CREATE POLICY "Users can view their org workflows"
  ON agent_workflows FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workflows: Users can create workflows in their organization
CREATE POLICY "Users can create workflows"
  ON agent_workflows FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workflows: Users can update workflows they created or in their org
CREATE POLICY "Users can update their org workflows"
  ON agent_workflows FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Workflows: Users can delete workflows they created
CREATE POLICY "Users can delete their workflows"
  ON agent_workflows FOR DELETE
  USING (created_by = auth.uid());

-- Executions: Users can view executions in their organization
CREATE POLICY "Users can view their org executions"
  ON agent_workflow_executions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM agent_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Executions: Users can create executions for their org workflows
CREATE POLICY "Users can create executions"
  ON agent_workflow_executions FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM agent_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Logs: Users can view logs for their org executions
CREATE POLICY "Users can view their org execution logs"
  ON agent_workflow_logs FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM agent_workflow_executions
      WHERE workflow_id IN (
        SELECT id FROM agent_workflows
        WHERE organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- Templates: Everyone can view public templates
CREATE POLICY "Anyone can view public templates"
  ON agent_workflow_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

-- Templates: Users can create templates
CREATE POLICY "Users can create templates"
  ON agent_workflow_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Templates: Users can update their templates
CREATE POLICY "Users can update their templates"
  ON agent_workflow_templates FOR UPDATE
  USING (created_by = auth.uid());

-- Templates: Users can delete their templates
CREATE POLICY "Users can delete their templates"
  ON agent_workflow_templates FOR DELETE
  USING (created_by = auth.uid());

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_agent_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_workflows_updated_at
  BEFORE UPDATE ON agent_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_workflow_updated_at();

CREATE TRIGGER agent_workflow_executions_updated_at
  BEFORE UPDATE ON agent_workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_workflow_updated_at();

CREATE TRIGGER agent_workflow_templates_updated_at
  BEFORE UPDATE ON agent_workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_workflow_updated_at();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_workflow_templates
  SET usage_count = usage_count + 1
  WHERE id = template_uuid;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE agent_workflows IS 'Visual workflow definitions for chaining agents';
COMMENT ON TABLE agent_workflow_executions IS 'Execution history and results for workflows';
COMMENT ON TABLE agent_workflow_logs IS 'Real-time logs for workflow execution monitoring';
COMMENT ON TABLE agent_workflow_templates IS 'Reusable workflow templates for quick setup';
