-- Ideal Target Profile (ITP) System Migration
-- Created: 2025-01-14
-- Purpose: Enable users to define reusable target profiles with AI-powered match scoring

-- ============================================================================
-- 1. IDEAL TARGET PROFILES TABLE
-- ============================================================================

CREATE TABLE ideal_target_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 2000),

  -- Criteria (stores AdvancedFilters structure from types/filters.ts)
  criteria JSONB NOT NULL,

  -- Scoring configuration
  scoring_weights JSONB NOT NULL DEFAULT '{
    "firmographics": 0.2,
    "size": 0.2,
    "growth": 0.2,
    "funding": 0.15,
    "marketPresence": 0.15,
    "workflow": 0.1
  }'::jsonb,
  min_match_score INTEGER NOT NULL DEFAULT 70 CHECK (min_match_score >= 0 AND min_match_score <= 100),

  -- Auto-actions on match
  auto_tag TEXT CHECK (auto_tag IS NULL OR length(auto_tag) <= 50),
  auto_add_to_list_id UUID REFERENCES business_lists(id) ON DELETE SET NULL,

  -- State flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_favorite BOOLEAN NOT NULL DEFAULT false,

  -- Usage tracking
  matched_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_itp_user_id ON ideal_target_profiles(user_id);
CREATE INDEX idx_itp_active ON ideal_target_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_itp_favorite ON ideal_target_profiles(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_itp_created_at ON ideal_target_profiles(created_at DESC);
CREATE INDEX idx_itp_last_executed ON ideal_target_profiles(last_executed_at DESC NULLS LAST);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ideal_target_profiles_updated_at
  BEFORE UPDATE ON ideal_target_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ITP MATCHES TABLE
-- ============================================================================

CREATE TABLE itp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_id UUID NOT NULL REFERENCES ideal_target_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Match scoring
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  matching_details JSONB NOT NULL, -- Per-category breakdown: { overall_score, category_scores: {...} }

  -- User feedback loop
  user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'pending')),
  user_notes TEXT CHECK (user_notes IS NULL OR length(user_notes) <= 1000),
  action_taken_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Prevent duplicate matches for same ITP+business
  UNIQUE(itp_id, business_id)
);

-- Indexes for performance
CREATE INDEX idx_itp_matches_itp ON itp_matches(itp_id);
CREATE INDEX idx_itp_matches_business ON itp_matches(business_id);
CREATE INDEX idx_itp_matches_score ON itp_matches(match_score DESC);
CREATE INDEX idx_itp_matches_action ON itp_matches(user_action) WHERE user_action IS NOT NULL;
CREATE INDEX idx_itp_matches_pending ON itp_matches(itp_id, user_action) WHERE user_action = 'pending';
CREATE INDEX idx_itp_matches_recent ON itp_matches(matched_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE ideal_target_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itp_matches ENABLE ROW LEVEL SECURITY;

-- ITP policies: Users can only manage their own ITPs
CREATE POLICY "Users can view their own ITPs"
  ON ideal_target_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ITPs"
  ON ideal_target_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ITPs"
  ON ideal_target_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ITPs"
  ON ideal_target_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ITP matches policies: Users can only view/modify matches for their ITPs
CREATE POLICY "Users can view matches for their ITPs"
  ON itp_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create matches for their ITPs"
  ON itp_matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update matches for their ITPs"
  ON itp_matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete matches for their ITPs"
  ON itp_matches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM ideal_target_profiles
    WHERE id = itp_matches.itp_id AND user_id = auth.uid()
  ));

-- ============================================================================
-- 4. HELPER FUNCTIONS
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
  recent_matches BIGINT  -- Last 7 days
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
-- 5. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE ideal_target_profiles IS 'Stores user-defined ideal target profiles with filtering criteria and scoring configuration';
COMMENT ON TABLE itp_matches IS 'Records businesses that match ITPs with scoring details and user feedback';

COMMENT ON COLUMN ideal_target_profiles.criteria IS 'JSONB storing AdvancedFilters structure from types/filters.ts';
COMMENT ON COLUMN ideal_target_profiles.scoring_weights IS 'Per-category weights for match score calculation (sum should equal 1.0)';
COMMENT ON COLUMN ideal_target_profiles.min_match_score IS 'Minimum score (0-100) required to consider a business as matching this ITP';
COMMENT ON COLUMN ideal_target_profiles.auto_tag IS 'Tag name to automatically apply to matching businesses';
COMMENT ON COLUMN ideal_target_profiles.auto_add_to_list_id IS 'Business list to automatically add matching businesses to';

COMMENT ON COLUMN itp_matches.matching_details IS 'JSONB with per-category scoring breakdown and matched/missed criteria';
COMMENT ON COLUMN itp_matches.user_action IS 'User feedback: accepted (good match), rejected (bad match), or pending (not reviewed)';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ideal_target_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON itp_matches TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_itp_execution(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_itp_match_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_itp_count(UUID) TO authenticated;
