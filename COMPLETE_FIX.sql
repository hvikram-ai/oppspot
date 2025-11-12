-- ============================================================================
-- COMPLETE FIX FOR LIVE MONITORING
-- ============================================================================
-- This creates ALL missing objects needed for live monitoring to work
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz/sql/new
-- ============================================================================

-- ============================================================================
-- PART 1: RBAC Functions (get_user_permissions, has_permission)
-- ============================================================================

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
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO anon;

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
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT) TO anon;

-- ============================================================================
-- PART 2: team_activities Table
-- ============================================================================

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

-- Create indexes
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

-- Enable RLS
ALTER TABLE team_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view team activities in their org" ON team_activities;
CREATE POLICY "Users can view team activities in their org" ON team_activities FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own activities" ON team_activities;
CREATE POLICY "Users can insert their own activities" ON team_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 3: ai_digest Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_date DATE DEFAULT CURRENT_DATE,
  priority_score INTEGER CHECK (priority_score BETWEEN 1 AND 10),
  digest_data JSONB NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  generation_duration_ms INTEGER,
  ai_model TEXT DEFAULT 'gpt-4-turbo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_digest_user_date') THEN
    CREATE INDEX idx_ai_digest_user_date ON ai_digest(user_id, digest_date DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_digest_unread') THEN
    CREATE INDEX idx_ai_digest_unread ON ai_digest(user_id, read_at) WHERE read_at IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_digest_created') THEN
    CREATE INDEX idx_ai_digest_created ON ai_digest(created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_digest_user_date_unique') THEN
    CREATE UNIQUE INDEX idx_ai_digest_user_date_unique ON ai_digest(user_id, digest_date);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE ai_digest ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own digest" ON ai_digest;
CREATE POLICY "Users can view own digest" ON ai_digest FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own digest" ON ai_digest;
CREATE POLICY "Users can insert own digest" ON ai_digest FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own digest" ON ai_digest;
CREATE POLICY "Users can update own digest" ON ai_digest FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own digest" ON ai_digest;
CREATE POLICY "Users can delete own digest" ON ai_digest FOR DELETE
USING (auth.uid() = user_id);

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_digest_date_not_future') THEN
    ALTER TABLE ai_digest ADD CONSTRAINT check_digest_date_not_future CHECK (digest_date <= CURRENT_DATE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_digest_data_is_object') THEN
    ALTER TABLE ai_digest ADD CONSTRAINT check_digest_data_is_object CHECK (jsonb_typeof(digest_data) = 'object');
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test functions
SELECT '✅ get_user_permissions test:' as test, get_user_permissions('00000000-0000-0000-0000-000000000000'::uuid) as result;

-- Show created objects
SELECT 'Created Functions:' as summary, routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN ('get_user_permissions', 'has_permission');

SELECT 'Created Tables:' as summary, table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('team_activities', 'ai_digest');

-- ============================================================================
-- DONE! Next steps:
-- 1. Clear browser cache
-- 2. Restart dev server
-- 3. Hard refresh (Ctrl+Shift+R)
-- ============================================================================
