-- Fix RLS Infinite Recursion Issue
-- The problem: INSERT policy checks SELECT policy which checks collection_access
-- creating infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can create their own collections" ON collections;

-- Recreate with simpler INSERT policy that doesn't trigger SELECT
CREATE POLICY "Users can create their own collections"
ON collections FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  -- Don't check collection_access here - causes recursion
);

-- Also simplify the SELECT policy to avoid recursion on INSERT
DROP POLICY IF EXISTS "Users can view collections they own or have access to" ON collections;

CREATE POLICY "Users can view collections they own or have access to"
ON collections FOR SELECT
USING (
  user_id = auth.uid()
  OR
  id IN (
    SELECT collection_id
    FROM collection_access
    WHERE user_id = auth.uid()
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed RLS recursion issue';
  RAISE NOTICE '   Collections table policies updated';
END $$;
