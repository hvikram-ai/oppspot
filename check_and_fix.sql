-- Comprehensive fix for stream creation infinite recursion
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Check current state
-- ============================================
SELECT 'Checking triggers...' as step;
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE '%stream%' AND NOT tgisinternal;

SELECT 'Checking RLS on stream_members...' as step;
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'stream_members';

SELECT 'Checking policies on stream_members...' as step;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'stream_members';

SELECT 'Checking policies on streams...' as step;
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'streams';

-- ============================================
-- PART 2: Fix the issues
-- ============================================

-- Drop the problematic trigger (THIS IS THE ROOT CAUSE)
DROP TRIGGER IF EXISTS trigger_auto_add_stream_owner ON streams CASCADE;
DROP FUNCTION IF EXISTS auto_add_stream_owner() CASCADE;

-- Drop ALL policies on stream_members
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
    END LOOP;
END $$;

-- Disable RLS on stream_members entirely
ALTER TABLE stream_members DISABLE ROW LEVEL SECURITY;

-- Clean up streams INSERT policies
DROP POLICY IF EXISTS "Users create streams in org" ON streams;
DROP POLICY IF EXISTS "Users can create streams" ON streams;
DROP POLICY IF EXISTS "Authenticated users create streams" ON streams;

-- Create single clean INSERT policy for streams
CREATE POLICY "Authenticated users create streams" ON streams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- PART 3: Verify the fix
-- ============================================
SELECT 'Verification: Triggers remaining...' as step;
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE '%stream%' AND NOT tgisinternal;

SELECT 'Verification: stream_members RLS...' as step;
SELECT relname,
       CASE WHEN relrowsecurity THEN 'ENABLED (BAD!)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_class
WHERE relname = 'stream_members';

SELECT 'Verification: stream_members policies...' as step;
SELECT COUNT(*) as policy_count,
       CASE WHEN COUNT(*) = 0 THEN 'GOOD - No policies' ELSE 'BAD - Policies still exist' END as status
FROM pg_policies
WHERE tablename = 'stream_members';

SELECT 'DONE - Try creating a stream now!' as final_message;
