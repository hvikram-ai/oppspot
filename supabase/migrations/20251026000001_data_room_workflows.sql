/**
 * Data Room Workflows Migration
 * Creates tables for workflow management, approvals, tasks, and checklists
 * Phase 3.9 & 3.10 Implementation
 */

-- ============================================================================
-- WORKFLOWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,

  -- Workflow info
  name TEXT NOT NULL,
  description TEXT,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('approval', 'review', 'checklist', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',

  -- Ownership
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_workflows_data_room ON workflows(data_room_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

-- RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Users can see workflows in data rooms they have access to
CREATE POLICY "Users can view workflows in accessible data rooms"
  ON workflows FOR SELECT
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
    )
  );

-- Only owners/editors can create workflows
CREATE POLICY "Owners and editors can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Only owners/editors can update workflows
CREATE POLICY "Owners and editors can update workflows"
  ON workflows FOR UPDATE
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Only owners can delete workflows
CREATE POLICY "Owners can delete workflows"
  ON workflows FOR DELETE
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================================================
-- WORKFLOW STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,

  -- Step info
  name TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('approval', 'review', 'task', 'checklist', 'notification')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),

  -- Assignment
  assigned_to UUID[] NOT NULL DEFAULT '{}',

  -- Dependencies
  depends_on_step_id UUID REFERENCES public.workflow_steps(id),

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, step_order);

-- RLS Policies
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps in accessible workflows"
  ON workflow_steps FOR SELECT
  USING (
    workflow_id IN (
      SELECT w.id FROM workflows w
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and editors can manage workflow steps"
  ON workflow_steps FOR ALL
  USING (
    workflow_id IN (
      SELECT w.id FROM workflows w
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- APPROVAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id),

  -- Request info
  title TEXT NOT NULL,
  description TEXT,

  -- Approver
  requested_from UUID NOT NULL REFERENCES auth.users(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),

  -- Decision
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'needs_changes')),
  decision_notes TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_approval_requests_step ON approval_requests(workflow_step_id);
CREATE INDEX idx_approval_requests_from ON approval_requests(requested_from);
CREATE INDEX idx_approval_requests_decision ON approval_requests(decision);
CREATE INDEX idx_approval_requests_expires ON approval_requests(expires_at) WHERE decision IS NULL;

-- RLS Policies
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant approval requests"
  ON approval_requests FOR SELECT
  USING (
    requested_from = auth.uid() OR
    requested_by = auth.uid() OR
    workflow_step_id IN (
      SELECT ws.id FROM workflow_steps ws
      JOIN workflows w ON ws.workflow_id = w.id
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (
    workflow_step_id IN (
      SELECT ws.id FROM workflow_steps ws
      JOIN workflows w ON ws.workflow_id = w.id
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Approvers can update their approval requests"
  ON approval_requests FOR UPDATE
  USING (requested_from = auth.uid());

-- ============================================================================
-- WORKFLOW TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id),

  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_workflow_tasks_step ON workflow_tasks(workflow_step_id);
CREATE INDEX idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_due ON workflow_tasks(due_date) WHERE status != 'completed';

-- RLS Policies
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks assigned to them or in their data rooms"
  ON workflow_tasks FOR SELECT
  USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    workflow_step_id IN (
      SELECT ws.id FROM workflow_steps ws
      JOIN workflows w ON ws.workflow_id = w.id
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create tasks"
  ON workflow_tasks FOR INSERT
  WITH CHECK (
    workflow_step_id IN (
      SELECT ws.id FROM workflow_steps ws
      JOIN workflows w ON ws.workflow_id = w.id
      JOIN data_room_access dra ON w.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Assignees can update their tasks"
  ON workflow_tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- ============================================================================
-- REVIEW CHECKLISTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.review_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,

  -- Checklist info
  name TEXT NOT NULL,
  description TEXT,
  checklist_type TEXT NOT NULL,

  -- Progress tracking
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,

  -- Ownership
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_review_checklists_data_room ON review_checklists(data_room_id);
CREATE INDEX idx_review_checklists_workflow ON review_checklists(workflow_id);

-- RLS Policies
ALTER TABLE review_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklists in accessible data rooms"
  ON review_checklists FOR SELECT
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and editors can manage checklists"
  ON review_checklists FOR ALL
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- CHECKLIST ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.review_checklists(id) ON DELETE CASCADE,

  -- Item info
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'not_applicable')),

  -- Optional document link
  document_id UUID REFERENCES public.documents(id),

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_status ON checklist_items(status);
CREATE INDEX idx_checklist_items_category ON checklist_items(checklist_id, category);

-- RLS Policies
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in accessible checklists"
  ON checklist_items FOR SELECT
  USING (
    checklist_id IN (
      SELECT rc.id FROM review_checklists rc
      JOIN data_room_access dra ON rc.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in editable checklists"
  ON checklist_items FOR ALL
  USING (
    checklist_id IN (
      SELECT rc.id FROM review_checklists rc
      JOIN data_room_access dra ON rc.data_room_id = dra.data_room_id
      WHERE dra.user_id = auth.uid()
      AND dra.role IN ('owner', 'editor', 'commenter')
    )
  );

-- ============================================================================
-- AUTO-ASSIGNMENT RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_room_id UUID NOT NULL REFERENCES public.data_rooms(id) ON DELETE CASCADE,

  -- Rule configuration
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'load_balanced', 'role_based', 'document_type', 'manual')),
  conditions JSONB NOT NULL DEFAULT '{}',
  assignment_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auto_assignment_rules_data_room ON auto_assignment_rules(data_room_id);
CREATE INDEX idx_auto_assignment_rules_active ON auto_assignment_rules(data_room_id, is_active);

-- RLS Policies
ALTER TABLE auto_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules in accessible data rooms"
  ON auto_assignment_rules FOR SELECT
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can manage assignment rules"
  ON auto_assignment_rules FOR ALL
  USING (
    data_room_id IN (
      SELECT data_room_id FROM data_room_access
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================================================
-- REMINDER LOG TABLE (for preventing duplicate reminders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_key TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reminder_log_key ON reminder_log(reminder_key);
CREATE INDEX idx_reminder_log_sent_at ON reminder_log(sent_at);

-- Auto-cleanup old reminder logs (older than 30 days)
CREATE INDEX idx_reminder_log_cleanup ON reminder_log(created_at)
  WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update checklist progress when items change
CREATE OR REPLACE FUNCTION update_checklist_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE review_checklists
  SET
    total_items = (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = NEW.checklist_id),
    completed_items = (SELECT COUNT(*) FROM checklist_items WHERE checklist_id = NEW.checklist_id AND status = 'completed'),
    updated_at = NOW()
  WHERE id = NEW.checklist_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_checklist_progress
  AFTER INSERT OR UPDATE OR DELETE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_progress();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_workflow_tasks_updated_at
  BEFORE UPDATE ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_review_checklists_updated_at
  BEFORE UPDATE ON review_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflows IS 'Workflow definitions for data room processes';
COMMENT ON TABLE workflow_steps IS 'Individual steps within workflows';
COMMENT ON TABLE approval_requests IS 'Approval requests for documents and workflow steps';
COMMENT ON TABLE workflow_tasks IS 'Tasks assigned to users within workflows';
COMMENT ON TABLE review_checklists IS 'Due diligence checklists';
COMMENT ON TABLE checklist_items IS 'Individual items within checklists';
COMMENT ON TABLE auto_assignment_rules IS 'Rules for automatic task assignment';
COMMENT ON TABLE reminder_log IS 'Log of sent reminders to prevent duplicates';
