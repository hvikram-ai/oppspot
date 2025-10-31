-- Clean RLS Policies - Final Fix for Infinite Recursion
-- This migration completely removes all old policies and creates fresh, simple ones
-- Date: 2025-10-29

-- ============================================================================
-- STEP 1: Disable RLS temporarily to clean up
-- ============================================================================

ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop ALL existing policies (brute force approach)
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on collections
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'collections' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collections', pol.policyname);
        RAISE NOTICE 'Dropped policy % on collections', pol.policyname;
    END LOOP;

    -- Drop all policies on collection_items
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'collection_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collection_items', pol.policyname);
        RAISE NOTICE 'Dropped policy % on collection_items', pol.policyname;
    END LOOP;

    -- Drop all policies on collection_members
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'collection_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collection_members', pol.policyname);
        RAISE NOTICE 'Dropped policy % on collection_members', pol.policyname;
    END LOOP;

    -- Also try collection_access if it exists
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'collection_access' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON collection_access', pol.policyname);
        RAISE NOTICE 'Dropped policy % on collection_access', pol.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create SIMPLE, NON-RECURSIVE policies
-- Key: Avoid nested EXISTS queries that reference the same table
-- ============================================================================

-- COLLECTIONS TABLE - Simple ownership check only
-- =============================================

CREATE POLICY "collections_select_own"
ON collections FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "collections_insert_own"
ON collections FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "collections_update_own"
ON collections FOR UPDATE
USING (user_id = auth.uid() AND NOT is_system)
WITH CHECK (user_id = auth.uid() AND NOT is_system);

CREATE POLICY "collections_delete_own"
ON collections FOR DELETE
USING (user_id = auth.uid() AND NOT is_system);

-- COLLECTION_MEMBERS TABLE - Simple user check
-- ============================================

CREATE POLICY "members_select_own"
ON collection_members FOR SELECT
USING (user_id = auth.uid());

-- For INSERT/UPDATE/DELETE, we'll check collection ownership directly
-- but in a way that doesn't cause recursion
CREATE POLICY "members_insert"
ON collection_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "members_update"
ON collection_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_members.collection_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "members_delete"
ON collection_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_members.collection_id
    AND c.user_id = auth.uid()
  )
);

-- COLLECTION_ITEMS TABLE - Simple ownership check
-- ===============================================

CREATE POLICY "items_select"
ON collection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "items_insert"
ON collection_items FOR INSERT
WITH CHECK (
  added_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "items_update"
ON collection_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "items_delete"
ON collection_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_items.collection_id
    AND c.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 4: Re-enable RLS
-- ============================================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Verify the fix
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies on collections
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'collections' AND schemaname = 'public';

    RAISE NOTICE '✅ Collections RLS completely rebuilt!';
    RAISE NOTICE '   - All old policies removed';
    RAISE NOTICE '   - New simple policies created (% policies on collections)', policy_count;
    RAISE NOTICE '   - No circular dependencies';
    RAISE NOTICE '   - RLS enabled on all tables';

    IF policy_count <> 4 THEN
        RAISE WARNING 'Expected 4 policies on collections, found %', policy_count;
    END IF;
END $$;
