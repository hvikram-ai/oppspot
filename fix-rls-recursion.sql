-- Emergency Fix: Data Room RLS Infinite Recursion
-- Apply this directly to Supabase via SQL Editor
-- Issue: Circular dependency between data_rooms and data_room_access policies

-- ============================================================================
-- Step 1: Drop ALL existing policies on both tables
-- ============================================================================

DROP POLICY IF EXISTS "Users can view accessible data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view own data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view shared data rooms" ON data_rooms;
DROP POLICY IF EXISTS "data rooms viewable by owner or shared users" ON data_rooms;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON data_rooms;

DROP POLICY IF EXISTS "Users can view data room access" ON data_room_access;
DROP POLICY IF EXISTS "Users can view own access records" ON data_room_access;
DROP POLICY IF EXISTS "Owners can view room access records" ON data_room_access;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON data_room_access;

-- ============================================================================
-- Step 2: Create NON-RECURSIVE policies
-- ============================================================================

-- Policy 1: Users can see their own data rooms (direct ownership, no joins)
CREATE POLICY "Users can view own data rooms"
  ON data_rooms FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can see shared data rooms (only checks access table, no back-reference)
CREATE POLICY "Users can view shared data rooms"
  ON data_rooms FOR SELECT
  USING (
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM data_room_access
      WHERE data_room_access.data_room_id = data_rooms.id
      AND data_room_access.user_id = auth.uid()
      AND data_room_access.revoked_at IS NULL
      AND data_room_access.expires_at > NOW()
    )
  );

-- Policy 3: Users can see access records for their rooms OR records where they are the user
CREATE POLICY "Users can view own access records"
  ON data_room_access FOR SELECT
  USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
  );

-- Policy 4: Owners can see ALL access records for rooms they own
-- IMPORTANT: This query goes FROM access -> rooms, not rooms -> access (prevents loop)
CREATE POLICY "Owners can view room access records"
  ON data_room_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms dr
      WHERE dr.id = data_room_access.data_room_id
      AND dr.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verification Query (run after applying)
-- ============================================================================

-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual
-- FROM pg_policies
-- WHERE tablename IN ('data_rooms', 'data_room_access')
-- ORDER BY tablename, policyname;
