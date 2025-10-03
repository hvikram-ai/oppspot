-- Fix Infinite Recursion in Data Room RLS Policies (V2 - Idempotent)
-- Migration: 20251003010514
-- Created: 2025-10-03
-- Issue: Circular dependency between data_rooms and data_room_access SELECT policies
-- Note: This version handles existing policies

-- ============================================================================
-- DROP ALL EXISTING POLICIES (to ensure clean slate)
-- ============================================================================

-- Drop all SELECT policies on data_rooms
DROP POLICY IF EXISTS "Users can view accessible data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view own data rooms" ON data_rooms;
DROP POLICY IF EXISTS "Users can view shared data rooms" ON data_rooms;

-- Drop all SELECT policies on data_room_access
DROP POLICY IF EXISTS "Users can view data room access" ON data_room_access;
DROP POLICY IF EXISTS "Users can view own access records" ON data_room_access;
DROP POLICY IF EXISTS "Owners can view room access records" ON data_room_access;

-- ============================================================================
-- RECREATE POLICIES WITHOUT CIRCULAR DEPENDENCY
-- ============================================================================

-- Data Rooms: Allow users to see rooms they own OR have access to
-- Split into two separate policies to avoid recursion
CREATE POLICY "Users can view own data rooms"
  ON data_rooms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared data rooms"
  ON data_rooms FOR SELECT
  USING (
    -- Only check data_room_access if user is not the owner
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM data_room_access
      WHERE data_room_access.data_room_id = data_rooms.id
      AND data_room_access.user_id = auth.uid()
      AND data_room_access.revoked_at IS NULL
      AND data_room_access.expires_at > NOW()
    )
  );

-- Data Room Access: Simplified policy that doesn't query back to data_rooms
CREATE POLICY "Users can view own access records"
  ON data_room_access FOR SELECT
  USING (
    -- Users can see their own access records
    user_id = auth.uid()
    -- OR records for rooms they own (using a simpler check)
    OR invited_by = auth.uid()
  );

-- Additional policy for room owners to see all access records for their rooms
-- This uses a different approach to avoid recursion
CREATE POLICY "Owners can view room access records"
  ON data_room_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_rooms dr
      WHERE dr.id = data_room_access.data_room_id
      AND dr.user_id = auth.uid()
      -- Important: Don't reference data_room_access in this subquery
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own data rooms" ON data_rooms IS
  'Direct ownership check - no subqueries, no recursion risk';

COMMENT ON POLICY "Users can view shared data rooms" ON data_rooms IS
  'Shared access check - only runs if user is NOT owner to prevent unnecessary queries';

COMMENT ON POLICY "Users can view own access records" ON data_room_access IS
  'Direct user_id check - no subqueries to data_rooms table';

COMMENT ON POLICY "Owners can view room access records" ON data_room_access IS
  'Owner check via data_rooms but does not reference data_room_access again';
