-- ============================================================
-- VERIFICATION SCRIPT - Run this in Supabase SQL Editor
-- ============================================================
-- This will show you the current state of your database
-- and whether the fixes have been applied correctly

-- 1. Check if the problematic trigger still exists
SELECT '1. CHECKING TRIGGER...' as step;
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ GOOD - Trigger is removed'
    ELSE '❌ BAD - Trigger still exists (causing infinite recursion!)'
  END as trigger_status,
  COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname = 'trigger_auto_add_stream_owner';

-- Show any triggers on streams table
SELECT tgname as remaining_stream_triggers
FROM pg_trigger
WHERE tgrelid = 'streams'::regclass AND NOT tgisinternal;

-- 2. Check RLS status on stream_members
SELECT '2. CHECKING RLS STATUS...' as step;
SELECT
  relname as table_name,
  CASE
    WHEN relrowsecurity = false THEN '✅ GOOD - RLS is DISABLED'
    ELSE '❌ BAD - RLS is ENABLED (causing infinite recursion!)'
  END as rls_status,
  relrowsecurity as enabled
FROM pg_class
WHERE relname = 'stream_members';

-- 3. Check policies on stream_members
SELECT '3. CHECKING POLICIES...' as step;
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ GOOD - No policies on stream_members'
    ELSE '❌ BAD - Policies still exist on stream_members'
  END as policy_status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'stream_members';

-- Show any remaining policies
SELECT policyname as remaining_policies
FROM pg_policies
WHERE tablename = 'stream_members';

-- 4. Check INSERT policies on streams table
SELECT '4. CHECKING STREAMS INSERT POLICIES...' as step;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'streams' AND cmd = 'INSERT';

-- ============================================================
-- EXPECTED RESULTS FOR SUCCESS:
-- ============================================================
-- 1. trigger_count should be 0
-- 2. RLS enabled should be 'false'
-- 3. policy_count should be 0
-- 4. Only one INSERT policy on streams: "Authenticated users create streams"
-- ============================================================

-- If any checks fail, run this fix:
-- DROP TRIGGER IF EXISTS trigger_auto_add_stream_owner ON streams CASCADE;
-- DROP FUNCTION IF EXISTS auto_add_stream_owner() CASCADE;
-- DROP POLICY IF EXISTS "Members view stream members" ON stream_members;
-- DROP POLICY IF EXISTS "Owners/editors add members" ON stream_members;
-- ALTER TABLE stream_members DISABLE ROW LEVEL SECURITY;
