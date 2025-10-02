-- TeamPlay™ - Multiplayer Collaboration Features
-- Created: 2025-10-02
-- Purpose: Enable real-time team collaboration and activity tracking

-- ============================================================================
-- Team Activities Table (Activity Feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Activity Type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'company_viewed',
    'company_saved',
    'company_shared',
    'research_generated',
    'signal_detected',
    'agent_created',
    'agent_run',
    'stream_created',
    'list_created',
    'deal_updated',
    'comment_added',
    'mention_added',
    'file_uploaded',
    'export_created'
  )),

  -- Activity Data
  entity_type TEXT, -- 'company', 'stream', 'agent', 'list', etc.
  entity_id UUID,
  entity_name TEXT,

  -- Activity Details
  metadata JSONB DEFAULT '{}',
  -- Examples:
  -- { "company_name": "Acme Inc", "action": "viewed profile" }
  -- { "stream_name": "Q4 Targets", "companies_added": 5 }
  -- { "agent_type": "opportunity_bot", "opportunities_found": 12 }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- User Presence Table (Who's Online)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Presence Status
  status TEXT NOT NULL CHECK (status IN ('online', 'away', 'busy', 'offline')),

  -- Current Location (what page they're on)
  current_page TEXT,
  current_entity_type TEXT,
  current_entity_id UUID,

  -- Device Info
  user_agent TEXT,
  ip_address INET,

  -- Timestamps
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one presence record per user
  UNIQUE(user_id)
);

-- ============================================================================
-- Comments Table (Team Discussions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Comment Target
  entity_type TEXT NOT NULL, -- 'company', 'stream', 'research_report', etc.
  entity_id UUID NOT NULL,

  -- Comment Content
  content TEXT NOT NULL,
  mentions UUID[], -- Array of user_ids mentioned in comment

  -- Threading
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies

  -- Reactions
  reactions JSONB DEFAULT '{}',
  -- Example: { "👍": ["user_id_1", "user_id_2"], "❤️": ["user_id_3"] }

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Mentions Table (Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Who was mentioned
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Who mentioned them
  mentioned_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Where they were mentioned
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- Mention Content
  context TEXT, -- Snippet of the mention

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Team Assignments Table (Task Ownership)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Who is assigned
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Who assigned them
  assigned_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- What they're assigned to
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Assignment Details
  role TEXT, -- 'owner', 'collaborator', 'reviewer'
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  -- Deadlines
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Team Activities
CREATE INDEX IF NOT EXISTS idx_team_activities_org_id ON team_activities(org_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_user_id ON team_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_created_at ON team_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activities_entity ON team_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_type ON team_activities(activity_type);

-- User Presence
CREATE INDEX IF NOT EXISTS idx_user_presence_org_id ON user_presence(org_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_org_id ON comments(org_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Mentions
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_is_read ON mentions(is_read);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON mentions(created_at DESC);

-- Team Assignments
CREATE INDEX IF NOT EXISTS idx_team_assignments_assigned_to ON team_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_entity ON team_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_status ON team_assignments(status);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;

-- Team Activities policies
CREATE POLICY "Users can view their org's activities"
  ON team_activities FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create activities for their org"
  ON team_activities FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
    user_id = auth.uid()
  );

-- User Presence policies
CREATE POLICY "Users can view their org's presence"
  ON user_presence FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own presence"
  ON user_presence FOR ALL
  USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Users can view their org's comments"
  ON comments FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create comments for their org"
  ON comments FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- Mentions policies
CREATE POLICY "Users can view their own mentions"
  ON mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid() OR
    mentioned_by_user_id = auth.uid()
  );

CREATE POLICY "Users can create mentions in their org"
  ON mentions FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
    mentioned_by_user_id = auth.uid()
  );

CREATE POLICY "Users can update their own mentions"
  ON mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Team Assignments policies
CREATE POLICY "Users can view their org's assignments"
  ON team_assignments FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create assignments in their org"
  ON team_assignments FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Assigned users can update their assignments"
  ON team_assignments FOR UPDATE
  USING (assigned_to_user_id = auth.uid() OR assigned_by_user_id = auth.uid());

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teamplay_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_teamplay_updated_at();

CREATE TRIGGER set_updated_at_team_assignments
  BEFORE UPDATE ON team_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_teamplay_updated_at();

-- Function to update user presence
CREATE OR REPLACE FUNCTION upsert_user_presence(
  p_user_id UUID,
  p_org_id UUID,
  p_status TEXT,
  p_current_page TEXT DEFAULT NULL,
  p_current_entity_type TEXT DEFAULT NULL,
  p_current_entity_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (
    user_id,
    org_id,
    status,
    current_page,
    current_entity_type,
    current_entity_id,
    last_seen_at
  ) VALUES (
    p_user_id,
    p_org_id,
    p_status,
    p_current_page,
    p_current_entity_type,
    p_current_entity_id,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    current_page = EXCLUDED.current_page,
    current_entity_type = EXCLUDED.current_entity_type,
    current_entity_id = EXCLUDED.current_entity_id,
    last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create activity and notify team
CREATE OR REPLACE FUNCTION create_team_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO team_activities (
    org_id,
    user_id,
    activity_type,
    entity_type,
    entity_id,
    entity_name,
    metadata
  ) VALUES (
    p_org_id,
    p_user_id,
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_metadata
  )
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE team_activities IS 'Team activity feed for real-time collaboration';
COMMENT ON TABLE user_presence IS 'Real-time user presence and online status';
COMMENT ON TABLE comments IS 'Team comments and discussions on entities';
COMMENT ON TABLE mentions IS 'User mentions and notifications';
COMMENT ON TABLE team_assignments IS 'Task and entity ownership assignments';

COMMENT ON COLUMN team_activities.metadata IS 'JSON metadata specific to activity type';
COMMENT ON COLUMN comments.mentions IS 'Array of user IDs mentioned in the comment';
COMMENT ON COLUMN comments.reactions IS 'JSON object of emoji reactions with user arrays';
