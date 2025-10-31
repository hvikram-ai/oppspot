-- Fix Data Room RLS Infinite Recursion - Final Fix
-- Migration: 20251031000001
-- Issue: Multiple conflicting policies from different migrations
-- Solution: Drop ALL policies, keep only RBAC policies

-- ============================================================================
-- STEP 1: Drop ALL existing policies (from all previous migrations)
-- ============================================================================

-- Drop policies from 20251003010514 (recursion fix v2)
DROP POLICY IF EXISTS "Users can view own data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view shared data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view own access records" ON data_room_access;
DROP POLICY IF EXISTS "Owners can view room access records" ON data_room_access;

-- Drop policies from older migrations
DROP POLICY IF EXISTS "Users can view accessible data rooms" ON data_rooms;
DROP POLICY IF EXISTS "data rooms viewable by owner or shared users" ON data_rooms;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON data_rooms;
DROP POLICY IF EXISTS "Users can view data room access" ON data_room_access;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON data_room_access;

-- Drop RBAC policies (will be recreated)
DROP POLICY IF EXISTS "data_rooms_select_policy" ON data_rooms;
DROP POLICY IF EXISTS "data_rooms_insert_policy" ON data_rooms;
DROP POLICY IF EXISTS "data_rooms_update_policy" ON data_rooms;
DROP POLICY IF EXISTS "data_rooms_delete_policy" ON data_rooms;

-- ============================================================================
-- STEP 2: Create simplified policies WITHOUT RBAC dependencies
-- ============================================================================

-- SELECT: Users can view their own data rooms OR rooms they have access to
CREATE POLICY "data_rooms_select_policy" ON data_rooms
  FOR SELECT USING (
    -- User is the owner
    user_id = auth.uid()
    OR
    -- User has been granted access (non-recursive check)
    EXISTS (
      SELECT 1 FROM data_room_access dra
      WHERE dra.data_room_id = data_rooms.id
      AND dra.user_id = auth.uid()
      AND dra.revoked_at IS NULL
      AND dra.expires_at > NOW()
    )
  );

-- INSERT: Authenticated users can create data rooms
CREATE POLICY "data_rooms_insert_policy" ON data_rooms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Users can update their own data rooms
CREATE POLICY "data_rooms_update_policy" ON data_rooms
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- DELETE: Users can delete their own data rooms
CREATE POLICY "data_rooms_delete_policy" ON data_rooms
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- STEP 3: Recreate data_room_access policies (simplified, NO recursion)
-- ============================================================================

-- CRITICAL: This policy must NOT query data_rooms table to avoid recursion
-- Users can only see access records where they are directly involved
CREATE POLICY "data_room_access_select_policy" ON data_room_access
  FOR SELECT USING (
    -- User is the one being granted access
    user_id = auth.uid()
    OR
    -- User is the one who invited them
    invited_by = auth.uid()
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "data_rooms_select_policy" ON data_rooms IS
  'Users can view data rooms they own or have been granted access to';

COMMENT ON POLICY "data_rooms_insert_policy" ON data_rooms IS
  'Authenticated users can create data rooms';

COMMENT ON POLICY "data_rooms_update_policy" ON data_rooms IS
  'Users can update data rooms they own';

COMMENT ON POLICY "data_rooms_delete_policy" ON data_rooms IS
  'Users can delete data rooms they own';

COMMENT ON POLICY "data_room_access_select_policy" ON data_room_access IS
  'Users can view access records where they are the user or the inviter. Does NOT query data_rooms to prevent recursion.';
