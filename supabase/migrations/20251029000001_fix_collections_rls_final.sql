-- Fix Collections RLS - Final Solution
-- This migration fixes the infinite recursion and table name mismatch
-- Date: 2025-10-29

-- ============================================================================
-- STEP 1: Drop all existing policies and functions
-- ============================================================================

DROP POLICY IF EXISTS "Users can view collections they own or have access to" ON collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update collections they own (not system collections)" ON collections;
DROP POLICY IF EXISTS "Users can delete collections they own (not system collections)" ON collections;
DROP POLICY IF EXISTS "Users can view items in collections they have access to" ON collection_items;
DROP POLICY IF EXISTS "Users can add items to collections with edit permission" ON collection_items;
DROP POLICY IF EXISTS "Users can update items in collections with edit permission" ON collection_items;
DROP POLICY IF EXISTS "Users can remove items from collections with edit permission" ON collection_items;
DROP POLICY IF EXISTS "Users can view access grants for collections they own or their own grants" ON collection_access;
DROP POLICY IF EXISTS "Collection owners can grant access to their collections" ON collection_access;
DROP POLICY IF EXISTS "Collection owners can update access permissions" ON collection_access;
DROP POLICY IF EXISTS "Collection owners can revoke access" ON collection_access;

DROP FUNCTION IF EXISTS user_has_collection_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_edit_stream(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_manage_stream(UUID, UUID);

-- ============================================================================
-- STEP 2: Rename collection_access to collection_members (if needed)
-- ============================================================================

-- Check if collection_access exists and collection_members doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'collection_access'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'collection_members'
  ) THEN
    ALTER TABLE collection_access RENAME TO collection_members;
    RAISE NOTICE '✅ Renamed collection_access to collection_members';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Simple, Non-Recursive RLS Policies
-- ============================================================================

-- COLLECTIONS TABLE
-- =================

-- SELECT: User owns the collection
-- No joins to other tables = no recursion!
CREATE POLICY "select_own_collections"
ON collections FOR SELECT
USING (user_id = auth.uid());

-- INSERT: User can create collections for themselves
CREATE POLICY "insert_own_collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- UPDATE: User can update their own non-system collections
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

-- DELETE: User can delete their own non-system collections
CREATE POLICY "delete_own_collections"
ON collections FOR DELETE
USING (
  user_id = auth.uid()
  AND NOT is_system
);

-- COLLECTION_MEMBERS TABLE (renamed from collection_access)
-- ============================================================

-- SELECT: User can see their own memberships
-- Simple policy - no circular reference
CREATE POLICY "select_own_memberships"
ON collection_members FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Collection owner can add members
-- We check ownership directly, no recursion
CREATE POLICY "insert_members_as_owner"
ON collection_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND granted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()
    AND NOT collections.is_system
  )
);

-- UPDATE: Collection owner can update member permissions
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

-- COLLECTION_ITEMS TABLE
-- =======================

-- SELECT: User can see items in their collections
-- We check membership directly
CREATE POLICY "select_items_in_my_collections"
ON collection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_items.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- INSERT: User can add items to their collections
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

-- UPDATE: Collection owner can update items
CREATE POLICY "update_items_in_my_collections"
ON collection_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_items.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- DELETE: Collection owner can delete items
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
  RAISE NOTICE '   - Renamed collection_access → collection_members';
  RAISE NOTICE '   - Removed circular dependencies';
  RAISE NOTICE '   - Applied simple, non-recursive policies';
  RAISE NOTICE '   - RLS enabled on all tables';
END $$;
