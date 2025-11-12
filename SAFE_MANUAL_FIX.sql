-- ============================================================================
-- SAFE MANUAL FIX FOR MISSING DATABASE OBJECTS (IDEMPOTENT)
-- ============================================================================
-- This version safely checks for existing objects before creating them
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- URL: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
-- ============================================================================

-- Fix 1: Create get_user_permissions function (safe - uses CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_role TEXT;
  permissions TEXT[];
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id;
  IF user_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  CASE user_role
    WHEN 'super_admin' THEN
      permissions := ARRAY['manage:all','manage:organizations','manage:users','manage:billing','manage:settings','view:analytics','manage:data_rooms','manage:streams','manage:agents','manage:research','manage:companies','manage:exports','manage:integrations','manage:api_keys'];
    WHEN 'enterprise_admin' THEN
      permissions := ARRAY['manage:organization','manage:users','manage:billing','manage:settings','view:analytics','manage:data_rooms','manage:streams','manage:agents','manage:research','manage:companies','manage:exports','manage:integrations','manage:api_keys'];
    WHEN 'team_admin' THEN
      permissions := ARRAY['manage:team','view:analytics','manage:data_rooms','manage:streams','manage:agents','manage:research','manage:companies','manage:exports'];
    WHEN 'premium' THEN
      permissions := ARRAY['view:analytics','create:data_rooms','create:streams','create:agents','generate:research','view:companies','create:exports','access:premium_features'];
    WHEN 'free' THEN
      permissions := ARRAY['view:companies','create:basic_exports','access:basic_features'];
    ELSE
      permissions := ARRAY[]::TEXT[];
  END CASE;

  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;

-- Fix 2: Create has_permission function (safe - uses CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  user_permissions := get_user_permissions(user_id);
  IF 'manage:all' = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;
  RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT) TO authenticated;

-- Fix 3: Create team_activities table (safe - uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('company_viewed','company_saved','company_shared','research_generated','signal_detected','agent_created','agent_run','stream_created','list_created','deal_updated','comment_added','mention_added','file_uploaded','export_created')),
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes (safe - checks if exists first)
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

-- Enable RLS (safe - no error if already enabled)
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (safe - drops before creating)
DROP POLICY IF EXISTS "Users can view team activities in their org" ON team_activities;
CREATE POLICY "Users can view team activities in their org" ON team_activities FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own activities" ON team_activities;
CREATE POLICY "Users can insert their own activities" ON team_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Fix 4: Feedback Activity RLS (safe - drops before creating)
-- This fixes the feedback submission errors
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON feedback_activity;
CREATE POLICY "Authenticated users can create activity logs"
    ON feedback_activity FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure INSERT is granted (safe - no error if already granted)
DO $$
BEGIN
  GRANT INSERT ON feedback_activity TO authenticated;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if grant already exists
  NULL;
END $$;

-- ============================================================================
-- DONE! Your database objects are now created/updated safely.
-- ============================================================================
