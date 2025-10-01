-- ============================================
-- STREAMS™ - PROJECT WORKSPACES SYSTEM
-- Migration: 20250130000001_create_streams_system.sql
-- Description: Core tables for Streams™ workspace functionality
-- ============================================

-- ============================================
-- 1. STREAMS TABLE (Project Workspaces)
-- ============================================
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6366f1',

  -- Stream Type
  stream_type TEXT NOT NULL DEFAULT 'project' CHECK (stream_type IN (
    'project',      -- General project
    'deal',         -- Specific deal pipeline
    'campaign',     -- Marketing/outreach campaign
    'research',     -- Research initiative
    'territory'     -- Geographic/market territory
  )),

  -- Workflow Stages (customizable per stream)
  stages JSONB DEFAULT '[
    {"id": "discover", "name": "Discover", "color": "#3b82f6"},
    {"id": "research", "name": "Research", "color": "#8b5cf6"},
    {"id": "outreach", "name": "Outreach", "color": "#ec4899"},
    {"id": "qualified", "name": "Qualified", "color": "#10b981"},
    {"id": "closed", "name": "Closed", "color": "#64748b"}
  ]',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  archived_at TIMESTAMPTZ,

  -- Ownership
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. STREAM MEMBERS TABLE (Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role-based permissions
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
    'owner',     -- Full control + delete stream
    'editor',    -- Add/edit/remove items
    'viewer',    -- Read-only access
    'guest'      -- Limited access (specific items only)
  )),

  -- Notification Preferences
  notification_settings JSONB DEFAULT '{
    "new_items": true,
    "status_changes": true,
    "mentions": true,
    "comments": true,
    "daily_digest": false,
    "instant_critical": true
  }',

  -- Invitation tracking
  invited_by UUID REFERENCES profiles(id),
  invitation_accepted_at TIMESTAMPTZ,

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  UNIQUE(stream_id, user_id)
);

-- ============================================
-- 3. STREAM ITEMS TABLE (Content within Streams)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,

  -- Item Type & Reference
  item_type TEXT NOT NULL CHECK (item_type IN (
    'company',           -- Business from search
    'search_query',      -- Saved search
    'list',              -- Prospect list
    'note',              -- Text note
    'ai_research',       -- ResearchGPT™ report
    'opportunity',       -- Opp Scan result
    'stakeholder',       -- Key person
    'task',              -- Action item
    'file',              -- Document upload
    'link'               -- External URL
  )),

  -- Foreign Keys (nullable, depends on item_type)
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  list_id UUID REFERENCES business_lists(id) ON DELETE CASCADE,
  research_id UUID,

  -- Item Data
  title TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}',

  -- Workflow Stage
  stage_id TEXT,

  -- Priority & Tags
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',

  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ,

  -- Progress
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'completed', 'archived')),

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Ownership
  added_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 4. STREAM ACTIVITIES TABLE (Audit Log)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Activity Type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'stream_created', 'stream_updated', 'stream_archived',
    'member_added', 'member_removed', 'role_changed',
    'item_added', 'item_updated', 'item_moved', 'item_deleted',
    'comment_added', 'task_completed',
    'stage_changed', 'assignment_changed',
    'ai_update'
  )),

  -- Activity Target
  target_type TEXT,
  target_id UUID,

  -- Activity Description
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Visibility
  is_system BOOLEAN DEFAULT false,
  importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. STREAM COMMENTS TABLE (Threaded Discussions)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  item_id UUID REFERENCES stream_items(id) ON DELETE CASCADE,

  -- Comment Content
  content TEXT NOT NULL,
  content_html TEXT,

  -- Threading
  parent_comment_id UUID REFERENCES stream_comments(id) ON DELETE CASCADE,
  thread_id UUID,

  -- Mentions
  mentioned_users UUID[] DEFAULT '{}',

  -- Reactions
  reactions JSONB DEFAULT '{}',

  -- Status
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Ownership
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. STREAM PRESENCE TABLE (Real-Time Collaboration)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Presence Data
  current_view TEXT,
  cursor_position JSONB,
  last_action TEXT,

  -- Session
  session_id TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(stream_id, user_id, session_id)
);

-- ============================================
-- 7. STREAM NOTIFICATIONS TABLE (Smart Alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS stream_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification Type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'item_added', 'item_updated', 'item_assigned',
    'comment_added', 'mentioned', 'task_due',
    'stage_changed', 'member_added',
    'ai_insight', 'critical_update'
  )),

  -- Notification Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,

  -- Related Entities
  item_id UUID REFERENCES stream_items(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES stream_comments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),

  -- Priority
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,

  -- Delivery
  delivered_via TEXT[] DEFAULT '{"in_app"}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Streams
CREATE INDEX IF NOT EXISTS idx_streams_org_status ON streams(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streams_name ON streams USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_streams_description ON streams USING gin(to_tsvector('english', coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_streams_type ON streams(stream_type, status);
CREATE INDEX IF NOT EXISTS idx_streams_created_by ON streams(created_by);

-- Stream Members
CREATE INDEX IF NOT EXISTS idx_stream_members_user ON stream_members(user_id, stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_members_stream ON stream_members(stream_id, role);
CREATE INDEX IF NOT EXISTS idx_stream_members_last_accessed ON stream_members(last_accessed_at DESC);

-- Stream Items
CREATE INDEX IF NOT EXISTS idx_stream_items_stream ON stream_items(stream_id, status, position);
CREATE INDEX IF NOT EXISTS idx_stream_items_business ON stream_items(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stream_items_assigned ON stream_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stream_items_title ON stream_items USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_stream_items_description ON stream_items USING gin(to_tsvector('english', coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_stream_items_tags ON stream_items USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_stream_items_stage ON stream_items(stream_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_stream_items_due_date ON stream_items(due_date) WHERE due_date IS NOT NULL;

-- Stream Activities
CREATE INDEX IF NOT EXISTS idx_stream_activities_stream_time ON stream_activities(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_activities_user ON stream_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_activities_type ON stream_activities(activity_type, created_at DESC);

-- Stream Comments
CREATE INDEX IF NOT EXISTS idx_stream_comments_stream ON stream_comments(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_comments_item ON stream_comments(item_id, created_at DESC) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stream_comments_thread ON stream_comments(thread_id, created_at) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stream_comments_author ON stream_comments(author_id);

-- Stream Presence
CREATE INDEX IF NOT EXISTS idx_stream_presence_stream_user ON stream_presence(stream_id, user_id, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_stream_presence_stale ON stream_presence(last_seen_at) WHERE last_seen_at < NOW() - INTERVAL '5 minutes';

-- Stream Notifications
CREATE INDEX IF NOT EXISTS idx_stream_notifications_user_unread ON stream_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_notifications_stream ON stream_notifications(stream_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_notifications ENABLE ROW LEVEL SECURITY;

-- Streams Policies
CREATE POLICY "Users view member streams" ON streams
  FOR SELECT USING (
    id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users create streams in org" ON streams
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners/editors update streams" ON streams
  FOR UPDATE USING (
    id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners delete streams" ON streams
  FOR DELETE USING (
    id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Stream Members Policies
CREATE POLICY "Members view stream members" ON stream_members
  FOR SELECT USING (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners/editors add members" ON stream_members
  FOR INSERT WITH CHECK (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners/editors remove members" ON stream_members
  FOR DELETE USING (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Stream Items Policies
CREATE POLICY "Members view stream items" ON stream_items
  FOR SELECT USING (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Editors add items" ON stream_items
  FOR INSERT WITH CHECK (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors update items" ON stream_items
  FOR UPDATE USING (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors delete items" ON stream_items
  FOR DELETE USING (
    stream_id IN (
      SELECT stream_id FROM stream_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Stream Activities Policies
CREATE POLICY "Members view stream activities" ON stream_activities
  FOR SELECT USING (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System creates activities" ON stream_activities
  FOR INSERT WITH CHECK (true);

-- Stream Comments Policies
CREATE POLICY "Members view comments" ON stream_comments
  FOR SELECT USING (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members add comments" ON stream_comments
  FOR INSERT WITH CHECK (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authors update own comments" ON stream_comments
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors delete own comments" ON stream_comments
  FOR DELETE USING (author_id = auth.uid());

-- Stream Presence Policies
CREATE POLICY "Members view presence" ON stream_presence
  FOR SELECT USING (
    stream_id IN (SELECT stream_id FROM stream_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users update own presence" ON stream_presence
  FOR ALL USING (user_id = auth.uid());

-- Stream Notifications Policies
CREATE POLICY "Users view own notifications" ON stream_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System creates notifications" ON stream_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update own notifications" ON stream_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function: Update stream updated_at timestamp
CREATE OR REPLACE FUNCTION update_stream_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update streams.updated_at
CREATE TRIGGER trigger_update_stream_timestamp
  BEFORE UPDATE ON streams
  FOR EACH ROW
  EXECUTE FUNCTION update_stream_updated_at();

-- Function: Auto-add creator as owner member
CREATE OR REPLACE FUNCTION auto_add_stream_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stream_members (stream_id, user_id, role, invitation_accepted_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Add creator as owner when stream is created
CREATE TRIGGER trigger_auto_add_stream_owner
  AFTER INSERT ON streams
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_stream_owner();

-- Function: Log activity when items are created
CREATE OR REPLACE FUNCTION log_item_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO stream_activities (stream_id, user_id, activity_type, target_type, target_id, description)
    VALUES (
      NEW.stream_id,
      NEW.added_by,
      'item_added',
      'item',
      NEW.id,
      'Added ' || NEW.item_type || ': ' || NEW.title
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log stage changes
    IF (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
      INSERT INTO stream_activities (stream_id, user_id, activity_type, target_type, target_id, description)
      VALUES (
        NEW.stream_id,
        NEW.updated_by,
        'stage_changed',
        'item',
        NEW.id,
        'Moved ' || NEW.title || ' to new stage'
      );
    END IF;

    -- Log completion
    IF (OLD.status != 'completed' AND NEW.status = 'completed') THEN
      INSERT INTO stream_activities (stream_id, user_id, activity_type, target_type, target_id, description)
      VALUES (
        NEW.stream_id,
        NEW.updated_by,
        'task_completed',
        'item',
        NEW.id,
        'Completed: ' || NEW.title
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log item activities
CREATE TRIGGER trigger_log_item_activity
  AFTER INSERT OR UPDATE ON stream_items
  FOR EACH ROW
  EXECUTE FUNCTION log_item_activity();

-- Function: Cleanup stale presence (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM stream_presence
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule cleanup job separately if pg_cron is available
-- SELECT cron.schedule('cleanup-stale-stream-presence', '* * * * *', $$SELECT cleanup_stale_presence()$$);

-- ============================================
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_items TO authenticated;
GRANT SELECT, INSERT ON stream_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stream_presence TO authenticated;
GRANT SELECT, INSERT, UPDATE ON stream_notifications TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Streams™ core infrastructure is now ready
-- Next: Create TypeScript types and API routes
