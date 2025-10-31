-- Fixed RLS Policies for Collections
-- Removes NEW/OLD references that don't work in RLS policies

-- Drop existing policies first
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

-- Drop existing helper functions
DROP FUNCTION IF EXISTS user_has_collection_access(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_edit_stream(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_manage_stream(UUID, UUID);

-- ============================================================================
-- STEP 1: Helper Functions for Permission Checks
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_collection_access(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND (
      collections.user_id = user_id
      OR
      EXISTS (
        SELECT 1 FROM collection_access
        WHERE collection_access.collection_id = collection_id
        AND collection_access.user_id = user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_can_edit_stream(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND collections.user_id = user_id
  )
  OR EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collection_id
    AND collection_access.user_id = user_id
    AND collection_access.permission_level IN ('edit', 'manage')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_can_manage_stream(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND collections.user_id = user_id
  )
  OR EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collection_id
    AND collection_access.user_id = user_id
    AND collection_access.permission_level = 'manage'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: RLS Policies for COLLECTIONS Table
-- ============================================================================

-- SELECT: User owns OR has been granted access
CREATE POLICY "Users can view collections they own or have access to"
ON collections FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collections.id
    AND collection_access.user_id = auth.uid()
  )
);

-- INSERT: Only authenticated users can create collections
CREATE POLICY "Users can create their own collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- UPDATE: Owner only, cannot modify system collections (SIMPLIFIED - no NEW/OLD)
CREATE POLICY "Users can update collections they own (not system collections)"
ON collections FOR UPDATE
USING (
  user_id = auth.uid()
  AND NOT is_system  -- Cannot update system collections
)
WITH CHECK (
  user_id = auth.uid()
  AND NOT is_system  -- System collections cannot be modified
);

-- DELETE: Owner only, cannot delete system collections
CREATE POLICY "Users can delete collections they own (not system collections)"
ON collections FOR DELETE
USING (
  user_id = auth.uid()
  AND NOT is_system
);

-- ============================================================================
-- STEP 3: RLS Policies for COLLECTION_ITEMS Table
-- ============================================================================

CREATE POLICY "Users can view items in collections they have access to"
ON collection_items FOR SELECT
USING (
  user_has_collection_access(collection_id, auth.uid())
);

CREATE POLICY "Users can add items to collections with edit permission"
ON collection_items FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND added_by = auth.uid()
  AND user_can_edit_stream(collection_id, auth.uid())
);

CREATE POLICY "Users can update items in collections with edit permission"
ON collection_items FOR UPDATE
USING (
  user_can_edit_stream(collection_id, auth.uid())
)
WITH CHECK (
  user_can_edit_stream(collection_id, auth.uid())
);

CREATE POLICY "Users can remove items from collections with edit permission"
ON collection_items FOR DELETE
USING (
  user_can_edit_stream(collection_id, auth.uid())
);

-- ============================================================================
-- STEP 4: RLS Policies for COLLECTION_ACCESS Table
-- ============================================================================

CREATE POLICY "Users can view access grants for collections they own or their own grants"
ON collection_access FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "Collection owners can grant access to their collections"
ON collection_access FOR INSERT
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

CREATE POLICY "Collection owners can update access permissions"
ON collection_access FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "Collection owners can revoke access"
ON collection_access FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()
  )
);

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created successfully!';
  RAISE NOTICE '   All collections tables are now secured.';
END $$;
