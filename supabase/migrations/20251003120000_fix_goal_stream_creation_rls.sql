-- ============================================
-- FIX: Goal-Oriented Stream Creation RLS
-- Migration: 20251003120000_fix_goal_stream_creation_rls.sql
-- Issue: Users cannot create goal-oriented streams due to RLS policy
-- Error: "new row violates row-level security policy for table streams"
-- ============================================

-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Users create streams in org" ON streams;
DROP POLICY IF EXISTS "Authenticated users create streams" ON streams;

-- Create comprehensive INSERT policy that allows authenticated users to create streams
-- This policy allows any authenticated user to insert a stream record
CREATE POLICY "Allow authenticated users to create streams" ON streams
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- Also ensure UPDATE policy allows goal-related updates
DROP POLICY IF EXISTS "Members update streams" ON streams;
DROP POLICY IF EXISTS "Editors update streams" ON streams;

CREATE POLICY "Stream creators and members can update" ON streams
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      -- Creator can always update
      created_by = auth.uid()
      -- OR member with editor/owner role (checked via stream_members if RLS enabled)
      OR id IN (
        SELECT stream_id FROM stream_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'editor')
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid()
      OR id IN (
        SELECT stream_id FROM stream_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'editor')
      )
    )
  );

-- Ensure SELECT policy allows viewing own streams and member streams
DROP POLICY IF EXISTS "Members view streams" ON streams;
DROP POLICY IF EXISTS "View streams" ON streams;

CREATE POLICY "Users view their streams and member streams" ON streams
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Own streams
      created_by = auth.uid()
      -- OR streams they're members of
      OR id IN (
        SELECT stream_id FROM stream_members
        WHERE user_id = auth.uid()
      )
      -- OR public streams in their org
      OR (privacy = 'public' AND org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
      ))
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON streams TO authenticated;

-- Log success
COMMENT ON TABLE streams IS 'Collaborative workspaces with goal-oriented features (RLS fixed 2025-10-03)';
