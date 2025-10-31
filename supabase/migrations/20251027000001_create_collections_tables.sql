-- Migration: Create Collections Tables
-- Feature: Stream-Based Work Organization
-- Date: 2025-10-27
-- Description: Creates tables for organizing work products into collections

-- ============================================================================
-- STEP 1: Create ENUM Types
-- ============================================================================

-- Work product types that can be saved to collections
CREATE TYPE work_product_type AS ENUM (
  'business',  -- references businesses table
  'report',    -- references research_reports table
  'contact',   -- references contacts/profiles table
  'list',      -- references business_lists table
  'insight',   -- references insights table
  'query'      -- references saved_searches table
);

-- Permission levels for shared collections
CREATE TYPE permission_level_enum AS ENUM (
  'view',    -- Can view stream and items only
  'edit',    -- Can view + add/remove items
  'manage'   -- Can view + edit + rename stream + invite users
);

-- ============================================================================
-- STEP 2: Create Tables
-- ============================================================================

-- Collections: User-created organizational containers
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Collection Items: Work products saved to collections (polymorphic)
CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_type work_product_type NOT NULL,
  item_id UUID NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Collection Access: Permission grants for shared collections
CREATE TABLE collection_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level permission_level_enum NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Prevent duplicate grants (one permission per user per stream)
  CONSTRAINT unique_collection_user UNIQUE(collection_id, user_id)
);

-- ============================================================================
-- STEP 3: Add Active Collection to Profiles
-- ============================================================================

-- Add active_collection_id column to profiles for session persistence
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS active_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Create Indexes for Performance
-- ============================================================================

-- Index for chronological item listing (most common query)
CREATE INDEX idx_collection_items_chronological
ON collection_items(collection_id, added_at DESC);

-- Index for polymorphic reference lookups
CREATE INDEX idx_collection_items_polymorphic
ON collection_items(item_type, item_id);

-- Index for permission checks
CREATE INDEX idx_collection_access_lookup
ON collection_access(user_id, collection_id);

-- Index for stream ownership queries
CREATE INDEX idx_collection_access_stream
ON collection_access(collection_id);

-- Index for user's active collections (exclude archived)
CREATE INDEX idx_collections_user_active
ON collections(user_id, archived_at)
WHERE archived_at IS NULL;

-- Index for General stream lookup
CREATE INDEX idx_collections_system
ON collections(user_id, is_system)
WHERE is_system = TRUE;

-- Index for active stream lookups in profiles
CREATE INDEX idx_profiles_active_stream
ON profiles(active_collection_id);

-- Unique index to ensure one General stream per user
CREATE UNIQUE INDEX idx_collections_one_general_per_user
ON collections(user_id, is_system)
WHERE is_system = TRUE;

-- ============================================================================
-- STEP 5: Create Trigger Function for Auto-Creating General Stream
-- ============================================================================

-- Function to create "General" stream for new users
CREATE OR REPLACE FUNCTION create_general_collection_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_collection_id UUID;
BEGIN
  -- Create the General stream
  INSERT INTO collections (user_id, name, is_system)
  VALUES (NEW.id, 'General', TRUE)
  RETURNING id INTO new_collection_id;

  -- Set it as the active stream in profiles if profile exists
  UPDATE profiles
  SET active_collection_id = new_collection_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create General stream on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_general_collection_for_user();

-- ============================================================================
-- STEP 6: Update Trigger for updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on collections
CREATE TRIGGER update_collections_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE collections IS 'User-created organizational containers for work products';
COMMENT ON TABLE collection_items IS 'Work products saved to collections with polymorphic references';
COMMENT ON TABLE collection_access IS 'Permission grants for shared collections';
COMMENT ON TYPE work_product_type IS 'Types of work products that can be saved to collections';
COMMENT ON TYPE permission_level_enum IS 'Permission levels for shared stream access';

COMMENT ON COLUMN collections.is_system IS 'TRUE for General stream (cannot be renamed/archived)';
COMMENT ON COLUMN collections.archived_at IS 'Soft-delete timestamp (NULL = active stream)';
COMMENT ON COLUMN collection_items.item_type IS 'Type of work product (polymorphic reference)';
COMMENT ON COLUMN collection_items.item_id IS 'ID of the work product (polymorphic reference)';
COMMENT ON COLUMN collection_access.permission_level IS 'view (read only), edit (add/remove items), manage (+ rename/share)';
