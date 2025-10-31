-- Complete Collections RLS Fix
-- Fixes infinite recursion and creates proper table structure
-- Date: 2025-10-29

-- ============================================================================
-- STEP 1: Drop all existing policies and functions
-- ============================================================================

-- Drop policies on collections table (if they exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view collections they own or have access to" ON collections;
  DROP POLICY IF EXISTS "Users can create their own collections" ON collections;
  DROP POLICY IF EXISTS "Users can update collections they own (not system collections)" ON collections;
  DROP POLICY IF EXISTS "Users can delete collections they own (not system collections)" ON collections;
  DROP POLICY IF EXISTS "select_own_collections" ON collections;
  DROP POLICY IF EXISTS "insert_own_collections" ON collections;
  DROP POLICY IF EXISTS "update_own_collections" ON collections;
  DROP POLICY IF EXISTS "delete_own_collections" ON collections;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop policies on collection_items table (if they exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view items in collections they have access to" ON collection_items;
  DROP POLICY IF EXISTS "Users can add items to collections with edit permission" ON collection_items;
  DROP POLICY IF EXISTS "Users can update items in collections with edit permission" ON collection_items;
  DROP POLICY IF EXISTS "Users can remove items from collections with edit permission" ON collection_items;
  DROP POLICY IF EXISTS "select_items_in_my_collections" ON collection_items;
  DROP POLICY IF EXISTS "insert_items_to_my_collections" ON collection_items;
  DROP POLICY IF EXISTS "update_items_in_my_collections" ON collection_items;
  DROP POLICY IF EXISTS "delete_items_from_my_collections" ON collection_items;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop policies on collection_access table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collection_access'
  ) THEN
    DROP POLICY IF EXISTS "Users can view access grants for collections they own or their own grants" ON collection_access;
    DROP POLICY IF EXISTS "Collection owners can grant access to their collections" ON collection_access;
    DROP POLICY IF EXISTS "Collection owners can update access permissions" ON collection_access;
    DROP POLICY IF EXISTS "Collection owners can revoke access" ON collection_access;
  END IF;
END $$;

-- Drop policies on collection_members table (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collection_members'
  ) THEN
    DROP POLICY IF EXISTS "select_own_memberships" ON collection_members;
    DROP POLICY IF EXISTS "insert_members_as_owner" ON collection_members;
    DROP POLICY IF EXISTS "update_members_as_owner" ON collection_members;
    DROP POLICY IF EXISTS "delete_members_as_owner" ON collection_members;
  END IF;
END $$;

DROP FUNCTION IF EXISTS user_has_collection_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_edit_stream(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_manage_stream(UUID, UUID);

-- ============================================================================
-- STEP 2: Drop and recreate collection_members table with proper structure
-- ============================================================================

-- Drop whichever table exists
DO $$
BEGIN
  -- Try to drop collection_members first
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collection_members'
  ) THEN
    DROP TABLE collection_members CASCADE;
    RAISE NOTICE 'Dropped existing collection_members table';
  END IF;

  -- Try to drop collection_access if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'collection_access'
  ) THEN
    DROP TABLE collection_access CASCADE;
    RAISE NOTICE 'Dropped existing collection_access table';
  END IF;
END $$;

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

-- Create indexes for performance
CREATE INDEX idx_collection_members_lookup ON collection_members(user_id, collection_id);
CREATE INDEX idx_collection_members_collection ON collection_members(collection_id);
CREATE INDEX idx_collection_members_user ON collection_members(user_id);

-- ============================================================================
-- STEP 3: Simple, Non-Recursive RLS Policies
-- ============================================================================

-- COLLECTIONS TABLE
-- =================

CREATE POLICY "select_own_collections"
ON collections FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "insert_own_collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY "update_own_collections"
ON collections FOR UPDATE
USING (
  user_id = auth.uid()
  AND NOT is_system
)
WITH CHECK (
  user_id = auth.uid()
  AND NOT is_system
);

CREATE POLICY "delete_own_collections"
ON collections FOR DELETE
USING (
  user_id = auth.uid()
  AND NOT is_system
);

-- COLLECTION_MEMBERS TABLE
-- =========================

CREATE POLICY "select_own_memberships"
ON collection_members FOR SELECT
USING (user_id = auth.uid());

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

CREATE POLICY "update_members_as_owner"
ON collection_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_members.collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "delete_members_as_owner"
ON collection_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_members.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- COLLECTION_ITEMS TABLE
-- =======================

CREATE POLICY "select_items_in_my_collections"
ON collection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_items.collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "insert_items_to_my_collections"
ON collection_items FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND added_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "update_items_in_my_collections"
ON collection_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_items.collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "delete_items_from_my_collections"
ON collection_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_items.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 4: Enable RLS on all tables
-- ============================================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Collections RLS fixed successfully!';
  RAISE NOTICE '   - Created proper collection_members table';
  RAISE NOTICE '   - Removed circular dependencies';
  RAISE NOTICE '   - Applied simple, non-recursive policies';
  RAISE NOTICE '   - RLS enabled on all tables';
END $$;
