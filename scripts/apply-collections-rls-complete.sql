-- ============================================================================
-- Complete Collections RLS Setup
-- This script:
-- 1. Enables RLS on all collections tables
-- 2. Applies all necessary RLS policies
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Starting Collections RLS Setup...';
END $$;

-- ============================================================================
-- STEP 1: Enable Row Level Security
-- ============================================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on all tables';
END $$;

-- ============================================================================
-- STEP 2: Drop Existing Policies (if any)
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

DO $$
BEGIN
  RAISE NOTICE '✅ Cleaned up old policies';
END $$;

-- ============================================================================
-- STEP 3: Ensure Helper Functions Exist
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

DO $$
BEGIN
  RAISE NOTICE '✅ Helper functions created';
END $$;

-- ============================================================================
-- STEP 4: Create RLS Policies for COLLECTIONS Table
-- ============================================================================

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

CREATE POLICY "Users can create their own collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update collections they own (not system collections)"
ON collections FOR UPDATE
USING (
  user_id = auth.uid()
  AND NOT is_system
)
WITH CHECK (
  user_id = auth.uid()
  AND NOT is_system
);

CREATE POLICY "Users can delete collections they own (not system collections)"
ON collections FOR DELETE
USING (
  user_id = auth.uid()
  AND NOT is_system
);

DO $$
BEGIN
  RAISE NOTICE '✅ Collections policies created';
END $$;

-- ============================================================================
-- STEP 5: Create RLS Policies for COLLECTION_ITEMS Table
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

DO $$
BEGIN
  RAISE NOTICE '✅ Collection items policies created';
END $$;

-- ============================================================================
-- STEP 6: Create RLS Policies for COLLECTION_ACCESS Table
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

DO $$
BEGIN
  RAISE NOTICE '✅ Collection access policies created';
END $$;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Collections RLS Setup Complete!';
  RAISE NOTICE '   ✓ RLS enabled on all tables';
  RAISE NOTICE '   ✓ 12 policies created';
  RAISE NOTICE '   ✓ 3 helper functions ready';
  RAISE NOTICE '';
  RAISE NOTICE '   Run verification: npx tsx scripts/verify-collections-migration.ts';
END $$;
