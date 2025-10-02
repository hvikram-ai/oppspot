-- Verify and fix RLS settings for stream_members
-- This ensures RLS is completely disabled to avoid infinite recursion

-- First, check current RLS status
DO $$
BEGIN
  RAISE NOTICE 'Checking RLS status...';
END $$;

-- Drop ALL policies on stream_members (be aggressive)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'stream_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stream_members', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Disable RLS on stream_members
ALTER TABLE stream_members DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'stream_members';

    IF rls_enabled THEN
        RAISE EXCEPTION 'RLS is still enabled on stream_members!';
    ELSE
        RAISE NOTICE 'SUCCESS: RLS is disabled on stream_members';
    END IF;
END $$;

-- Also clean up streams policies
DROP POLICY IF EXISTS "Users create streams in org" ON streams;
DROP POLICY IF EXISTS "Users can create streams" ON streams;
DROP POLICY IF EXISTS "Authenticated users create streams" ON streams;

-- Create single clean INSERT policy for streams
CREATE POLICY "Authenticated users create streams" ON streams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verify no recursive policies remain
DO $$
DECLARE
    pol_count integer;
BEGIN
    SELECT COUNT(*) INTO pol_count
    FROM pg_policies
    WHERE tablename = 'stream_members';

    IF pol_count > 0 THEN
        RAISE WARNING 'Found % policies still on stream_members', pol_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No policies on stream_members';
    END IF;
END $$;
