-- Migration: Create RLS Policies for Collections
-- Feature: Stream-Based Work Organization
-- Date: 2025-10-27
-- Description: Row Level Security policies for collections, collection_items, and collection_access

-- ============================================================================
-- STEP 1: Enable RLS on All Tables
-- ============================================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Helper Functions for Permission Checks
-- ============================================================================

-- Function to check if user has access to a stream (owner OR granted access)
CREATE OR REPLACE FUNCTION user_has_collection_access(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND (
      collections.user_id = user_id  -- User owns the stream
      OR
      EXISTS (
        SELECT 1 FROM collection_access
        WHERE collection_access.collection_id = collection_id
        AND collection_access.user_id = user_id
      )  -- User has been granted access
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has edit+ permission on a stream
CREATE OR REPLACE FUNCTION user_can_edit_stream(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND collections.user_id = user_id  -- Owner has edit permission
  )
  OR EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collection_id
    AND collection_access.user_id = user_id
    AND collection_access.permission_level IN ('edit', 'manage')  -- Edit or Manage permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has manage permission on a stream
CREATE OR REPLACE FUNCTION user_can_manage_stream(collection_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM collections
    WHERE id = collection_id
    AND collections.user_id = user_id  -- Owner has manage permission
  )
  OR EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collection_id
    AND collection_access.user_id = user_id
    AND collection_access.permission_level = 'manage'  -- Manage permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: RLS Policies for STREAMS Table
-- ============================================================================

-- Policy: SELECT collections (user owns OR has been granted access)
CREATE POLICY "Users can view collections they own or have access to"
ON collections FOR SELECT
USING (
  user_id = auth.uid()  -- User owns the stream
  OR
  EXISTS (
    SELECT 1 FROM collection_access
    WHERE collection_access.collection_id = collections.id
    AND collection_access.user_id = auth.uid()
  )  -- User has been granted access
);

-- Policy: INSERT collections (only authenticated users can create collections)
CREATE POLICY "Users can create their own collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- Policy: UPDATE collections (owner only, cannot modify system collections)
CREATE POLICY "Users can update collections they own (not system collections)"
ON collections FOR UPDATE
USING (
  user_id = auth.uid()  -- User owns the stream
  AND (
    NOT is_system  -- Cannot update system collections
    OR
    (is_system AND archived_at IS NULL)  -- Allow updating archived_at for restore
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    NOT is_system  -- Cannot modify system collections
    OR
    (is_system AND NEW.name = OLD.name AND NEW.is_system = OLD.is_system)  -- Can only update non-protected fields
  )
);

-- Policy: DELETE collections (owner only, cannot delete system collections)
CREATE POLICY "Users can delete collections they own (not system collections)"
ON collections FOR DELETE
USING (
  user_id = auth.uid()
  AND NOT is_system  -- Cannot delete system collections
);

-- ============================================================================
-- STEP 4: RLS Policies for STREAM_ITEMS Table
-- ============================================================================

-- Policy: SELECT collection_items (inherit permissions from parent stream)
CREATE POLICY "Users can view items in collections they have access to"
ON collection_items FOR SELECT
USING (
  user_has_collection_access(collection_id, auth.uid())
);

-- Policy: INSERT collection_items (edit+ permission required)
CREATE POLICY "Users can add items to collections with edit permission"
ON collection_items FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND added_by = auth.uid()
  AND user_can_edit_stream(collection_id, auth.uid())
);

-- Policy: UPDATE collection_items (edit+ permission required)
CREATE POLICY "Users can update items in collections with edit permission"
ON collection_items FOR UPDATE
USING (
  user_can_edit_stream(collection_id, auth.uid())
)
WITH CHECK (
  user_can_edit_stream(collection_id, auth.uid())
);

-- Policy: DELETE collection_items (edit+ permission required)
CREATE POLICY "Users can remove items from collections with edit permission"
ON collection_items FOR DELETE
USING (
  user_can_edit_stream(collection_id, auth.uid())
);

-- ============================================================================
-- STEP 5: RLS Policies for STREAM_ACCESS Table
-- ============================================================================

-- Policy: SELECT collection_access (stream owner OR self)
CREATE POLICY "Users can view access grants for collections they own or their own grants"
ON collection_access FOR SELECT
USING (
  user_id = auth.uid()  -- User can see their own access grants
  OR
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()  -- User owns the stream
  )
);

-- Policy: INSERT collection_access (stream owner only)
CREATE POLICY "Collection owners can grant access to their collections"
ON collection_access FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND granted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()  -- User owns the stream
    AND NOT collections.is_system  -- Cannot share system collections
  )
);

-- Policy: UPDATE collection_access (stream owner only)
CREATE POLICY "Collection owners can update access permissions"
ON collection_access FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()  -- User owns the stream
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_id
    AND collections.user_id = auth.uid()
  )
);

-- Policy: DELETE collection_access (stream owner only)
CREATE POLICY "Collection owners can revoke access"
ON collection_access FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_access.collection_id
    AND collections.user_id = auth.uid()  -- User owns the stream
  )
);

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON FUNCTION user_has_collection_access IS 'Check if user owns or has been granted access to a stream';
COMMENT ON FUNCTION user_can_edit_stream IS 'Check if user has edit or manage permission on a stream';
COMMENT ON FUNCTION user_can_manage_stream IS 'Check if user has manage permission or owns the stream';
