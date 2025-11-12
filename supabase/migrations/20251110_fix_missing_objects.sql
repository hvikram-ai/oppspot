-- Fix Missing Database Objects
-- Created: 2025-11-10
-- Purpose: Create only the missing RPC functions and tables causing 404 errors

-- ============================================================================
-- Fix 1: Ensure get_user_permissions function exists
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_role TEXT;
  permissions TEXT[];
BEGIN
  -- Get user's role from profiles table
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  -- If no role found, return empty array
  IF user_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Define permissions based on role
  CASE user_role
    -- Super Admin: All permissions
    WHEN 'super_admin' THEN
      permissions := ARRAY[
        'manage:all',
        'manage:organizations',
        'manage:users',
        'manage:billing',
        'manage:settings',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports',
        'manage:integrations',
        'manage:api_keys'
      ];

    -- Enterprise Admin: Organization-level management
    WHEN 'enterprise_admin' THEN
      permissions := ARRAY[
        'manage:organization',
        'manage:users',
        'manage:billing',
        'manage:settings',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports',
        'manage:integrations',
        'manage:api_keys'
      ];

    -- Team Admin: Team-level management
    WHEN 'team_admin' THEN
      permissions := ARRAY[
        'manage:team',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports'
      ];

    -- Premium User: Full feature access
    WHEN 'premium' THEN
      permissions := ARRAY[
        'view:analytics',
        'create:data_rooms',
        'create:streams',
        'create:agents',
        'generate:research',
        'view:companies',
        'create:exports',
        'access:premium_features'
      ];

    -- Free User: Basic access
    WHEN 'free' THEN
      permissions := ARRAY[
        'view:companies',
        'create:basic_exports',
        'access:basic_features'
      ];

    -- Default: No permissions
    ELSE
      permissions := ARRAY[]::TEXT[];
  END CASE;

  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;

-- ============================================================================
-- Fix 2: Ensure team_activities table exists
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
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,

  -- Activity Details
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_activities_org_created') THEN
    CREATE INDEX idx_team_activities_org_created ON team_activities(org_id, created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_activities_user') THEN
    CREATE INDEX idx_team_activities_user ON team_activities(user_id, created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_activities_entity') THEN
    CREATE INDEX idx_team_activities_entity ON team_activities(entity_type, entity_id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view team activities in their org" ON team_activities;
CREATE POLICY "Users can view team activities in their org"
  ON team_activities FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own activities" ON team_activities;
CREATE POLICY "Users can insert their own activities"
  ON team_activities FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Fix 3: Ensure has_permission function exists
-- ============================================================================
CREATE OR REPLACE FUNCTION has_permission(
  user_id UUID,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  -- Get user's permissions
  user_permissions := get_user_permissions(user_id);

  -- Check if user has 'manage:all' permission (super admin)
  IF 'manage:all' = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has the specific permission
  RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON FUNCTION get_user_permissions IS 'Returns array of permission strings for a user based on their role';
COMMENT ON FUNCTION has_permission IS 'Checks if a user has a specific permission';
COMMENT ON TABLE team_activities IS 'Tracks team collaboration activities for real-time activity feed';
