-- Create Proper collection_members Table
-- This replaces collection_access with the full structure the code expects
-- Date: 2025-10-29

-- ============================================================================
-- STEP 1: Drop the simplified collection_access/collection_members table
-- ============================================================================

DROP TABLE IF EXISTS collection_members CASCADE;
DROP TABLE IF EXISTS collection_access CASCADE;

-- ============================================================================
-- STEP 2: Create proper collection_members table with all needed columns
-- ============================================================================

CREATE TABLE collection_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role instead of simple permission level
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',

  -- Invitation workflow
  invited_by UUID REFERENCES auth.users(id),
  invitation_sent_at TIMESTAMP,
  invitation_accepted_at TIMESTAMP,

  -- Notification settings (JSONB for flexibility)
  notification_settings JSONB DEFAULT '{
    "new_items": true,
    "status_changes": true,
    "mentions": true,
    "comments": true,
    "daily_digest": false,
    "instant_critical": true
  }'::jsonb,

  -- Timestamps
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP,

  -- Prevent duplicate memberships
  CONSTRAINT unique_collection_member UNIQUE(collection_id, user_id)
);

-- ============================================================================
-- STEP 3: Create Indexes
-- ============================================================================

CREATE INDEX idx_collection_members_lookup
ON collection_members(user_id, collection_id);

CREATE INDEX idx_collection_members_collection
ON collection_members(collection_id);

CREATE INDEX idx_collection_members_user
ON collection_members(user_id);

-- ============================================================================
-- STEP 4: Simple RLS Policies for collection_members
-- ============================================================================

-- Enable RLS
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;

-- SELECT: User can see their own memberships
CREATE POLICY "select_own_memberships"
ON collection_members FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Collection owner can add members
-- Admin client will bypass this, so keep it simple
CREATE POLICY "insert_members_as_owner"
ON collection_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()
  )
);

-- UPDATE: Collection owner can update member settings
CREATE POLICY "update_members_as_owner"
ON collection_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_members.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- DELETE: Collection owner can remove members
CREATE POLICY "delete_members_as_owner"
ON collection_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_members.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ collection_members table created successfully!';
  RAISE NOTICE '   - Full schema with roles, invitations, and notification settings';
  RAISE NOTICE '   - Proper indexes for performance';
  RAISE NOTICE '   - RLS policies enabled';
END $$;
