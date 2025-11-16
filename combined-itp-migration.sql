-- ============================================================================
-- COMBINED ITP FEATURE MIGRATION
-- Apply this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: TAG MANAGEMENT SYSTEM
-- ============================================================================

-- Tags table (master list)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 50),
  color TEXT NOT NULL DEFAULT '#3b82f6' CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  icon TEXT CHECK (icon IS NULL OR length(icon) <= 50),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(user_id, usage_count DESC);

-- Business tags junction table
CREATE TABLE IF NOT EXISTS business_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_by_itp_id UUID REFERENCES ideal_target_profiles(id) ON DELETE SET NULL,
  is_auto_applied BOOLEAN NOT NULL DEFAULT false,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, tag_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_tags_business ON business_tags(business_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_tag ON business_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_user ON business_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_itp ON business_tags(applied_by_itp_id) WHERE applied_by_itp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_tags_auto ON business_tags(is_auto_applied) WHERE is_auto_applied = true;
CREATE INDEX IF NOT EXISTS idx_business_tags_business_user ON business_tags(business_id, user_id);

-- ============================================================================
-- PART 2: IDEAL TARGET PROFILES
-- ============================================================================

-- Ideal Target Profiles table
CREATE TABLE IF NOT EXISTS ideal_target_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),
  criteria JSONB NOT NULL,
  scoring_weights JSONB NOT NULL DEFAULT '{
    "firmographics": 0.2,
    "size": 0.2,
    "growth": 0.2,
    "funding": 0.15,
    "marketPresence": 0.15,
    "workflow": 0.1
  }'::jsonb,
  min_match_score INTEGER NOT NULL DEFAULT 70 CHECK (min_match_score >= 0 AND min_match_score <= 100),
  auto_tag TEXT CHECK (auto_tag IS NULL OR length(auto_tag) <= 50),
  auto_add_to_list_id UUID REFERENCES business_lists(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  matched_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itp_user_id ON ideal_target_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_itp_active ON ideal_target_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_itp_favorite ON ideal_target_profiles(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_itp_created_at ON ideal_target_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itp_last_executed ON ideal_target_profiles(last_executed_at DESC NULLS LAST);

-- ITP Matches table
CREATE TABLE IF NOT EXISTS itp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_id UUID NOT NULL REFERENCES ideal_target_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  matching_details JSONB NOT NULL,
  user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'pending')),
  user_notes TEXT CHECK (user_notes IS NULL OR length(user_notes) <= 1000),
  action_taken_at TIMESTAMP WITH TIME ZONE,
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(itp_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_itp_matches_itp ON itp_matches(itp_id);
CREATE INDEX IF NOT EXISTS idx_itp_matches_business ON itp_matches(business_id);
CREATE INDEX IF NOT EXISTS idx_itp_matches_score ON itp_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_itp_matches_action ON itp_matches(user_action) WHERE user_action IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itp_matches_pending ON itp_matches(itp_id, user_action) WHERE user_action = 'pending';
CREATE INDEX IF NOT EXISTS idx_itp_matches_recent ON itp_matches(matched_at DESC);

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideal_target_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itp_matches ENABLE ROW LEVEL SECURITY;

-- Tags policies
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tags" ON tags;
CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tags" ON tags;
CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tags" ON tags;
CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Business tags policies
DROP POLICY IF EXISTS "Users can view their own business tags" ON business_tags;
CREATE POLICY "Users can view their own business tags"
  ON business_tags FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own business tags" ON business_tags;
CREATE POLICY "Users can create their own business tags"
  ON business_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business tags" ON business_tags;
CREATE POLICY "Users can update their own business tags"
  ON business_tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own business tags" ON business_tags;
CREATE POLICY "Users can delete their own business tags"
  ON business_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ITP policies
DROP POLICY IF EXISTS "Users can view their own ITPs" ON ideal_target_profiles;
CREATE POLICY "Users can view their own ITPs"
  ON ideal_target_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ITPs" ON ideal_target_profiles;
CREATE POLICY "Users can create their own ITPs"
  ON ideal_target_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ITPs" ON ideal_target_profiles;
CREATE POLICY "Users can update their own ITPs"
  ON ideal_target_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ITPs" ON ideal_target_profiles;
CREATE POLICY "Users can delete their own ITPs"
  ON ideal_target_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ITP matches policies
DROP POLICY IF EXISTS "Users can view matches for their ITPs" ON itp_matches;
CREATE POLICY "Users can view matches for their ITPs"
  ON itp_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create matches for their ITPs" ON itp_matches;
CREATE POLICY "Users can create matches for their ITPs"
  ON itp_matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update matches for their ITPs" ON itp_matches;
CREATE POLICY "Users can update matches for their ITPs"
  ON itp_matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete matches for their ITPs" ON itp_matches;
CREATE POLICY "Users can delete matches for their ITPs"
  ON itp_matches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to increment ITP execution count
CREATE OR REPLACE FUNCTION increment_itp_execution(
  p_itp_id UUID,
  p_new_matches INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ideal_target_profiles
  SET
    execution_count = execution_count + 1,
    last_executed_at = NOW(),
    matched_count = matched_count + p_new_matches,
    last_matched_at = CASE WHEN p_new_matches > 0 THEN NOW() ELSE last_matched_at END,
    updated_at = NOW()
  WHERE id = p_itp_id;
END;
$$;

-- Function to get ITP match statistics
CREATE OR REPLACE FUNCTION get_itp_match_stats(p_itp_id UUID)
RETURNS TABLE (
  total_matches BIGINT,
  pending_matches BIGINT,
  accepted_matches BIGINT,
  rejected_matches BIGINT,
  avg_match_score NUMERIC,
  top_match_score INTEGER,
  recent_matches BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_matches,
    COUNT(*) FILTER (WHERE user_action = 'pending')::BIGINT AS pending_matches,
    COUNT(*) FILTER (WHERE user_action = 'accepted')::BIGINT AS accepted_matches,
    COUNT(*) FILTER (WHERE user_action = 'rejected')::BIGINT AS rejected_matches,
    ROUND(AVG(match_score), 2) AS avg_match_score,
    MAX(match_score) AS top_match_score,
    COUNT(*) FILTER (WHERE matched_at > NOW() - INTERVAL '7 days')::BIGINT AS recent_matches
  FROM itp_matches
  WHERE itp_id = p_itp_id;
END;
$$;

-- Function to get user's ITP count
CREATE OR REPLACE FUNCTION get_user_itp_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM ideal_target_profiles
  WHERE user_id = p_user_id;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ideal_target_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON itp_matches TO authenticated;

GRANT EXECUTE ON FUNCTION increment_itp_execution(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_itp_match_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_itp_count(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'ITP Feature Migration Completed Successfully!' AS status;
