-- Tag Management System Migration
-- Created: 2025-01-14
-- Purpose: Centralized tag system for businesses with ITP attribution

-- ============================================================================
-- 1. TAGS TABLE (Master Tag List)
-- ============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tag details
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 50),
  color TEXT NOT NULL DEFAULT '#3b82f6' CHECK (color ~* '^#[0-9A-Fa-f]{6}$'), -- Hex color validation
  icon TEXT CHECK (icon IS NULL OR length(icon) <= 50), -- Icon name (e.g., 'tag', 'star', 'heart')
  description TEXT CHECK (description IS NULL OR length(description) <= 500),

  -- Usage tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: user can't have duplicate tag names
  UNIQUE(user_id, name)
);

-- Indexes for performance
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(user_id, name);
CREATE INDEX idx_tags_usage ON tags(user_id, usage_count DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. BUSINESS_TAGS TABLE (Junction Table)
-- ============================================================================

CREATE TABLE business_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ITP attribution (if tag was applied by ITP auto-matching)
  applied_by_itp_id UUID REFERENCES ideal_target_profiles(id) ON DELETE SET NULL,
  is_auto_applied BOOLEAN NOT NULL DEFAULT false, -- Manual vs automatic tagging

  -- Notes on why this tag was applied
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 500),

  -- Tracking
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: business can't have same tag twice for same user
  UNIQUE(business_id, tag_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_business_tags_business ON business_tags(business_id);
CREATE INDEX idx_business_tags_tag ON business_tags(tag_id);
CREATE INDEX idx_business_tags_user ON business_tags(user_id);
CREATE INDEX idx_business_tags_itp ON business_tags(applied_by_itp_id) WHERE applied_by_itp_id IS NOT NULL;
CREATE INDEX idx_business_tags_auto ON business_tags(is_auto_applied) WHERE is_auto_applied = true;
CREATE INDEX idx_business_tags_business_user ON business_tags(business_id, user_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies: Users can only manage their own tags
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Business tags policies: Users can only manage their own business tags
CREATE POLICY "Users can view their own business tags"
  ON business_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business tags"
  ON business_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business tags"
  ON business_tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business tags"
  ON business_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create tag by name
CREATE OR REPLACE FUNCTION get_or_create_tag(
  p_user_id UUID,
  p_tag_name TEXT,
  p_color TEXT DEFAULT '#3b82f6',
  p_icon TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_id UUID;
BEGIN
  -- Try to find existing tag
  SELECT id INTO v_tag_id
  FROM tags
  WHERE user_id = p_user_id AND name = p_tag_name;

  -- If not found, create it
  IF v_tag_id IS NULL THEN
    INSERT INTO tags (user_id, name, color, icon)
    VALUES (p_user_id, p_tag_name, p_color, p_icon)
    RETURNING id INTO v_tag_id;
  END IF;

  RETURN v_tag_id;
END;
$$;

-- Function to tag a business (with upsert logic)
CREATE OR REPLACE FUNCTION tag_business(
  p_user_id UUID,
  p_business_id UUID,
  p_tag_name TEXT,
  p_itp_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_id UUID;
  v_business_tag_id UUID;
BEGIN
  -- Get or create tag
  v_tag_id := get_or_create_tag(p_user_id, p_tag_name);

  -- Insert business_tag (or return existing if duplicate)
  INSERT INTO business_tags (business_id, tag_id, user_id, applied_by_itp_id, is_auto_applied, notes)
  VALUES (
    p_business_id,
    v_tag_id,
    p_user_id,
    p_itp_id,
    p_itp_id IS NOT NULL,
    p_notes
  )
  ON CONFLICT (business_id, tag_id, user_id) DO UPDATE
    SET applied_by_itp_id = EXCLUDED.applied_by_itp_id,
        notes = EXCLUDED.notes
  RETURNING id INTO v_business_tag_id;

  -- Update tag usage count
  UPDATE tags
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = v_tag_id;

  RETURN v_business_tag_id;
END;
$$;

-- Function to untag a business
CREATE OR REPLACE FUNCTION untag_business(
  p_user_id UUID,
  p_business_id UUID,
  p_tag_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Find tag
  SELECT id INTO v_tag_id
  FROM tags
  WHERE user_id = p_user_id AND name = p_tag_name;

  -- If tag not found, return false
  IF v_tag_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Delete business_tag
  DELETE FROM business_tags
  WHERE business_id = p_business_id
    AND tag_id = v_tag_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Update tag usage count
  IF v_deleted_count > 0 THEN
    UPDATE tags
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = v_tag_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Function to get all tags for a business
CREATE OR REPLACE FUNCTION get_business_tags(
  p_user_id UUID,
  p_business_id UUID
)
RETURNS TABLE (
  tag_id UUID,
  tag_name TEXT,
  tag_color TEXT,
  tag_icon TEXT,
  is_auto_applied BOOLEAN,
  applied_by_itp_id UUID,
  applied_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tag_id,
    t.name AS tag_name,
    t.color AS tag_color,
    t.icon AS tag_icon,
    bt.is_auto_applied,
    bt.applied_by_itp_id,
    bt.applied_at
  FROM business_tags bt
  JOIN tags t ON t.id = bt.tag_id
  WHERE bt.business_id = p_business_id
    AND bt.user_id = p_user_id
  ORDER BY bt.applied_at DESC;
END;
$$;

-- Function to get all businesses with a specific tag
CREATE OR REPLACE FUNCTION get_businesses_by_tag(
  p_user_id UUID,
  p_tag_name TEXT,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  business_id UUID,
  applied_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_id UUID;
BEGIN
  -- Find tag
  SELECT id INTO v_tag_id
  FROM tags
  WHERE user_id = p_user_id AND name = p_tag_name;

  -- If tag not found, return empty result
  IF v_tag_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bt.business_id,
    bt.applied_at
  FROM business_tags bt
  WHERE bt.tag_id = v_tag_id
    AND bt.user_id = p_user_id
  ORDER BY bt.applied_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get tag statistics
CREATE OR REPLACE FUNCTION get_tag_stats(p_user_id UUID, p_tag_id UUID)
RETURNS TABLE (
  total_businesses BIGINT,
  auto_applied_count BIGINT,
  manual_applied_count BIGINT,
  itps_using_tag BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_businesses,
    COUNT(*) FILTER (WHERE is_auto_applied = true)::BIGINT AS auto_applied_count,
    COUNT(*) FILTER (WHERE is_auto_applied = false)::BIGINT AS manual_applied_count,
    COUNT(DISTINCT applied_by_itp_id) FILTER (WHERE applied_by_itp_id IS NOT NULL)::BIGINT AS itps_using_tag
  FROM business_tags
  WHERE tag_id = p_tag_id AND user_id = p_user_id;
END;
$$;

-- ============================================================================
-- 5. MIGRATION: Convert existing saved_businesses.tags to new system
-- ============================================================================

-- NOTE: This section is commented out as it requires inspection of existing data structure
-- Uncomment and adjust if migrating from existing TEXT[] tags on saved_businesses

/*
-- Example migration logic (adjust based on actual schema):
DO $$
DECLARE
  v_saved_business RECORD;
  v_tag TEXT;
  v_tag_id UUID;
BEGIN
  -- Iterate through all saved_businesses with tags
  FOR v_saved_business IN
    SELECT id, user_id, business_id, tags
    FROM saved_businesses
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  LOOP
    -- For each tag in the array
    FOREACH v_tag IN ARRAY v_saved_business.tags
    LOOP
      -- Get or create tag
      v_tag_id := get_or_create_tag(v_saved_business.user_id, v_tag);

      -- Create business_tag
      INSERT INTO business_tags (business_id, tag_id, user_id, is_auto_applied)
      VALUES (v_saved_business.business_id, v_tag_id, v_saved_business.user_id, false)
      ON CONFLICT (business_id, tag_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
*/

-- ============================================================================
-- 6. COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE tags IS 'Master list of user-defined tags for categorizing businesses';
COMMENT ON TABLE business_tags IS 'Junction table linking businesses to tags with ITP attribution';

COMMENT ON COLUMN tags.color IS 'Hex color code for tag display (e.g., #3b82f6 for blue)';
COMMENT ON COLUMN tags.icon IS 'Icon identifier from icon library (optional)';
COMMENT ON COLUMN tags.usage_count IS 'Number of times this tag has been applied to businesses';

COMMENT ON COLUMN business_tags.applied_by_itp_id IS 'ITP that auto-applied this tag (NULL if manually applied)';
COMMENT ON COLUMN business_tags.is_auto_applied IS 'True if tag was applied by ITP auto-matching, false if manually applied';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_tags TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_or_create_tag(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION tag_business(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION untag_business(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_tags(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_businesses_by_tag(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tag_stats(UUID, UUID) TO authenticated;
